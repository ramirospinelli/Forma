import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Brain } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { useDailyLoadProfile } from "../lib/hooks/useMetrics";
import { aiCoachService, type CoachResponse } from "../lib/services/aiCoach";
import { formatDistance, formatDuration } from "../lib/utils";
import Header from "../components/Header";
import styles from "./Coach.module.css";

export default function Coach() {
  const { user, profile } = useAuthStore();
  const [insight, setInsight] = useState<CoachResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: loadProfile } = useDailyLoadProfile(user?.id, 14);
  const {
    data: recentActivities,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["recent_activities_coach", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("activities")
        .select("name, type, distance, start_date, moving_time")
        .eq("user_id", user!.id)
        .gte("start_date", sevenDaysAgo.toISOString())
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleAnalyze = async () => {
    if (!profile || !loadProfile || !recentActivities) {
      toast.error("Faltan datos para el análisis");
      return;
    }
    setIsAnalyzing(true);
    try {
      const latest = loadProfile[loadProfile.length - 1];
      const result = await aiCoachService.generateDailyInsight({
        loadProfile: { ctl: latest.ctl, atl: latest.atl, tsb: latest.tsb },
        recentActivities,
        profile: {
          weight_kg: profile.weight_kg,
          lthr: profile.lthr,
          strava_id: profile.strava_id,
        },
      });
      setInsight(result);
    } catch {
      toast.error("Error al generar el análisis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const latest =
    loadProfile && loadProfile.length > 0
      ? loadProfile[loadProfile.length - 1]
      : null;

  return (
    <div className={styles.page}>
      <Header
        title="Coach IA"
        rightElement={
          <button
            className={styles.refreshBtn}
            onClick={() => refetch()}
            title="Actualizar"
          >
            <RefreshCw size={18} />
          </button>
        }
      />

      <div className={styles.content}>
        {/* Load metrics inline summary */}
        {latest && (
          <div className={styles.metricsRow}>
            {[
              {
                label: "Fitness",
                value: Math.round(latest.ctl),
                color: "var(--color-primary)",
              },
              {
                label: "Fatiga",
                value: Math.round(latest.atl),
                color: "var(--color-danger)",
              },
              {
                label: "Forma",
                value: Math.round(latest.tsb),
                color:
                  latest.tsb >= 0
                    ? "var(--color-success)"
                    : "var(--color-warning)",
              },
            ].map((m) => (
              <div key={m.label} className={styles.metricBadge}>
                <span className={styles.metricValue} style={{ color: m.color }}>
                  {m.value}
                </span>
                <span className={styles.metricLabel}>{m.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent activities overview */}
        {recentActivities && recentActivities.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Última semana</h2>
            <div className={styles.activityList}>
              {recentActivities.map((a: any, i: number) => (
                <div key={i} className={styles.actItem}>
                  <span className={styles.actName}>{a.name}</span>
                  <span className={styles.actMeta}>
                    {formatDistance(a.distance)} ·{" "}
                    {formatDuration(a.moving_time)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Analysis call to action */}
        <button
          className={styles.analyzeBtn}
          onClick={handleAnalyze}
          disabled={isAnalyzing || !recentActivities}
        >
          {isAnalyzing ? (
            <>
              <span className={styles.spinner} /> Analizando tu estado...
            </>
          ) : (
            <>
              <Brain size={20} /> Analizar mi entrenamiento
            </>
          )}
        </button>

        {/* Insight output matching the original format generated with this interface */}
        {insight && (
          <section className={styles.insightCard}>
            <div className={styles.insightHeader}>
              <span className={styles.insightEmoji}>🧠</span>
              <h2 className={styles.insightTitle}>Análisis del Coach</h2>
            </div>
            <p className={styles.insightText}>{insight.insight}</p>
            {insight.recommendations && insight.recommendations.length > 0 && (
              <div className={styles.recommendations}>
                <h3 className={styles.recTitle}>Recomendaciones Clave</h3>
                {insight.recommendations.map((r: string, i: number) => (
                  <div key={i} className={styles.recItem}>
                    <span className={styles.recDot}>•</span>
                    <span className={styles.recText}>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
