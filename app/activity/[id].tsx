import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { Activity } from "../../lib/types";
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

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: activity, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: Colors.textPrimary }}>
          Actividad no encontrada
        </Text>
      </View>
    );
  }

  const color = getActivityColor(activity.type);
  const emoji = getActivityEmoji(activity.type);
  const isRun = activity.type === "Run";
  const isRide = activity.type === "Ride";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingLeft: 70,
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
});
