import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import type { Activity } from "../lib/types";
import styles from "./ActivityDetail.module.css";

const ZONE_COLORS = ["#4ECDC4", "#96E6B3", "#FFD93D", "#FF9234", "#FF6B6B"];

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: activity, isLoading } = useQuery<Activity>({
    queryKey: ["activity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Activity;
    },
    enabled: !!id,
  });

  const { data: metrics } = useActivityMetrics(id ?? "");

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
        {activity.ai_insight && (
          <section className={styles.insightCard}>
            <div className={styles.insightHeader}>
              <span>🧠</span>
              <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
                Análisis Coach
              </h2>
            </div>
            <p className={styles.insightText}>{activity.ai_insight}</p>
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

        {/* 3. Factor de Intensidad */}
        {metrics && (
          <section className={styles.card}>
            <IntensityMetrics metrics={metrics} />
          </section>
        )}

        {/* 4. Info de la actividad */}
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
          {activity.average_speed > 0 && activity.type !== "WeightTraining" && (
            <MetricBlock
              label="Ritmo"
              value={speedToPace(activity.average_speed)}
              icon={<Zap size={18} />}
              color="#FFD93D"
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
              label="TSS"
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

        {/* Splits (part of info) */}
        {activity.splits_data && activity.splits_data.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Splits por km</h2>
            <div className={styles.splitsCard}>
              <div className={styles.splitHeader}>
                <span className={styles.splitHeaderText}>KM</span>
                <span className={styles.splitHeaderText}>Distancia</span>
                <span className={styles.splitHeaderText}>Tiempo</span>
                <span className={styles.splitHeaderText}>Ritmo</span>
              </div>
              {activity.splits_data.map((split, i) => (
                <div
                  key={i}
                  className={`${styles.splitRow} ${i % 2 === 0 ? styles.splitRowAlt : ""}`}
                >
                  <span className={styles.splitNum}>{split.split}</span>
                  <span className={styles.splitText}>
                    {formatDistance(split.distance)}
                  </span>
                  <span className={styles.splitText}>
                    {formatDuration(split.moving_time)}
                  </span>
                  <span
                    className={styles.splitPace}
                    style={{ color: "#FF6B35" }}
                  >
                    {speedToPace(split.average_speed)}
                  </span>
                </div>
              ))}
            </div>
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

function IntensityMetrics({ metrics }: { metrics: any }) {
  if (!metrics) return null;

  return (
    <div className={styles.intensityCard}>
      <div className={styles.trimpHeader}>
        <div style={{ flex: 1 }}>
          <span className={styles.intensityLabel}>
            FACTOR DE INTENSIDAD (IF)
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span className={styles.intensityValue}>
              {metrics.intensity_factor?.toFixed(2) ?? "0.00"}
            </span>
            <span className={styles.intensityLabel}>relativo al umbral</span>
          </div>
        </div>
        <Zap size={32} color="#FFD93D" />
      </div>

      <div className={styles.performanceRow}>
        <div className={styles.performanceItem}>
          <span className={styles.perfValue}>
            {metrics.trimp_score?.toFixed(0) ?? 0}
          </span>
          <span className={styles.perfLabel}>TRIMP (Carga)</span>
        </div>
        <div className={styles.perfDivider} />
        <div className={styles.performanceItem}>
          <span className={styles.perfValue}>
            {metrics.aerobic_efficiency?.toFixed(2) ?? "0.00"}
          </span>
          <span className={styles.perfLabel}>EF (Eficiencia)</span>
        </div>
      </div>
    </div>
  );
}
