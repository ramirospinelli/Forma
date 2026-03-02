import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Brain, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import {
  useDailyLoadProfile,
  useUserThresholds,
} from "../lib/hooks/useMetrics";
import { aiCoachService } from "../lib/services/aiCoach";
import { plannedWorkoutService } from "../lib/services/plannedWorkouts";
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
  const { user, profile, fetchProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: loadProfile } = useDailyLoadProfile(user?.id, 14);
  const { data: thresholds } = useUserThresholds(user?.id);

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
        profile: profile,
        userName: profile.full_name?.split(" ")[0] || "Atleta",
        thresholds: thresholds,
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

  const togglePlannerMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("profiles")
        .update({ cochia_planner_enabled: enabled })
        .eq("id", user!.id);

      if (error) throw error;
      fetchProfile(user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Preferencia actualizada");
    },
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessageMutation.mutate(inputText);
    setInputText("");
  };

  const handleCoachAction = async (actionData: any) => {
    if (!user) return;
    const { action, data } = actionData;

    try {
      if (action === "upsert_plan") {
        const workoutsToInsert = data.map((w: any) => ({
          ...w,
          user_id: user.id,
          status: "planned",
        }));

        const promise = plannedWorkoutService.createWorkouts(workoutsToInsert);
        toast.promise(promise, {
          loading: "Aplicando plan...",
          success: "¡Plan aplicado!",
          error: "Error al aplicar el plan.",
        });
        await promise;
      } else if (action === "delete_workouts") {
        const inputData = Array.isArray(data) ? data : [];
        const isDatePattern = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);

        const dates = inputData.filter(
          (val) => typeof val === "string" && isDatePattern(val),
        );
        const ids = inputData.filter(
          (val) => typeof val === "string" && !isDatePattern(val),
        );

        const promise = plannedWorkoutService.deleteWorkouts({
          ids,
          dates,
          userId: user.id,
        });
        toast.promise(promise, {
          loading: "Borrando...",
          success: "Entrenamientos borrados.",
          error: "Error al borrar.",
        });
        await promise;
      }

      queryClient.invalidateQueries({
        queryKey: ["planned_workouts", user.id],
      });
    } catch (e) {
      console.error("Coach Action error:", e);
    }
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
        {profile?.gemini_api_key && (
          <div className={styles.plannerBanner}>
            <div className={styles.plannerInfo}>
              <Brain
                size={20}
                color={
                  profile?.cochia_planner_enabled
                    ? "var(--color-primary)"
                    : "var(--color-text-dim)"
                }
              />
              <div className={styles.plannerText}>
                <h4 className={styles.plannerTitle}>Modo Planificador</h4>
                <p className={styles.plannerDesc}>
                  {profile?.cochia_planner_enabled
                    ? "Cochia está analizando tu carga y sugiriendo entrenamientos en tu calendario."
                    : "El modo automático está desactivado. Cochia solo responderá tus dudas aquí."}
                </p>
              </div>
            </div>
            <button
              className={`${styles.toggleSwitch} ${profile?.cochia_planner_enabled ? styles.toggleOn : ""}`}
              onClick={() =>
                togglePlannerMutation.mutate(!profile?.cochia_planner_enabled)
              }
            >
              <div className={styles.toggleKnob} />
            </button>
          </div>
        )}

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
            messages.map((msg) => {
              const hasJson =
                msg.role === "model" && msg.content.includes("```json");
              let displayContent = msg.content;
              let coachAction: any = null;

              if (hasJson) {
                try {
                  const match = msg.content.match(/```json\n([\s\S]*?)\n```/);
                  if (match) {
                    const parsed = JSON.parse(match[1]);
                    // Auto-wrap old format into new format for backward compatibility
                    if (Array.isArray(parsed)) {
                      coachAction = { action: "upsert_plan", data: parsed };
                    } else {
                      coachAction = parsed;
                    }
                    displayContent = msg.content
                      .replace(/```json[\s\S]*?```/, "")
                      .trim();
                  }
                } catch (e) {
                  console.error("Failed to parse action from coach", e);
                }
              }

              return (
                <div
                  key={msg.id}
                  className={`${styles.messageRow} ${
                    msg.role === "user" ? styles.userRow : styles.modelRow
                  }`}
                >
                  <div
                    className={`${styles.messageBubble} ${
                      msg.role === "user"
                        ? styles.userBubble
                        : styles.modelBubble
                    }`}
                  >
                    <div className={styles.messageContent}>
                      {displayContent.split("\n").map((line, i) => (
                        <span key={i}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </div>

                    {coachAction && (
                      <div className={styles.planActionBox}>
                        <div className={styles.planSummary}>
                          <Brain size={16} />
                          <span>
                            {coachAction.action === "upsert_plan"
                              ? `Plan de ${coachAction.data.length} entrenamientos`
                              : `Borrar ${coachAction.data.length} entrenamientos`}
                          </span>
                        </div>
                        <button
                          className={styles.applyPlanBtn}
                          onClick={() => handleCoachAction(coachAction)}
                        >
                          {coachAction.action === "upsert_plan"
                            ? "Aplicar a mi Calendario"
                            : "Confirmar Borrado"}
                        </button>
                      </div>
                    )}

                    <span className={styles.messageTime}>
                      {formatMessageTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
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
