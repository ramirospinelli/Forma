import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Zap,
  Heart,
  TrendingUp,
  Mountain,
  Trophy,
  ThumbsUp,
  Flame,
  Activity as ActivityIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { useActivityMetrics } from "../lib/hooks/useMetrics";
import {
  formatDistance,
  formatDuration,
  speedToPace,
  formatDate,
} from "../lib/utils";
import HeartRateChart from "../components/analytics/HeartRateChart";
import ActivityMap from "../components/ActivityMap";
import DriftIndicator from "../components/analytics/DriftIndicator";
import {
  getValidStravaToken,
  fetchActivityStreams,
} from "../lib/services/strava-api";
import { aiCoachService } from "../lib/services/aiCoach";
import type { Activity } from "../lib/types";
import styles from "./ActivityDetail.module.css";

const ZONE_COLORS = ["#4ECDC4", "#96E6B3", "#FFD93D", "#FF9234", "#FF6B6B"];

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const { data: activity, isLoading } = useQuery<Activity>({
    queryKey: ["activity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;

      const act = data as Activity;

      // Auto-generate AI insight if missing
      if (!act.ai_insight && user?.id) {
        setIsGeneratingInsight(true);
        try {
          // We don't block the render for this, we do it asynchronously
          aiCoachService
            .analyzeActivity(
              act,
              profile!,
              profile?.full_name?.split(" ")[0] || "Atleta",
            )
            .then(async (insight: string) => {
              if (insight) {
                await supabase
                  .from("activities")
                  .update({ ai_insight: insight })
                  .eq("id", act.id);
                // Also update the React Query cache so it shows up immediately
                queryClient.setQueryData(
                  ["activity", id],
                  (old: Activity | undefined) => {
                    if (!old) return old;
                    return { ...old, ai_insight: insight };
                  },
                );
              }
            })
            .catch((err: any) =>
              console.error("Auto AI generation failed:", err),
            )
            .finally(() => setIsGeneratingInsight(false));
        } catch (e) {
          console.error(e);
          setIsGeneratingInsight(false);
        }
      }

      return act;
    },
    enabled: !!id && !!profile,
  });

  const { data: metrics } = useActivityMetrics(id ?? "");

  // Fetch HR + velocity streams for drift analysis
  // Only enabled for activities with HR data that are long enough (>20 min)
  const canAnalyzeDrift =
    !!activity?.average_heartrate && (activity?.moving_time ?? 0) > 1200;

  const { data: streamData, isLoading: streamLoading } = useQuery<{
    hrStream: number[];
    velocityStream: number[];
  } | null>({
    queryKey: ["activity_streams", activity?.strava_id],
    queryFn: async () => {
      if (!user?.id || !activity?.strava_id) return null;
      const token = await getValidStravaToken(user.id);
      if (!token) {
        console.warn("[Drift] No Strava token available");
        return null;
      }

      const streams = await fetchActivityStreams(token, activity.strava_id, [
        "heartrate",
        "velocity_smooth",
      ]);

      console.log("[Drift] raw streams:", streams);

      const hrStream = Array.isArray(streams)
        ? (streams.find((s: any) => s.type === "heartrate")?.data ?? [])
        : [];
      const velocityStream = Array.isArray(streams)
        ? (streams.find((s: any) => s.type === "velocity_smooth")?.data ?? [])
        : [];

      console.log(
        `[Drift] hrStream.length=${hrStream.length}, velocityStream.length=${velocityStream.length}`,
      );

      return { hrStream, velocityStream };
    },
    enabled: canAnalyzeDrift,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  if (isLoading || !activity) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const hrZones: number[] = metrics?.hr_zones_time ?? [];
  const totalZoneTime = hrZones.reduce((s, t) => s + t, 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.headerTitle}>{activity.name}</span>
          <span className={styles.headerSubtitle}>
            {formatDate(activity.start_date_local)}
          </span>
        </div>
      </header>

      <div className={styles.content}>
        {/* 1. Análisis Coach */}
        {(activity.ai_insight || isGeneratingInsight) && (
          <section className={styles.insightCard}>
            <div className={styles.insightHeader}>
              <span>🧠</span>
              <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
                Análisis Coach
              </h2>
            </div>
            {isGeneratingInsight ? (
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  className={styles.spinner}
                  style={{ width: 16, height: 16, borderWidth: 2 }}
                />
                <p className={styles.insightText} style={{ opacity: 0.7 }}>
                  El coach está analizando tu entrenamiento...
                </p>
              </div>
            ) : (
              <p className={styles.insightText}>{activity.ai_insight}</p>
            )}
          </section>
        )}

        {/* 2. Mapa (New Position) */}
        {activity.summary_polyline && (
          <ActivityMap
            mapObj={{ summary_polyline: activity.summary_polyline }}
          />
        )}

        {/* 3. Frecuencia Cardíaca con Distribución por Zonas */}
        {activity.average_heartrate && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Frecuencia Cardíaca</h2>
            <HeartRateChart activity={activity} metrics={metrics} />

            {hrZones.length > 0 && totalZoneTime > 0 && (
              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <div className={styles.zoneBar}>
                  {hrZones.map((t, i) => {
                    const pct = (t / totalZoneTime) * 100;
                    if (pct < 1) return null;
                    return (
                      <div
                        key={i}
                        className={styles.zoneSeg}
                        style={{ width: `${pct}%`, background: ZONE_COLORS[i] }}
                      />
                    );
                  })}
                </div>
                <div className={styles.zoneLegend}>
                  {["Z1", "Z2", "Z3", "Z4", "Z5"].map((z, i) =>
                    hrZones[i] > 0 ? (
                      <div key={i} className={styles.zoneItem}>
                        <div
                          className={styles.zoneDot}
                          style={{ background: ZONE_COLORS[i] }}
                        />
                        <span className={styles.zoneLabel}>
                          {z}: {formatDuration(hrZones[i])}
                        </span>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Resumen General Card */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Resumen de la Actividad</h2>

          <div className={styles.metricsGrid}>
            {activity.distance > 0 && (
              <MetricBlock
                label="Distancia"
                value={formatDistance(activity.distance)}
                icon={<MapPin size={18} />}
                color="#FF6B35"
              />
            )}
            <MetricBlock
              label="Duración"
              value={formatDuration(activity.moving_time)}
              icon={<Clock size={18} />}
              color="#4ECDC4"
            />
            {activity.calories != null && activity.calories > 0 && (
              <MetricBlock
                label="Calorías"
                value={`${Math.round(activity.calories)} kcal`}
                icon={<Flame size={18} />}
                color="#FF6B35"
              />
            )}
            {activity.average_speed > 0 &&
              activity.type !== "WeightTraining" && (
                <MetricBlock
                  label="Ritmo"
                  value={speedToPace(activity.average_speed)}
                  icon={<Zap size={18} />}
                  color="#FFD93D"
                />
              )}
            {activity.average_cadence != null &&
              activity.average_cadence > 0 && (
                <MetricBlock
                  label="Cadencia"
                  value={`${Math.round(activity.average_cadence)} rpm`}
                  icon={<ActivityIcon size={18} />}
                  color="#8A2BE2"
                />
              )}
            {activity.average_heartrate && (
              <MetricBlock
                label="FC Media"
                value={`${Math.round(activity.average_heartrate)} bpm`}
                icon={<Heart size={18} />}
                color="#FF6B6B"
              />
            )}
            {activity.total_elevation_gain > 0 && (
              <MetricBlock
                label="Elevación"
                value={`${Math.round(activity.total_elevation_gain)} m`}
                icon={<Mountain size={18} />}
                color="#96E6B3"
              />
            )}
            {metrics?.tss != null && (
              <MetricBlock
                label="Carga"
                value={String(Math.round(metrics.tss))}
                icon={<TrendingUp size={18} />}
                color="#C77DFF"
              />
            )}
            {activity.max_heartrate && (
              <MetricBlock
                label="FC máxima"
                value={`${Math.round(activity.max_heartrate)} bpm`}
                icon={<Heart size={18} />}
                color="#FF6B6B"
              />
            )}
            {activity.elapsed_time && (
              <MetricBlock
                label="Tiempo total"
                value={formatDuration(activity.elapsed_time)}
                icon={<Clock size={18} />}
                color="#A0A0B0"
              />
            )}
            {(activity.pr_count ?? 0) > 0 && (
              <MetricBlock
                label="Records"
                value={`${activity.pr_count} PR${(activity.pr_count ?? 0) > 1 ? "s" : ""}`}
                icon={<Trophy size={18} />}
                color="#FFD93D"
              />
            )}
            {(activity.kudos_count ?? 0) > 0 && (
              <MetricBlock
                label="Kudos"
                value={`${activity.kudos_count} 👏`}
                icon={<ThumbsUp size={18} />}
                color="#4ECDC4"
              />
            )}
          </div>
        </section>

        {/* Splits (visual bars) */}
        {activity.splits_data && activity.splits_data.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Splits por km</h2>
            <SplitsChart splits={activity.splits_data} />
          </section>
        )}

        {/* Cardiac Drift — only renders if HR stream is available */}
        {canAnalyzeDrift &&
          (streamLoading ||
            (streamData && (streamData.hrStream?.length ?? 0) >= 60)) && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Análisis de Drift</h2>
              {streamLoading ? (
                <p
                  style={{ color: "var(--color-text-muted)", fontSize: "13px" }}
                >
                  Cargando stream de FC...
                </p>
              ) : (
                <DriftIndicator
                  hrStream={streamData!.hrStream}
                  velocityStream={streamData!.velocityStream}
                />
              )}
            </section>
          )}
      </div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={styles.metricBlock}>
      <div className={styles.metricIcon} style={{ background: `${color}20` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  );
}

// ─── Splits Visual Chart ──────────────────────────────────────────────────────

function SplitsChart({
  splits,
}: {
  splits: NonNullable<Activity["splits_data"]>;
}) {
  // Convert speed → pace (s/km), lower = faster
  const paces = splits.map((s) =>
    s.average_speed > 0 ? 1000 / s.average_speed : 0,
  );
  const validPaces = paces.filter((p) => p > 0);
  if (validPaces.length === 0) return null;

  const avgPace = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;
  const maxPace = Math.max(...validPaces); // slowest (longest bar)
  const minPace = Math.min(...validPaces); // fastest

  const formatPace = (secPerKm: number) => {
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getColor = (pace: number) => {
    const diff = (pace - avgPace) / avgPace;
    if (diff < -0.03) return "#4ECDC4"; // faster than avg → teal/green
    if (diff > 0.03) return "#FF6B6B"; // slower than avg → red
    return "#FFD93D"; // within ±3% → yellow
  };

  const getBarWidth = (pace: number) => {
    // Slowest pace = 100% bar, fastest = proportionally shorter
    const range = maxPace - minPace || 1;
    return 30 + ((pace - minPace) / range) * 70; // 30%–100%
  };

  return (
    <div className={styles.splitsCard}>
      <div className={styles.splitSummaryRow}>
        <span className={styles.splitSummaryLabel}>KM</span>
        <span className={styles.splitSummaryLabel}>Ritmo</span>
        <span className={styles.splitSummaryLabel}>vs media</span>
      </div>
      {splits.map((split, i) => {
        const pace = paces[i];
        if (pace === 0) return null;
        const color = getColor(pace);
        const barW = getBarWidth(pace);
        const deltaSec = Math.round(pace - avgPace);
        const deltaStr =
          deltaSec === 0
            ? "—"
            : deltaSec > 0
              ? `+${deltaSec}"`
              : `${deltaSec}"`;

        return (
          <div key={i} className={styles.splitRow}>
            <span className={styles.splitNum}>{split.split}</span>
            <div className={styles.splitBarTrack}>
              <div
                className={styles.splitBarFill}
                style={{ width: `${barW}%`, background: color }}
              />
            </div>
            <span className={styles.splitPace}>{formatPace(pace)}/km</span>
            <span className={styles.splitDelta} style={{ color }}>
              {deltaStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}
