import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { syncRecentActivities } from "../../lib/strava";
import { useAuthStore } from "../../store/authStore";
import { Activity } from "../../lib/types";
import {
  formatDistance,
  formatDuration,
  getActivityColor,
  getActivityEmoji,
  formatRelativeDate,
  calculateStreak,
  percentChange,
  getWeekStart,
  calculateTrainingLoad,
} from "../../lib/utils";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from "../../constants/theme";
import Header from "../../components/Header";
import HealthShield from "../../components/analytics/HealthShield";
import PeakForecast from "../../components/analytics/PeakForecast";

const { width } = Dimensions.get("window");

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  unit,
  change,
  icon,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  change?: number;
  icon: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.statCardContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{value}</Text>
          {unit && <Text style={styles.statUnit}>{unit}</Text>}
        </View>
        {change !== undefined && (
          <View style={styles.statChangeRow}>
            <Ionicons
              name={change >= 0 ? "arrow-up" : "arrow-down"}
              size={10}
              color={change >= 0 ? Colors.success : Colors.danger}
            />
            <Text
              style={[
                styles.statChange,
                { color: change >= 0 ? Colors.success : Colors.danger },
              ]}
            >
              {Math.abs(change)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────
function ActivityRow({
  activity,
  onPress,
}: {
  activity: Activity;
  onPress: () => void;
}) {
  const color = getActivityColor(activity.type);
  const emoji = getActivityEmoji(activity.type);

  return (
    <TouchableOpacity
      style={styles.activityRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.activityEmoji, { backgroundColor: `${color}10` }]}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityName} numberOfLines={1}>
          {activity.name}
        </Text>
        <Text style={styles.activityDescription}>
          {formatDistance(activity.distance)} •{" "}
          {formatDuration(activity.moving_time)}
        </Text>
      </View>
      <View style={styles.activityRight}>
        <Text style={styles.activityDate}>
          {formatRelativeDate(activity.start_date_local)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Streak Badge ─────────────────────────────────────────────────────────────
function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <LinearGradient
      colors={["#FF6B35", "#FF8C5A"]}
      style={styles.streakBadge}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Ionicons name="flame" size={14} color="white" />
      <Text style={styles.streakText}>{streak} DÍAS SEGUIDOS</Text>
    </LinearGradient>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch activities from Supabase
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  // Sync mutations
  const syncMutation = useMutation({
    mutationFn: () => {
      console.log("[SYNC] Starting recent activities sync...");
      return syncRecentActivities(user!.id);
    },
    onSuccess: () => {
      console.log("[SYNC] Recent sync success");
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (err) => {
      console.error("[SYNC] Recent sync error:", err);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await syncMutation.mutateAsync();
    setRefreshing(false);
  };

  // Metrics
  const weekStart = getWeekStart();
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);

  const thisWeekActivities = activities.filter(
    (a) => new Date(a.start_date) >= weekStart,
  );
  const lastWeekActivities = activities.filter(
    (a) =>
      new Date(a.start_date) >= lastWeekStart &&
      new Date(a.start_date) < lastWeekEnd,
  );

  const thisWeek = {
    distance: thisWeekActivities.reduce((s, a) => s + a.distance, 0),
    time: thisWeekActivities.reduce((s, a) => s + a.moving_time, 0),
    elevation: thisWeekActivities.reduce(
      (s, a) => s + a.total_elevation_gain,
      0,
    ),
    count: thisWeekActivities.length,
  };

  const lastWeek = {
    distance: lastWeekActivities.reduce((s, a) => s + a.distance, 0),
    time: lastWeekActivities.reduce((s, a) => s + a.moving_time, 0),
    count: lastWeekActivities.length,
  };

  const streak = calculateStreak(activities);
  const recentActivities = activities.slice(0, 5);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Atleta";

  // Year filter for specific stats
  const currentYear = new Date().getFullYear();
  const yearActivities = activities.filter(
    (a) => new Date(a.start_date).getFullYear() === currentYear,
  );

  // Training Peaks Metrics
  const load = calculateTrainingLoad(activities);

  return (
    <View style={styles.container}>
      <Header
        title={`Hola, ${firstName} 👋`}
        rightElement={
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="sync" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Analizando tu rendimiento...</Text>
          </View>
        ) : (
          <>
            {/* Training Load (PMC) Hero */}
            <View style={styles.section}>
              <LinearGradient
                colors={["#1a1a26", "#0a0a0f"]}
                style={styles.pmcHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.pmcHeader}>
                  <View>
                    <Text style={styles.pmcLabel}>ESTADO DE FORMA</Text>
                    <Text style={styles.pmcStatus}>{load.status}</Text>
                  </View>
                  <StreakBadge streak={streak} />
                </View>

                <View style={styles.pmcGrid}>
                  <View style={styles.pmcItem}>
                    <Text style={[styles.pmcValue, { color: Colors.primary }]}>
                      {load.fitness}
                    </Text>
                    <Text style={styles.pmcItemLabel}>FITNESS</Text>
                  </View>
                  <View style={styles.pmcDivider} />
                  <View style={styles.pmcItem}>
                    <Text style={[styles.pmcValue, { color: Colors.danger }]}>
                      {load.fatigue}
                    </Text>
                    <Text style={styles.pmcItemLabel}>FATIGA</Text>
                  </View>
                  <View style={styles.pmcDivider} />
                  <View style={styles.pmcItem}>
                    <Text style={[styles.pmcValue, { color: Colors.success }]}>
                      {load.form}
                    </Text>
                    <Text style={styles.pmcItemLabel}>FORMA</Text>
                  </View>
                </View>

                <View style={styles.pmcFooter}>
                  <Text style={styles.pmcDescription}>
                    {load.status === "En progreso"
                      ? "Estás construyendo base de forma eficiente."
                      : load.status === "Recuperando"
                        ? "Te estás recuperando para tu próximo objetivo."
                        : "Mantené la constancia para ver progresos."}
                  </Text>
                </View>

                {/* Performance Intelligence Insights */}
                {profile?.id && (
                  <View style={{ marginTop: Spacing.md }}>
                    <PeakForecast
                      currentProfile={{
                        user_id: profile.id,
                        date: new Date().toISOString().split("T")[0],
                        daily_trimp: 0,
                        ctl: load.fitness,
                        atl: load.fatigue,
                        tsb: load.form,
                        formula_version: "1.0.0",
                        calculated_at: new Date().toISOString(),
                      }}
                    />
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Health Shield Section */}
            {profile?.id && (
              <View style={styles.section}>
                <HealthShield userId={profile.id} />
              </View>
            )}

            {/* This week hero */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Esta semana</Text>
                <Text style={styles.sectionSubTitle}>
                  Lunes{" "}
                  {weekStart.toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  - Hoy
                </Text>
              </View>

              <View style={styles.heroCard}>
                <View style={styles.heroMain}>
                  <Text style={styles.heroValue}>
                    {(thisWeek.distance / 1000).toFixed(1)}
                  </Text>
                  <Text style={styles.heroUnit}>km</Text>
                </View>

                <View style={styles.heroStatsGrid}>
                  <View style={styles.heroStatItem}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.heroStatValue}>
                      {formatDuration(thisWeek.time)}
                    </Text>
                  </View>
                  <View style={styles.heroStatItem}>
                    <Ionicons
                      name="trending-up-outline"
                      size={14}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.heroStatValue}>
                      {Math.round(thisWeek.elevation)}m
                    </Text>
                  </View>
                  <View style={styles.heroStatItem}>
                    <Ionicons
                      name="flash-outline"
                      size={14}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.heroStatValue}>
                      {thisWeek.count} act.
                    </Text>
                  </View>
                </View>

                {lastWeek.distance > 0 && (
                  <View style={styles.heroProgressContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(100, (thisWeek.distance / lastWeek.distance) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.heroProgressText}>
                      {thisWeek.distance >= lastWeek.distance
                        ? `¡Superaste la semana pasada! (+${percentChange(thisWeek.distance, lastWeek.distance)}%)`
                        : `${percentChange(thisWeek.distance, lastWeek.distance)}% vs semana pasada`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick stats grid */}
            <View style={styles.section}>
              <View style={styles.statsGrid}>
                <StatCard
                  label="Entrenamientos"
                  value={yearActivities.length.toString()}
                  icon="calendar"
                  color={Colors.primary}
                />
                <StatCard
                  label="Bests"
                  value={yearActivities
                    .reduce((s, a) => s + (a.pr_count || 0), 0)
                    .toString()}
                  icon="trophy"
                  color={Colors.warning}
                />
              </View>
            </View>

            {/* Recent activities */}
            <View style={[styles.section, { marginBottom: 100 }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Actividades Recientes</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/activities")}
                >
                  <Text style={styles.seeAll}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activitiesList}>
                {recentActivities.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🏃</Text>
                    <Text style={styles.emptyTitle}>Sin actividades</Text>
                    <Text style={styles.emptyText}>
                      Tus recorridos aparecerán aquí después de sincronizar con
                      Strava.
                    </Text>
                  </View>
                ) : (
                  recentActivities.map((activity) => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      onPress={() =>
                        router.push(`/activity/${activity.id}` as any)
                      }
                    />
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  contentContainer: {
    paddingTop: Spacing.md,
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionSubTitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  // PMC Hero
  pmcHero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  pmcHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  pmcLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  pmcStatus: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  pmcGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  pmcItem: {
    alignItems: "center",
    flex: 1,
  },
  pmcValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
  },
  pmcItemLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    marginTop: 4,
  },
  pmcDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  pmcFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  pmcDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Streak
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 6,
    ...Shadows.sm,
  },
  streakText: {
    color: "white",
    fontWeight: FontWeight.extrabold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  // Hero card
  heroCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  heroMain: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: Spacing.sm,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  heroUnit: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  heroStatsGrid: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  heroStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatValue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  heroProgressContainer: {
    gap: Spacing.sm,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  heroProgressText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  // Stats grid
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statUnit: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  statChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
  },
  statChange: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  // Activities list
  activitiesList: {
    gap: Spacing.sm,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityEmoji: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  activityDescription: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  activityRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  activityDate: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    fontWeight: FontWeight.bold,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  emptyEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
    marginTop: 4,
  },
});
