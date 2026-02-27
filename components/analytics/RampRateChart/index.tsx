import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { CartesianChart, Bar, Line, useChartPressState } from "victory-native";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../../constants/theme";
import { useRampRate } from "../../../hooks/analytics/useRampRate";
import { LoadDataPoint } from "../LoadChart/index";

interface RampRateChartProps {
  data: LoadDataPoint[];
}

// ─── Robust Web Fallback ──────────────────────────────────────────────────────
function WebRampRateChart({ data }: { data: any[] }) {
  const deltas = data.map((d) => Number(d.delta) || 0);
  const max = Math.max(...deltas, 5);
  const min = Math.min(...deltas, 0);
  const range = max - min || 1;
  const zeroPos = (max / range) * 100; // Percentage from top to zero

  return (
    <View style={{ height: 180, width: "100%", paddingBottom: 20 }}>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "stretch",
          gap: 4,
          paddingHorizontal: 10,
        }}
      >
        {data.map((d, i) => {
          const val = Number(d.delta) || 0;
          const heightPct = (Math.abs(val) / range) * 100;
          const isNegative = val < 0;

          return (
            <View key={i} style={{ flex: 1, position: "relative" }}>
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: isNegative ? `${zeroPos}%` : `${zeroPos - heightPct}%`,
                  height: `${heightPct}%`,
                  backgroundColor:
                    val > 8
                      ? Colors.primary
                      : val > 5
                        ? "#F4D35E"
                        : Colors.accent,
                  borderRadius: 2,
                  minHeight: 1,
                }}
              />
              {/* X-Axis Label */}
              <View
                style={{
                  position: "absolute",
                  bottom: -20,
                  left: -10,
                  right: -10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 7, color: Colors.textMuted }}
                  numberOfLines={1}
                >
                  {d.label.split(" ")[0]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      {/* Zero Line */}
      <View
        style={{
          position: "absolute",
          top: `${zeroPos}%`,
          left: 10,
          right: 10,
          height: 1,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      />
    </View>
  );
}

export default function RampRateChart({ data }: RampRateChartProps) {
  const rampData = useRampRate(data);

  if (rampData.length === 0) return null;

  // Filter to show weekly markers (every 7 days) to avoid clutter
  const displayData = rampData
    .filter((_, i) => i % 7 === 0)
    .map((d, i) => ({
      x: i,
      delta: d.delta,
      avg4w: d.avg4w,
      label: new Date(d.date).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
      }),
    }));

  const latest = displayData[displayData.length - 1];

  const getRampColor = (val: number) => {
    if (val > 10) return Colors.primary; // Danger
    if (val > 7) return "#F4D35E"; // Warning
    return Colors.accent; // Optimal
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ramp Rate (Progresión)</Text>
          <Text style={styles.subtitle}>
            Crecimiento semanal de Fitness (CTL)
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: getRampColor(latest?.delta) },
          ]}
        >
          <Text style={styles.badgeText}>+{latest?.delta.toFixed(1)}</Text>
        </View>
      </View>

      <View style={{ height: 180, width: "100%" }}>
        {Platform.OS === "web" ? (
          <WebRampRateChart data={displayData} />
        ) : (
          <NativeChart displayData={displayData} />
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>Delta Semanal</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.dot, { backgroundColor: "rgba(255,255,255,0.5)" }]}
          />
          <Text style={styles.legendText}>Media 4 semanas</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Native Victory Chart ─────────────────────────────────────────────────────
function NativeChart({ displayData }: { displayData: any[] }) {
  const { state } = useChartPressState({ x: 0, y: { delta: 0, avg4w: 0 } });

  return (
    <CartesianChart
      data={displayData}
      xKey="x"
      yKeys={["delta", "avg4w"]}
      padding={8}
      domainPadding={{ left: 20, right: 20 }}
      axisOptions={{
        tickCount: 4,
        formatXLabel: (v) => displayData[v]?.label || "",
        lineColor: "rgba(255,255,255,0.05)",
        labelColor: Colors.textMuted,
      }}
      chartPressState={state}
    >
      {({ points, chartBounds }) => (
        <>
          <Bar
            points={points.delta}
            chartBounds={chartBounds}
            color={Colors.primary}
            roundedCorners={{ topLeft: 4, topRight: 4 }}
            innerPadding={0.6}
          />
          <Line
            points={points.avg4w}
            color="#FFF"
            strokeWidth={2}
            opacity={0.5}
          />
        </>
      )}
    </CartesianChart>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: "#000",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});
