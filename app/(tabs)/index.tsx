import React, { useState } from "react";
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
} from "../../constants/theme";

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
      <View style={[styles.statIconBg, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
      {change !== undefined && (
        <View style={styles.statChangeRow}>
          <Ionicons
            name={change >= 0 ? "trending-up" : "trending-down"}
            size={12}
            color={change >= 0 ? Colors.success : Colors.danger}
          />
          <Text
            style={[
              styles.statChange,
              { color: change >= 0 ? Colors.success : Colors.danger },
            ]}
          >
            {Math.abs(change)}% vs semana anterior
          </Text>
        </View>
      )}
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
      <View style={[styles.activityEmoji, { backgroundColor: `${color}20` }]}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityName} numberOfLines={1}>
          {activity.name}
        </Text>
        <Text style={styles.activityDate}>
          {formatRelativeDate(activity.start_date_local)}
        </Text>
      </View>
      <View style={styles.activityStats}>
        <Text style={[styles.activityDist, { color }]}>
          {formatDistance(activity.distance)}
        </Text>
        <Text style={styles.activityTime}>
          {formatDuration(activity.moving_time)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Training Load Card ───────────────────────────────────────────────────────
function TrainingLoadCard({
  label,
  value,
  icon,
  color,
  description,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  description: string;
}) {
  return (
    <View style={styles.loadCard}>
      <View style={styles.loadHeader}>
        <View style={[styles.loadIconBg, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        <Text style={styles.loadLabel}>{label}</Text>
      </View>
      <Text style={[styles.loadValue, { color }]}>{value}</Text>
      <Text style={styles.loadDesc}>{description}</Text>
    </View>
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
      <Text style={styles.streakEmoji}>🔥</Text>
      <Text style={styles.streakText}>{streak} días seguidos</Text>
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
        .limit(100);
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => syncRecentActivities(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
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

  // Training Peaks Metrics
  const load = calculateTrainingLoad(activities);

  return (
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
      {/* Header */}
      <LinearGradient
        colors={["rgba(255,107,53,0.15)", "transparent"]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
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
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando tus actividades...</Text>
        </View>
      ) : (
        <>
          {/* Streak */}
          <View style={styles.section}>
            <StreakBadge streak={streak} />
          </View>

          {/* Training Load (PMC) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Estado de Forma</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      load.status === "Productive"
                        ? Colors.success + "20"
                        : load.status === "Recovery"
                          ? Colors.accent + "20"
                          : Colors.warning + "20",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        load.status === "Productive"
                          ? Colors.success
                          : load.status === "Recovery"
                            ? Colors.accent
                            : Colors.warning,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        load.status === "Productive"
                          ? Colors.success
                          : load.status === "Recovery"
                            ? Colors.accent
                            : Colors.warning,
                    },
                  ]}
                >
                  {load.status}
                </Text>
              </View>
            </View>

            <View style={styles.loadGrid}>
              <TrainingLoadCard
                label="Fitness (CTL)"
                value={load.fitness}
                icon="fitness"
                color={Colors.primary}
                description="Tu base a largo plazo"
              />
              <TrainingLoadCard
                label="Fatiga (ATL)"
                value={load.fatigue}
                icon="flame"
                color={Colors.danger}
                description="Carga de los últimos 7 días"
              />
              <TrainingLoadCard
                label="Forma (TSB)"
                value={load.form}
                icon="analytics"
                color={
                  load.form > 5
                    ? Colors.accent
                    : load.form < -20
                      ? Colors.danger
                      : Colors.success
                }
                description="Frescura para rendir"
              />
            </View>
          </View>

          {/* This week hero */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Esta semana</Text>
            <LinearGradient
              colors={["#1e1a15", "#12121a"]}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.heroMain}>
                <Text style={styles.heroValue}>
                  {(thisWeek.distance / 1000).toFixed(1)}
                </Text>
                <Text style={styles.heroUnit}>km</Text>
              </View>
              <Text style={styles.heroLabel}>Distancia total</Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.heroStatText}>
                    {formatDuration(thisWeek.time)}
                  </Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Ionicons
                    name="trending-up-outline"
                    size={16}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.heroStatText}>
                    {Math.round(thisWeek.elevation)}m
                  </Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Ionicons
                    name="flash-outline"
                    size={16}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.heroStatText}>
                    {thisWeek.count} actividades
                  </Text>
                </View>
              </View>
              {lastWeek.distance > 0 && (
                <View style={styles.heroChange}>
                  <Ionicons
                    name={
                      thisWeek.distance >= lastWeek.distance
                        ? "trending-up"
                        : "trending-down"
                    }
                    size={14}
                    color={
                      thisWeek.distance >= lastWeek.distance
                        ? Colors.success
                        : Colors.danger
                    }
                  />
                  <Text
                    style={[
                      styles.heroChangeText,
                      {
                        color:
                          thisWeek.distance >= lastWeek.distance
                            ? Colors.success
                            : Colors.danger,
                      },
                    ]}
                  >
                    {percentChange(thisWeek.distance, lastWeek.distance) > 0
                      ? "+"
                      : ""}
                    {percentChange(thisWeek.distance, lastWeek.distance)}% vs
                    semana anterior
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Quick stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.statsGrid}>
              <StatCard
                label="Actividades"
                value={activities.length.toString()}
                change={percentChange(thisWeek.count, lastWeek.count)}
                icon="flash"
                color={Colors.primary}
              />
              <StatCard
                label="Esta semana"
                value={(thisWeek.distance / 1000).toFixed(1)}
                unit="km"
                icon="map"
                color={Colors.accent}
              />
              <StatCard
                label="Tiempo"
                value={formatDuration(thisWeek.time)}
                icon="time"
                color={Colors.warning}
              />
              <StatCard
                label="Elevación"
                value={`${Math.round(thisWeek.elevation)}`}
                unit="m"
                icon="trending-up"
                color={Colors.success}
              />
            </View>
          </View>

          {/* Recent activities */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recientes</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/activities")}
              >
                <Text style={styles.seeAll}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activitiesList}>
              {recentActivities.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🏃</Text>
                  <Text style={styles.emptyTitle}>Sin actividades aún</Text>
                  <Text style={styles.emptyText}>
                    Bajá para sincronizar tus actividades de Strava
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  contentContainer: {
    paddingTop: 60,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  syncButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  // Streak
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    gap: Spacing.xs,
  },
  streakEmoji: { fontSize: 16 },
  streakText: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  // Hero card
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.2)",
  },
  heroMain: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  heroValue: {
    fontSize: 56,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    lineHeight: 60,
  },
  heroUnit: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.lg,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  heroStatText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  heroStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  heroChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.md,
  },
  heroChangeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: (width - Spacing.lg * 2 - Spacing.sm) / 2 - 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  statIconBg: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Load Cards
  loadGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  loadCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  loadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 4,
  },
  loadIconBg: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  loadLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  loadValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  loadDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statUnit: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  statChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  statChange: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  // Activities
  activitiesList: {
    gap: Spacing.xs,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityEmoji: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  activityDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  activityStats: {
    alignItems: "flex-end",
  },
  activityDist: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  activityTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    padding: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
