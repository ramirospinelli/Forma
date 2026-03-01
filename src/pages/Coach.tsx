import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Brain, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { useDailyLoadProfile } from "../lib/hooks/useMetrics";
import { aiCoachService } from "../lib/services/aiCoach";
import Header from "../components/Header";
import type { CoachChat, Activity } from "../lib/types";
import styles from "./Coach.module.css";

function formatMessageTime(dateString?: string) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(dateString));
}

export default function Coach() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: loadProfile } = useDailyLoadProfile(user?.id, 14);

  // Fetch recent activities (last 30 days) for context
  const { data: recentActivities = [] } = useQuery({
    queryKey: ["recent_activities_coach_context", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as Activity[];
    },
    enabled: !!user,
  });

  // Fetch Chat History
  const { data: messages = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["coach_chats", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("coach_chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CoachChat[];
    },
    enabled: !!user,
  });

  // Fetch upcoming events for context
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcoming_events_coach_context", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !profile || !loadProfile) throw new Error("Missing data");

      // 1. Optimistic insert of User message
      const userMsg = {
        user_id: user.id,
        role: "user",
        content: text,
      };
      await supabase.from("coach_chats").insert(userMsg);

      // Invalidate to show user message immediately while coach thinks
      await queryClient.invalidateQueries({
        queryKey: ["coach_chats", user.id],
      });

      const latestLoad = loadProfile[loadProfile.length - 1] || {
        ctl: 0,
        atl: 0,
        tsb: 0,
      };

      // Get AI response
      const aiResponseText = await aiCoachService.chatWithCoach({
        message: text,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
        loadProfile: latestLoad,
        recentActivities: recentActivities,
        upcomingEvents: upcomingEvents as any[],
        profile: profile, // Now includes gemini_api_key in the type from previous edit
        userName: profile.full_name?.split(" ")[0] || "Atleta",
      });

      // 2. Insert Model message
      const modelMsg = {
        user_id: user.id,
        role: "model",
        content: aiResponseText,
      };
      await supabase.from("coach_chats").insert(modelMsg);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach_chats", user?.id] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Error al enviar mensaje. Revisa tu conexión.");
    },
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessageMutation.mutate(inputText);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.page}>
      <Header title="Coach IA" />

      <div className={styles.chatContainer}>
        {!profile?.gemini_api_key && (
          <div className={styles.blockingOverlay}>
            <Lock size={48} color="var(--color-primary)" />
            <h2 className={styles.blockingTitle}>IA Desactivada</h2>
            <p className={styles.blockingText}>
              Para usar tu Coach personal necesitas configurar tu propia Gemini
              API Key en tu perfil. Esto te permite tener un coach ilimitado y
              privado.
            </p>
            <button
              className={styles.goToProfileBtn}
              onClick={() => navigate("/profile")}
            >
              Configurar en Mi Perfil
            </button>
          </div>
        )}

        <div className={styles.messageList}>
          {isLoadingHistory ? (
            <div className={styles.introBox}>Cargando historial...</div>
          ) : messages.length === 0 ? (
            <div className={styles.introBox}>
              <Brain
                size={48}
                color="var(--color-primary)"
                style={{ marginBottom: 16 }}
              />
              <h2 className={styles.introTitle}>¡Hola! Soy tu Coach</h2>
              <p className={styles.introSubtitle}>
                Analizo tus entrenamientos y carga de las últimas semanas. ¿En
                qué te puedo ayudar hoy?
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${
                  msg.role === "user" ? styles.userRow : styles.modelRow
                }`}
              >
                <div
                  className={`${styles.messageBubble} ${
                    msg.role === "user" ? styles.userBubble : styles.modelBubble
                  }`}
                >
                  <div className={styles.messageContent}>
                    {/* Basic text rendering. Could use react-markdown if needed later */}
                    {msg.content.split("\n").map((line, i) => (
                      <span key={i}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </div>
                  <span className={styles.messageTime}>
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}

          {sendMessageMutation.isPending && (
            <div className={`${styles.messageRow} ${styles.modelRow}`}>
              <div className={styles.loadingBubble}>
                <div className={styles.dot} />
                <div className={styles.dot} />
                <div className={styles.dot} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputWrapper}>
            <textarea
              className={styles.textarea}
              placeholder="Preguntá lo que necesites..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
