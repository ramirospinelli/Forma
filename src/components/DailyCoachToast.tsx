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

      const todayStr = new Date().toISOString().split("T")[0];
      const lastToastDate = localStorage.getItem("forma_last_coach_toast");

      // Si ya mostramos el toast hoy, no hacemos nada
      if (lastToastDate === todayStr) return;

      try {
        // Buscar actividades recientes (últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: recentActivities } = await supabase
          .from("activities")
          .select("name, type, distance, start_date, moving_time")
          .eq("user_id", user.id)
          .gte("start_date", sevenDaysAgo.toISOString())
          .order("start_date", { ascending: false });

        const latestLoad = loadProfile[loadProfile.length - 1];

        // Usamos el insight diario
        const result = await aiCoachService.generateDailyInsight({
          loadProfile: {
            ctl: latestLoad.ctl,
            atl: latestLoad.atl,
            tsb: latestLoad.tsb,
          },
          recentActivities: recentActivities || [],
          profile: { weight_kg: profile.weight_kg, lthr: profile.lthr },
          userName: profile.full_name?.split(" ")[0] || "Atleta",
        });

        setInsight(result.insight);
        setIsVisible(true);
        localStorage.setItem("forma_last_coach_toast", todayStr);
      } catch (err) {
        console.error("Failed to generate daily insight toast:", err);
      }
    }

    checkAndFetchInsight();
  }, [user, profile, loadProfile]);

  if (!isVisible || !insight) return null;

  return (
    <div className={styles.toastContainer}>
      <div className={styles.toastContent}>
        <div className={styles.header}>
          <Brain size={20} className={styles.icon} />
          <span className={styles.title}>Insight del día</span>
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
