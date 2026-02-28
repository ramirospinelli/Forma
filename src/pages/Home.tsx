import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ChevronRight, Flame, Calendar, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { syncRecentActivities } from "../lib/strava";
import { useAuthStore } from "../store/authStore";
import { useDailyLoadProfile } from "../lib/hooks/useMetrics";
import {
  formatDistance,
  formatDuration,
  getActivityEmoji,
  formatRelativeDate,
  calculateStreak,
  percentChange,
  getWeekStart,
  calculateTrainingLoad,
} from "../lib/utils";
import Header from "../components/Header";
import HealthShield from "../components/analytics/HealthShield";
import PeakForecast from "../components/analytics/PeakForecast";
import type { Activity } from "../lib/types";
import styles from "./Home.module.css";

function getStatusFromTsb(tsb: number): string {
  if (tsb > 5) return "Fresco (Taper)";
  if (tsb >= -10) return "Transición";
  if (tsb >= -30) return "Óptimo (Sweet Spot)";
  return "Sobrecarga";
}

function StatCard({
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
    <div className={styles.statCard}>
      <div
        className={styles.statIconBg}
        style={{ backgroundColor: `${color}15` }}
      >
        {icon}
      </div>
      <div className={styles.statCardContent}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: loadProfile } = useDailyLoadProfile(user?.id, 14);

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("No profile");
      return syncRecentActivities(user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Actividades sincronizadas");
    },
    onError: () => toast.error("Error al sincronizar"),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["activities"] });
    setRefreshing(false);
  };

  const now = new Date();
  const weekStart = getWeekStart(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeekActivities = activities.filter(
    (a) => new Date(a.start_date) >= weekStart,
  );
  const lastWeekActivities = activities.filter((a) => {
    const d = new Date(a.start_date);
    return d >= lastWeekStart && d < weekStart;
  });

  const thisWeek = {
    distance: thisWeekActivities.reduce((s, a) => s + (a.distance || 0), 0),
    time: thisWeekActivities.reduce((s, a) => s + (a.moving_time || 0), 0),
    elevation: thisWeekActivities.reduce(
      (s, a) => s + (a.total_elevation_gain || 0),
      0,
    ),
    count: thisWeekActivities.length,
  };

  const lastWeek = {
    distance: lastWeekActivities.reduce((s, a) => s + (a.distance || 0), 0),
    time: lastWeekActivities.reduce((s, a) => s + (a.moving_time || 0), 0),
    count: lastWeekActivities.length,
  };

  const streak = calculateStreak(activities);
  const recentActivities = activities.slice(0, 5);

  const currentYear = new Date().getFullYear();
  const yearActivities = activities.filter(
    (a) => new Date(a.start_date).getFullYear() === currentYear,
  );

  const trainingLoad =
    activities.length > 0 ? calculateTrainingLoad(activities) : null;
  const latest =
    loadProfile && loadProfile.length > 0
      ? loadProfile[loadProfile.length - 1]
      : null;

  const displayLoad = {
    fitness: latest ? Math.round(latest.ctl) : (trainingLoad?.fitness ?? 0),
    fatigue: latest ? Math.round(latest.atl) : (trainingLoad?.fatigue ?? 0),
    form: latest ? Math.round(latest.tsb) : (trainingLoad?.form ?? 0),
    status: latest
      ? getStatusFromTsb(latest.tsb)
      : getStatusFromTsb(trainingLoad?.form ?? 0),
  };

  const firstName = profile?.full_name?.split(" ")[0] ?? "Atleta";

  return (
    <div className={styles.page}>
      <Header
        title={`Hola, ${firstName} 👋`}
        rightElement={
          <button
            className={styles.syncBtn}
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title="Sincronizar"
          >
            <RefreshCw
              size={18}
              color="var(--color-primary)"
              className={syncMutation.isPending ? styles.spinning : ""}
            />
          </button>
        }
      />

      <div className={styles.scrollContent}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Analizando tu rendimiento...</p>
          </div>
        ) : (
          <>
            {/* Health Shield Section at top */}
            {profile?.id && (
              <div className={styles.section}>
                <div className={styles.cardSpacing}>
                  <HealthShield data={loadProfile || []} />
                </div>
              </div>
            )}

            {/* Training Load (PMC) Hero */}
            <div className={styles.section}>
              <div className={styles.pmcHero}>
                <div className={styles.pmcHeader}>
                  <div>
                    <span className={styles.pmcLabel}>ESTADO DE FORMA</span>
                    <h2 className={styles.pmcStatus}>{displayLoad.status}</h2>
                  </div>
                  {streak > 0 && (
                    <div className={styles.streakBadge}>
                      <Flame size={14} color="white" />
                      <span className={styles.streakText}>
                        {streak} DÍAS SEGUIDOS
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.pmcGrid}>
                  <div className={styles.pmcItem}>
                    <span
                      className={styles.pmcValue}
                      style={{ color: "var(--color-primary)" }}
                    >
                      {displayLoad.fitness}
                    </span>
                    <span className={styles.pmcItemLabel}>FITNESS</span>
                  </div>
                  <div className={styles.pmcDivider} />
                  <div className={styles.pmcItem}>
                    <span
                      className={styles.pmcValue}
                      style={{ color: "var(--color-danger)" }}
                    >
                      {displayLoad.fatigue}
                    </span>
                    <span className={styles.pmcItemLabel}>FATIGA</span>
                  </div>
                  <div className={styles.pmcDivider} />
                  <div className={styles.pmcItem}>
                    <span
                      className={styles.pmcValue}
                      style={{ color: "var(--color-success)" }}
                    >
                      {displayLoad.form}
                    </span>
                    <span className={styles.pmcItemLabel}>FORMA</span>
                  </div>
                </div>

                <div className={styles.pmcFooter}>
                  <p className={styles.pmcDescription}>
                    {displayLoad.status.includes("Óptimo")
                      ? "Estás en el sweet-spot de entrenamiento."
                      : displayLoad.status.includes("Fresco")
                        ? "Te estás recuperando para tu próximo objetivo."
                        : "Cuidado con la fatiga acumulada."}
                  </p>
                </div>

                {/* Performance Intelligence Insights */}
                {loadProfile && loadProfile.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <PeakForecast data={loadProfile} />
                  </div>
                )}
              </div>
            </div>

            {/* This week hero */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Esta semana</h3>
                <span className={styles.sectionSubTitle}>Lunes - Hoy</span>
              </div>

              <div className={styles.heroCard}>
                <div className={styles.heroMain}>
                  <span className={styles.heroValue}>
                    {(thisWeek.distance / 1000).toFixed(1)}
                  </span>
                  <span className={styles.heroUnit}>km</span>
                </div>

                <div className={styles.heroStatsGrid}>
                  <div className={styles.heroStatItem}>
                    <span className={styles.heroStatValue}>
                      {formatDuration(thisWeek.time)}
                    </span>
                  </div>
                  <div className={styles.heroStatItem}>
                    <span className={styles.heroStatValue}>
                      {Math.round(thisWeek.elevation)}m
                    </span>
                  </div>
                  <div className={styles.heroStatItem}>
                    <span className={styles.heroStatValue}>
                      {thisWeek.count} act.
                    </span>
                  </div>
                </div>

                {lastWeek.distance > 0 && (
                  <div className={styles.heroProgressContainer}>
                    <div className={styles.progressBarBg}>
                      <div
                        className={styles.progressBarFill}
                        style={{
                          width: `${Math.min(100, (thisWeek.distance / lastWeek.distance) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className={styles.heroProgressText}>
                      {thisWeek.distance >= lastWeek.distance
                        ? `¡Superaste la semana pasada! (+${percentChange(thisWeek.distance, lastWeek.distance)}%)`
                        : `${percentChange(thisWeek.distance, lastWeek.distance)}% vs semana pasada`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats grid */}
            <div className={styles.section}>
              <div className={styles.statsGrid}>
                <StatCard
                  label="Entrenamientos"
                  value={yearActivities.length.toString()}
                  icon={<Calendar size={16} color="var(--color-primary)" />}
                  color="var(--color-primary)"
                />
                <StatCard
                  label="Bests"
                  value={yearActivities
                    .reduce((s, a) => s + (a.pr_count || 0), 0)
                    .toString()}
                  icon={<Trophy size={16} color="var(--color-warning)" />}
                  color="var(--color-warning)"
                />
              </div>
            </div>

            {/* Recent activities */}
            <div className={`${styles.section} ${styles.lastSection}`}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Actividades Recientes</h3>
                <button
                  className={styles.seeAll}
                  onClick={() => navigate("/activities")}
                >
                  Ver todas
                </button>
              </div>
              <div className={styles.activitiesList}>
                {recentActivities.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyEmoji}>🏃</span>
                    <h3 className={styles.emptyTitle}>Sin actividades</h3>
                    <p className={styles.emptyText}>
                      Tus recorridos aparecerán aquí después de sincronizar con
                      Strava.
                    </p>
                  </div>
                ) : (
                  recentActivities.map((activity) => (
                    <button
                      key={activity.id}
                      className={styles.activityRow}
                      onClick={() => navigate(`/activity/${activity.id}`)}
                    >
                      <div
                        className={styles.activityEmoji}
                        style={{ backgroundColor: `rgba(255,255,255,0.05)` }}
                      >
                        {getActivityEmoji(activity.type)}
                      </div>
                      <div className={styles.activityInfo}>
                        <span className={styles.activityName}>
                          {activity.name}
                        </span>
                        <span className={styles.activityDescription}>
                          {formatDistance(activity.distance)} •{" "}
                          {formatDuration(activity.moving_time)}
                        </span>
                      </div>
                      <div className={styles.activityRight}>
                        <span className={styles.activityDate}>
                          {formatRelativeDate(activity.start_date_local)}
                        </span>
                        <ChevronRight
                          size={14}
                          color="var(--color-text-muted)"
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
