import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { Activity } from "../../lib/types";
import ActivityMap from "../../components/ActivityMap";
import {
  formatDistance,
  formatDuration,
  speedToPace,
  speedToKmh,
  getActivityColor,
  getActivityEmoji,
  formatDate,
} from "../../lib/utils";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../constants/theme";
import Header from "../../components/Header";

import { useActivityMetrics } from "../../lib/hooks/useMetrics";
import { useAuthStore } from "../../store/authStore";
import HeartRateChart from "../../components/analytics/HeartRateChart";

function MetricBlock({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) {
  return (
    <View style={styles.metricBlock}>
      <View
        style={[
          styles.metricIcon,
          { backgroundColor: `${color ?? Colors.primary}20` },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={color ?? Colors.primary}
        />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function IntensityMetrics({
  trimp,
  zones,
}: {
  trimp: number;
  zones: number[];
}) {
  const zoneColors = [
    "#4ECDC4", // Z1 - Gray/Blue
    "#96E6B3", // Z2 - Green
    "#FFD93D", // Z3 - Yellow
    "#FF9234", // Z4 - Orange
    "#FF6B6B", // Z5 - Red
  ];

  const totalTime = zones.reduce((a, b) => a + b, 0);

  return (
    <View style={styles.intensityCard}>
      <View style={styles.trimpHeader}>
        <View>
          <Text style={styles.intensityLabel}>Esfuerzo Estimado (TRIMP)</Text>
          <View
            style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}
          >
            <Text style={styles.intensityValue}>{Math.round(trimp)}</Text>
            <Text
              style={{
                fontSize: 12,
                color: Colors.textMuted,
                marginBottom: 6,
                fontWeight: FontWeight.bold,
                textTransform: "uppercase",
              }}
            >
              •{" "}
              {trimp < 50
                ? "Recuperación"
                : trimp < 150
                  ? "Aeróbico"
                  : trimp < 250
                    ? "Umbral"
                    : "Extremo"}
            </Text>
          </View>
        </View>
        <Ionicons name="flash" size={32} color={Colors.warning} />
      </View>

      <View style={styles.divider} />

      <Text style={styles.intensityLabel}>Distribución por Zonas</Text>
      <View style={styles.zoneBarContainer}>
        {zones.map((time, i) => {
          const pct = totalTime > 0 ? (time / totalTime) * 100 : 0;
          if (pct < 1) return null;
          return (
            <View
              key={i}
              style={[
                styles.zoneBarSegment,
                { width: `${pct}%`, backgroundColor: zoneColors[i] },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.zoneLegend}>
        {zones.map((time, i) => (
          <View key={i} style={styles.zoneLegendItem}>
            <View
              style={[styles.zoneDot, { backgroundColor: zoneColors[i] }]}
            />
            <Text style={styles.zoneLabel}>
              Z{i + 1}: {formatDuration(time)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();

  const { data: activity, isLoading: isActivityLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Activity;
    },
  });

  const { data: metrics, isLoading: isMetricsLoading } = useActivityMetrics(id);

  const isLoading = isActivityLoading || isMetricsLoading;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Cargando..." showBack onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.container}>
        <Header title="Error" showBack onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Text style={{ color: Colors.textPrimary }}>
            Actividad no encontrada
          </Text>
        </View>
      </View>
    );
  }

  const color = getActivityColor(activity.type);
  const emoji = getActivityEmoji(activity.type);
  const isRun = activity.type === "Run";
  const isRide = activity.type === "Ride";

  return (
    <View style={styles.container}>
      <Header title="Detalle" showBack onBack={() => router.back()} />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[`${color}25`, "transparent"]}
          style={styles.headerGradient}
        >
          <View style={styles.typeTag}>
            <Text style={{ fontSize: 18 }}>{emoji}</Text>
            <Text style={[styles.typeText, { color }]}>{activity.type}</Text>
          </View>
          <Text style={styles.activityName}>{activity.name}</Text>
          <Text style={styles.activityDate}>
            {formatDate(activity.start_date_local)}
          </Text>
        </LinearGradient>

        {/* Map */}
        <View style={styles.section}>
          <ActivityMap
            polyline={activity.summary_polyline ?? ""}
            color={color}
          />
        </View>

        {/* Heart Rate Chart */}
        {activity.strava_id && profile?.id && (
          <View style={styles.section}>
            <HeartRateChart userId={profile.id} stravaId={activity.strava_id} />
          </View>
        )}

        {/* Intensity Metrics */}
        {metrics && (
          <View style={styles.section}>
            <IntensityMetrics
              trimp={metrics.trimp_score}
              zones={metrics.hr_zones_time}
            />
          </View>
        )}

        {/* Main metrics */}
        <View style={styles.section}>
          <View style={styles.mainMetrics}>
            <View style={styles.mainMetric}>
              <Text style={[styles.mainValue, { color }]}>
                {formatDistance(activity.distance)}
              </Text>
              <Text style={styles.mainLabel}>Distancia</Text>
            </View>
            <View style={styles.mainDivider} />
            <View style={styles.mainMetric}>
              <Text style={styles.mainValue}>
                {formatDuration(activity.moving_time)}
              </Text>
              <Text style={styles.mainLabel}>Tiempo en movimiento</Text>
            </View>
          </View>
        </View>

        {/* Details grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles</Text>
          <View style={styles.metricsGrid}>
            {isRun && (
              <MetricBlock
                label="Ritmo promedio"
                value={`${speedToPace(activity.average_speed)} /km`}
                icon="timer-outline"
                color={color}
              />
            )}
            {isRide && (
              <MetricBlock
                label="Velocidad prom."
                value={`${speedToKmh(activity.average_speed)} km/h`}
                icon="speedometer-outline"
                color={color}
              />
            )}
            {activity.total_elevation_gain > 0 && (
              <MetricBlock
                label="Elevación"
                value={`${Math.round(activity.total_elevation_gain)}m`}
                icon="trending-up-outline"
                color={Colors.success}
              />
            )}
            {activity.average_heartrate && (
              <MetricBlock
                label="FC promedio"
                value={`${Math.round(activity.average_heartrate)} bpm`}
                icon="heart-outline"
                color={Colors.danger}
              />
            )}
            {activity.max_heartrate && (
              <MetricBlock
                label="FC máxima"
                value={`${Math.round(activity.max_heartrate)} bpm`}
                icon="heart"
                color={Colors.danger}
              />
            )}
            <MetricBlock
              label="Tiempo total"
              value={formatDuration(activity.elapsed_time)}
              icon="time-outline"
              color={Colors.textSecondary}
            />
            {(activity.pr_count ?? 0) > 0 && (
              <MetricBlock
                label="Records (PRs)"
                value={`${activity.pr_count} PR${(activity.pr_count ?? 0) > 1 ? "s" : ""}`}
                icon="trophy-outline"
                color={Colors.warning}
              />
            )}
            {(activity.kudos_count ?? 0) > 0 && (
              <MetricBlock
                label="Kudos"
                value={`${activity.kudos_count} 👏`}
                icon="thumbs-up-outline"
                color={Colors.accent}
              />
            )}
          </View>
        </View>

        {/* Splits */}
        {activity.splits_data && activity.splits_data.length > 0 && (
          <View style={[styles.section, { marginBottom: 60 }]}>
            <Text style={styles.sectionTitle}>Splits por km</Text>
            <View style={styles.splitsCard}>
              {/* Header */}
              <View style={styles.splitHeader}>
                <Text style={styles.splitHeaderText}>KM</Text>
                <Text style={styles.splitHeaderText}>Distancia</Text>
                <Text style={styles.splitHeaderText}>Tiempo</Text>
                <Text style={styles.splitHeaderText}>Ritmo</Text>
              </View>
              {activity.splits_data.map((split, i) => (
                <View
                  key={i}
                  style={[styles.splitRow, i % 2 === 0 && styles.splitRowAlt]}
                >
                  <Text style={styles.splitNum}>{split.split}</Text>
                  <Text style={styles.splitText}>
                    {formatDistance(split.distance)}
                  </Text>
                  <Text style={styles.splitText}>
                    {formatDuration(split.moving_time)}
                  </Text>
                  <Text style={[styles.splitPace, { color }]}>
                    {speedToPace(split.average_speed)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
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
  content: {
    paddingBottom: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerGradient: {
    paddingTop: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  typeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  activityName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  activityDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textTransform: "capitalize",
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  // Main metrics
  mainMetrics: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mainMetric: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  mainValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  mainLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  mainDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  // Metrics grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  metricBlock: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "flex-start",
    gap: 4,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Splits
  splitsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  splitHeader: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgSurface,
  },
  splitHeaderText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  splitRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  splitRowAlt: {
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  splitNum: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  splitText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  splitPace: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  // Intensity
  intensityCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trimpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intensityLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  intensityValue: {
    fontSize: 32,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  zoneBarContainer: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 6,
    flexDirection: "row",
    overflow: "hidden",
    marginVertical: Spacing.sm,
  },
  zoneBarSegment: {
    height: "100%",
  },
  zoneLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  zoneLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: "45%",
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
});
