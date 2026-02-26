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
  Shadows,
} from "../../constants/theme";
import Header from "../../components/Header";

const { width } = Dimensions.get("window");
const CHART_HEIGHT = 160;

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
    height: CHART_HEIGHT,
    marginTop: Spacing.sm,
  },
  bars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  barBg: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: "center",
    fontWeight: FontWeight.bold,
  },
});

// ─── PR Card ──────────────────────────────────────────────────────────────────
function PRCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <View style={styles.prCard}>
      <View style={styles.prIconBg}>
        <Ionicons name={icon as any} size={18} color={Colors.warning} />
      </View>
      <View style={styles.prContent}>
        <Text style={styles.prValue}>{value}</Text>
        <Text style={styles.prLabel}>{label}</Text>
        {sub && <Text style={styles.prSub}>{sub}</Text>}
      </View>
    </View>
  );
}

// ─── Stats Screen ─────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");

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

  const currentYear = new Date().getFullYear();
  const yearActivities = activities.filter(
    (a) => new Date(a.start_date).getFullYear() === currentYear,
  );

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
        .replace(".", ""),
    };
  }).reverse();

  const weeklyDistances = last8Weeks.map((w) => w.distance);
  const weeklyLabels = last8Weeks.map((w) => w.label);

  // ─── Year-to-date totals ──────────────────────────────────────────────────
  const totals = yearActivities.reduce(
    (acc, a) => ({
      distance: acc.distance + a.distance,
      time: acc.time + a.moving_time,
      elevation: acc.elevation + a.total_elevation_gain,
      runs: acc.runs + (a.type === "Run" ? 1 : 0),
      rides: acc.rides + (a.type === "Ride" ? 1 : 0),
    }),
    { distance: 0, time: 0, elevation: 0, runs: 0, rides: 0 },
  );

  // ─── Year-to-date Personal records ─────────────────────────────────────────
  const runs = yearActivities.filter((a) => a.type === "Run" && a.distance > 0);
  const rides = yearActivities.filter(
    (a) => a.type === "Ride" && a.distance > 0,
  );

  const fastestRunPace = runs.length
    ? Math.min(...runs.map((a) => a.average_speed))
    : 0;
  const longestRun = runs.length ? Math.max(...runs.map((a) => a.distance)) : 0;
  const longestRide = rides.length
    ? Math.max(...rides.map((a) => a.distance))
    : 0;
  const mostElevation = yearActivities.length
    ? Math.max(...yearActivities.map((a) => a.total_elevation_gain))
    : 0;

  // ─── Activity type breakdown (Year) ───────────────────────────────────────
  const typeBreakdown = yearActivities.reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.type] = (acc[a.type] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const sortedTypes = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <View style={styles.container}>
      <Header title="Análisis de Rendimiento" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Year totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Total Acumulado ({currentYear})
          </Text>
          <View style={styles.totalsGrid}>
            <View style={styles.totalCard}>
              <View
                style={[
                  styles.totalIcon,
                  { backgroundColor: "rgba(255,107,53,0.1)" },
                ]}
              >
                <Ionicons name="map-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.totalValue}>
                {(totals.distance / 1000).toFixed(0)}
              </Text>
              <Text style={styles.totalUnit}>km totales</Text>
            </View>
            <View style={styles.totalCard}>
              <View
                style={[
                  styles.totalIcon,
                  { backgroundColor: "rgba(78,205,196,0.1)" },
                ]}
              >
                <Ionicons name="time-outline" size={20} color={Colors.accent} />
              </View>
              <Text style={styles.totalValue}>
                {Math.round(totals.time / 3600)}
              </Text>
              <Text style={styles.totalUnit}>horas activo</Text>
            </View>
          </View>
        </View>

        {/* Weekly chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consistencia Semanal</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Distancia (km)</Text>
              <Text style={styles.chartSub}>Últimas 8 semanas</Text>
            </View>
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
            <Text style={styles.sectionTitle}>Deportes ({currentYear})</Text>
            <View style={styles.breakdownCard}>
              {sortedTypes.map(([type, count]) => {
                const color = getActivityColor(type);
                const pct = Math.round((count / yearActivities.length) * 100);
                return (
                  <View key={type} style={styles.breakdownRow}>
                    <View style={styles.breakdownLeft}>
                      <View
                        style={[
                          styles.breakdownDot,
                          { backgroundColor: color },
                        ]}
                      />
                      <Text style={styles.breakdownType}>
                        {type === "Run"
                          ? "Carrera"
                          : type === "Ride"
                            ? "Ciclismo"
                            : type}
                      </Text>
                    </View>
                    <View style={styles.breakdownBarContainer}>
                      <View
                        style={[
                          styles.breakdownBar,
                          { width: `${pct}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Year Personal Records */}
        <View style={[styles.section, { marginBottom: 120 }]}>
          <Text style={styles.sectionTitle}>Records en {currentYear}</Text>
          <View style={styles.prList}>
            {fastestRunPace > 0 && (
              <PRCard
                label="Ritmo más rápido"
                value={speedToPace(fastestRunPace)}
                sub="min/km — Carrera"
                icon="speedometer"
              />
            )}
            {longestRun > 0 && (
              <PRCard
                label="Carrera más larga"
                value={formatDistance(longestRun)}
                sub="Entrenamiento fondo"
                icon="map"
              />
            )}
            {longestRide > 0 && (
              <PRCard
                label="Ride más largo"
                value={formatDistance(longestRide)}
                sub="Ciclismo"
                icon="bicycle"
              />
            )}
          </View>
        </View>
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
    paddingTop: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginLeft: 4,
  },
  // Totals
  totalsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  totalCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 8,
    ...Shadows.sm,
  },
  totalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  totalUnit: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  // Chart
  chartCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  chartHeader: {
    marginBottom: Spacing.lg,
  },
  chartTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  chartSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Breakdown
  breakdownCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    width: 80,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  breakdownType: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 3,
    overflow: "hidden",
  },
  breakdownBar: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownPct: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    width: 30,
    textAlign: "right",
  },
  // PRs
  prList: {
    gap: Spacing.md,
  },
  prCard: {
    flexDirection: "row",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: Spacing.lg,
    ...Shadows.sm,
  },
  prIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255, 179, 71, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  prContent: {
    flex: 1,
    gap: 2,
  },
  prValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  prLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
  },
  prSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});
