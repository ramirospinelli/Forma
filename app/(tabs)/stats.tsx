import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { Activity } from "../../lib/types";
import {
  formatDistance,
  speedToPace,
  getActivityColor,
  getWeekStart,
} from "../../lib/utils";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../constants/theme";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - Spacing.lg * 2;
const CHART_HEIGHT = 140;

type Period = "week" | "month" | "year";

// ─── Simple Bar Chart ─────────────────────────────────────────────────────────
function BarChart({
  data,
  color,
  labels,
}: {
  data: number[];
  color: string;
  labels: string[];
}) {
  const max = Math.max(...data, 1);
  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.bars}>
        {data.map((val, i) => (
          <View key={i} style={chartStyles.barWrapper}>
            <Text style={chartStyles.barValue}>
              {val > 0 ? (val / 1000).toFixed(1) : ""}
            </Text>
            <View style={chartStyles.barBg}>
              <View
                style={[
                  chartStyles.bar,
                  {
                    height: `${(val / max) * 100}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
            <Text style={chartStyles.barLabel}>{labels[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    height: CHART_HEIGHT + 40,
    marginTop: Spacing.sm,
  },
  bars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingTop: 24,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barValue: {
    fontSize: 9,
    color: Colors.textMuted,
    marginBottom: 2,
    height: 12,
  },
  barBg: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.bgSurface,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    borderRadius: 4,
    minHeight: 3,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 4,
    textTransform: "uppercase",
  },
});

// ─── PR Card ──────────────────────────────────────────────────────────────────
function PRCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.prCard}>
      <Ionicons name="trophy" size={18} color={Colors.warning} />
      <Text style={styles.prValue}>{value}</Text>
      <Text style={styles.prLabel}>{label}</Text>
      {sub && <Text style={styles.prSub}>{sub}</Text>}
    </View>
  );
}

// ─── Stats Screen ─────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>("week");

  const { data: activities = [] } = useQuery({
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

  // ─── Weekly chart data (last 8 weeks) ────────────────────────────────────
  const last8Weeks = Array.from({ length: 8 }, (_, i) => {
    const start = getWeekStart(new Date());
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const acts = activities.filter(
      (a) => new Date(a.start_date) >= start && new Date(a.start_date) < end,
    );
    return {
      distance: acts.reduce((s, a) => s + a.distance, 0),
      label: start
        .toLocaleDateString("es-AR", { day: "numeric", month: "short" })
        .slice(0, 5),
    };
  }).reverse();

  const weeklyDistances = last8Weeks.map((w) => w.distance);
  const weeklyLabels = last8Weeks.map((w) => w.label);

  // ─── All-time totals ──────────────────────────────────────────────────────
  const totals = activities.reduce(
    (acc, a) => ({
      distance: acc.distance + a.distance,
      time: acc.time + a.moving_time,
      elevation: acc.elevation + a.total_elevation_gain,
      runs: acc.runs + (a.type === "Run" ? 1 : 0),
      rides: acc.rides + (a.type === "Ride" ? 1 : 0),
    }),
    { distance: 0, time: 0, elevation: 0, runs: 0, rides: 0 },
  );

  // ─── Personal records ─────────────────────────────────────────────────────
  const runs = activities.filter((a) => a.type === "Run" && a.distance > 0);
  const rides = activities.filter((a) => a.type === "Ride" && a.distance > 0);

  const fastestRunPace = runs.length
    ? Math.min(...runs.map((a) => a.average_speed))
    : 0;
  const longestRun = runs.length ? Math.max(...runs.map((a) => a.distance)) : 0;
  const longestRide = rides.length
    ? Math.max(...rides.map((a) => a.distance))
    : 0;
  const mostElevation = activities.length
    ? Math.max(...activities.map((a) => a.total_elevation_gain))
    : 0;

  // ─── Activity type breakdown ──────────────────────────────────────────────
  const typeBreakdown = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});
  const sortedTypes = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Estadísticas</Text>

      {/* All-time totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Total acumulado</Text>
        <View style={styles.totalsGrid}>
          <View style={styles.totalCard}>
            <Ionicons name="map-outline" size={22} color={Colors.primary} />
            <Text style={styles.totalValue}>
              {(totals.distance / 1000).toFixed(0)}
            </Text>
            <Text style={styles.totalUnit}>km totales</Text>
          </View>
          <View style={styles.totalCard}>
            <Ionicons name="time-outline" size={22} color={Colors.accent} />
            <Text style={styles.totalValue}>
              {Math.round(totals.time / 3600)}
            </Text>
            <Text style={styles.totalUnit}>horas activo</Text>
          </View>
          <View style={styles.totalCard}>
            <Ionicons
              name="trending-up-outline"
              size={22}
              color={Colors.success}
            />
            <Text style={styles.totalValue}>
              {(totals.elevation / 1000).toFixed(1)}
            </Text>
            <Text style={styles.totalUnit}>km elevación</Text>
          </View>
          <View style={styles.totalCard}>
            <Ionicons name="flash-outline" size={22} color={Colors.warning} />
            <Text style={styles.totalValue}>{activities.length}</Text>
            <Text style={styles.totalUnit}>actividades</Text>
          </View>
        </View>
      </View>

      {/* Weekly chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distancia semanal</Text>
        <View style={styles.chartCard}>
          <BarChart
            data={weeklyDistances}
            color={Colors.primary}
            labels={weeklyLabels}
          />
        </View>
      </View>

      {/* Activity breakdown */}
      {sortedTypes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por tipo de actividad</Text>
          <View style={styles.breakdownList}>
            {sortedTypes.map(([type, count]) => {
              const color = getActivityColor(type);
              const pct = Math.round((count / activities.length) * 100);
              return (
                <View key={type} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View
                      style={[styles.breakdownDot, { backgroundColor: color }]}
                    />
                    <Text style={styles.breakdownType}>{type}</Text>
                  </View>
                  <View style={styles.breakdownBarContainer}>
                    <View
                      style={[
                        styles.breakdownBar,
                        { width: `${pct}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Personal Records */}
      <View style={[styles.section, { marginBottom: 100 }]}>
        <Text style={styles.sectionTitle}>Records personales</Text>
        <View style={styles.prGrid}>
          {fastestRunPace > 0 && (
            <PRCard
              label="Ritmo más rápido"
              value={speedToPace(fastestRunPace)}
              sub="min/km — Corriendo"
            />
          )}
          {longestRun > 0 && (
            <PRCard
              label="Carrera más larga"
              value={formatDistance(longestRun)}
              sub="Corriendo"
            />
          )}
          {longestRide > 0 && (
            <PRCard
              label="Ride más largo"
              value={formatDistance(longestRide)}
              sub="En bici"
            />
          )}
          {mostElevation > 0 && (
            <PRCard
              label="Más elevación"
              value={`${Math.round(mostElevation)}m`}
              sub="En una actividad"
            />
          )}
        </View>
      </View>
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
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
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
  // Totals
  totalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  totalCard: {
    flex: 1,
    minWidth: (width - Spacing.lg * 2 - Spacing.sm) / 2 - 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 4,
  },
  totalValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    lineHeight: 36,
  },
  totalUnit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Chart
  chartCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Breakdown
  breakdownList: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    width: 100,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownType: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.bgSurface,
    borderRadius: 4,
    overflow: "hidden",
  },
  breakdownBar: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownCount: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    width: 28,
    textAlign: "right",
  },
  // PRs
  prGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  prCard: {
    flex: 1,
    minWidth: (width - Spacing.lg * 2 - Spacing.sm) / 2 - 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 179, 71, 0.2)",
    gap: 4,
    alignItems: "center",
  },
  prValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  prLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
