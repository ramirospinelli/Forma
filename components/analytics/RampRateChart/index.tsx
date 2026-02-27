import React from "react";
import { View, Text, StyleSheet } from "react-native";
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

export default function RampRateChart({ data }: RampRateChartProps) {
  const rampData = useRampRate(data);
  const { state } = useChartPressState({ x: 0, y: { delta: 0, avg4w: 0 } });

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
