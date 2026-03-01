import { useState, useEffect } from "react";
import { Brain, X } from "lucide-react";
import { aiCoachService } from "../lib/services/aiCoach";
import { useAuthStore } from "../store/authStore";
import { useDailyLoadProfile } from "../lib/hooks/useMetrics";
import { supabase } from "../lib/supabase";
import styles from "./DailyCoachToast.module.css";

export default function DailyCoachToast() {
  const { user, profile } = useAuthStore();
  const [insight, setInsight] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // We only run this hook on the current user data
  const { data: loadProfile } = useDailyLoadProfile(user?.id, 14);

  useEffect(() => {
    async function checkAndFetchInsight() {
      if (!user || !profile || !loadProfile || loadProfile.length === 0) return;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const lastToastDate = localStorage.getItem("forma_last_coach_toast");

      // Si ya mostramos el toast hoy, no hacemos nada
      if (lastToastDate === todayStr) return;

      try {
        // 1. Buscar si hay un evento mañana
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

        const { data: upcomingEvents } = await supabase
          .from("events")
          .select("*")
          .eq("user_id", user.id)
          .eq("event_date", tomorrowStr)
          .is("linked_activity_id", null);

        const eventTomorrow = upcomingEvents?.[0];
        const latestLoad = loadProfile[loadProfile.length - 1];

        // 2. Buscar actividades recientes para contexto general
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: recentActivities } = await supabase
          .from("activities")
          .select("*")
          .eq("user_id", user.id)
          .gte("start_date", sevenDaysAgo.toISOString())
          .order("start_date", { ascending: false });

        let result;
        let isSpecialEvent = false;

        if (eventTomorrow) {
          // Generar Briefing de víspera de evento
          isSpecialEvent = true;
          // Necesitamos calcular readiness para el prompt
          // Nota: Reutilizamos la lógica de cálculo
          const { calculateReadinessScore } =
            await import("../lib/domain/metrics/events");
          const readiness = calculateReadinessScore(
            latestLoad.ctl,
            (recentActivities as any) || [], // Usamos recientes para este cálculo rápido
            eventTomorrow.activity_type,
            eventTomorrow.target_distance,
          );

          const insightText = await aiCoachService.generateEventEveInsight({
            event: {
              name: eventTomorrow.name,
              target_distance: eventTomorrow.target_distance,
              activity_type: eventTomorrow.activity_type,
              target_elevation_gain: eventTomorrow.target_elevation_gain,
            },
            readiness,
            loadProfile: {
              ctl: latestLoad.ctl,
              atl: latestLoad.atl,
              tsb: latestLoad.tsb,
            },
            userName: profile.full_name?.split(" ")[0] || "Atleta",
          });
          result = { insight: insightText };
        } else {
          // Generar Insight diario normal
          result = await aiCoachService.generateDailyInsight({
            loadProfile: {
              ctl: latestLoad.ctl,
              atl: latestLoad.atl,
              tsb: latestLoad.tsb,
            },
            recentActivities: recentActivities || [],
            profile: { weight_kg: profile.weight_kg, lthr: profile.lthr },
            userName: profile.full_name?.split(" ")[0] || "Atleta",
          });
        }

        setInsight(result.insight);
        setIsVisible(true);
        localStorage.setItem("forma_last_coach_toast", todayStr);
        if (isSpecialEvent) {
          localStorage.setItem("forma_is_event_toast", "true");
        } else {
          localStorage.removeItem("forma_is_event_toast");
        }
      } catch (err) {
        console.error("Failed to generate daily insight toast:", err);
      }
    }

    checkAndFetchInsight();
  }, [user, profile, loadProfile]);

  if (!isVisible || !insight) return null;

  const isEventToast = localStorage.getItem("forma_is_event_toast") === "true";

  return (
    <div className={styles.toastContainer}>
      <div
        className={`${styles.toastContent} ${isEventToast ? styles.eventToast : ""}`}
      >
        <div className={styles.header}>
          <Brain
            size={20}
            className={`${styles.icon} ${isEventToast ? styles.eventIcon : ""}`}
          />
          <span className={styles.title}>
            {isEventToast ? "Briefing de Víspera" : "Insight del día"}
          </span>
          <button
            className={styles.closeBtn}
            onClick={() => setIsVisible(false)}
          >
            <X size={16} />
          </button>
        </div>
        <p className={styles.message}>{insight}</p>
      </div>
    </div>
  );
}
