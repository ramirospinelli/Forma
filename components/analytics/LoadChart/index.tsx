import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../../constants/theme";

const { width } = Dimensions.get("window");

export interface LoadDataPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

interface LoadChartProps {
  data: LoadDataPoint[];
}

/**
 * A highly stable, non-Skia version of the LoadChart for Web.
 */
function WebLoadChart({ data }: { data: LoadDataPoint[] }) {
  const latest = data[data.length - 1];
  const max = Math.max(...data.map((d) => Math.max(d.ctl, d.atl, 10)), 1);

  const getTsbStatus = (tsb: number) => {
    if (tsb > 5) return { label: "Fresco", color: "#7FB069" };
    if (tsb > -10) return { label: "Transición", color: "#E6E6E6" };
    if (tsb > -30) return { label: "Óptimo", color: "#F4D35E" };
    return { label: "Sobrecarga", color: "#EE5D5D" };
  };

  const status = getTsbStatus(latest?.tsb ?? 0);

  return (
    <View style={webStyles.container}>
      <View style={webStyles.header}>
        <Text style={webStyles.statusLabel}>
          Estado: <Text style={{ color: status.color }}>{status.label}</Text>
        </Text>
        <Text style={webStyles.tsbValue}>
          TSB (Forma): {Math.round(latest?.tsb ?? 0)}
        </Text>
      </View>
      <View style={webStyles.chartBody}>
        {data.slice(-14).map((d, i) => (
          <View key={i} style={webStyles.dayColumn}>
            <View style={webStyles.barContainer}>
              <View
                style={[
                  webStyles.bar,
                  {
                    height: `${(d.atl / max) * 100}%`,
                    backgroundColor: "#FF6B6B",
                    opacity: 0.4,
                  },
                ]}
              />
              <View
                style={[
                  webStyles.bar,
                  {
                    height: `${(d.ctl / max) * 100}%`,
                    backgroundColor: Colors.primary,
                    width: "60%",
                    position: "absolute",
                  },
                ]}
              />
              {/* CTL Value Label */}
              <Text
                style={{
                  position: "absolute",
                  bottom: `${(d.ctl / max) * 100 + 2}%`,
                  fontSize: 6,
                  fontWeight: "bold",
                  color: Colors.primary,
                }}
              >
                {Math.round(d.ctl)}
              </Text>
              {/* ATL Value Label */}
              <Text
                style={{
                  position: "absolute",
                  bottom: `${(d.atl / max) * 100 + 2}%`,
                  fontSize: 5,
                  color: "#FF6B6B",
                  opacity: 0.8,
                  left: 2,
                }}
              >
                {Math.round(d.atl)}
              </Text>
            </View>
            <Text style={webStyles.label}>
              {new Date(d.date).toLocaleDateString("es-AR", { day: "numeric" })}
            </Text>
          </View>
        ))}
      </View>
      <View style={webStyles.legend}>
        <View style={webStyles.legendItem}>
          <View style={[webStyles.dot, { backgroundColor: Colors.primary }]} />
          <Text style={webStyles.legendText}>CTL (Fitness)</Text>
        </View>
        <View style={webStyles.legendItem}>
          <View
            style={[
              webStyles.dot,
              { backgroundColor: "#FF6B6B", opacity: 0.6 },
            ]}
          />
          <Text style={webStyles.legendText}>ATL (Fatiga)</Text>
        </View>
      </View>
      <Text style={webStyles.infoText}>
        El Fitness (CTL) representa tu nivel a largo plazo. La Fatiga (ATL) es
        el estrés reciente.
      </Text>
    </View>
  );
}

const webStyles = StyleSheet.create({
  container: {
    height: 240,
    width: "100%",
    justifyContent: "center",
    padding: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  tsbValue: { fontSize: 11, color: Colors.textMuted },
  chartBody: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 4 },
  dayColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barContainer: {
    width: "100%",
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: { width: "100%", borderRadius: 2, minHeight: 2 },
  label: { fontSize: 8, color: Colors.textMuted, marginTop: 4 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9, color: Colors.textSecondary },
  infoText: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});

// Native Victory Version
import { CartesianChart, Line, useChartPressState } from "victory-native";

export default function LoadChart({ data }: LoadChartProps) {
  if (!data || data.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Sincroniza actividades para ver datos.
        </Text>
      </View>
    );
  }
  if (Platform.OS === "web") return <WebLoadChart data={data} />;
  return <NativeLoadChart data={data} />;
}

function NativeLoadChart({ data }: LoadChartProps) {
  const { state } = useChartPressState({
    x: 0,
    y: { ctl: 0, atl: 0, tsb: 0 },
  });

  const chartData = data.map((d, i) => ({
    x: i,
    dateLabel: new Date(d.date).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    }),
    ctl: Number(d.ctl) || 0,
    atl: Number(d.atl) || 0,
    tsb: Number(d.tsb) || 0,
  }));

  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.ctl, d.atl, 5)),
    1,
  );

  return (
    <View style={styles.container}>
      <View style={{ height: 260, width: "100%" }}>
        <CartesianChart
          data={chartData}
          xKey="x"
          yKeys={["ctl", "atl", "tsb"]}
          padding={16}
          domain={{ y: [-maxVal * 0.4, maxVal * 1.1] }}
          axisOptions={{
            tickCount: 5,
            formatXLabel: (v) => chartData[v]?.dateLabel || "",
            lineColor: "rgba(255,255,255,0.05)",
            labelColor: Colors.textMuted,
          }}
          chartPressState={state}
        >
          {({ points, chartBounds }) => (
            <>
              <Line
                points={points.atl}
                color="rgba(255,107,107,0.3)"
                strokeWidth={1}
              />
              <Line
                points={points.ctl}
                color={Colors.primary}
                strokeWidth={4}
              />
              <Line
                points={points.tsb}
                color="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
              {/* Vertical line indicator */}
              {state.isActive && (
                <Line
                  points={[
                    {
                      x: state.x.value.value,
                      y: chartBounds.top,
                      xValue: 0,
                      yValue: 0,
                    },
                    {
                      x: state.x.value.value,
                      y: chartBounds.bottom,
                      xValue: 0,
                      yValue: 0,
                    },
                  ]}
                  color="rgba(255,255,255,0.3)"
                  strokeWidth={1}
                />
              )}
            </>
          )}
        </CartesianChart>
      </View>

      {/* Tooltip */}
      {state.isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>
            {chartData[Math.round(state.x.value.value)]?.dateLabel || ""}
          </Text>
          <View style={styles.tooltipRow}>
            <Text style={[styles.tooltipText, { color: Colors.primary }]}>
              CTL: {state.y.ctl.value.value.toFixed(1)}
            </Text>
            <Text style={[styles.tooltipText, { color: "#FF6B6B" }]}>
              ATL: {state.y.atl.value.value.toFixed(1)}
            </Text>
            <Text style={[styles.tooltipText, { color: "#FFF" }]}>
              TSB: {state.y.tsb.value.value.toFixed(1)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.lineBadge,
                { backgroundColor: Colors.primary, height: 4 },
              ]}
            />
            <Text style={styles.legendText}>Condition (CTL)</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.lineBadge,
                { backgroundColor: "rgba(255,107,107,0.5)", height: 2 },
              ]}
            />
            <Text style={styles.legendText}>Fatigue (ATL)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.sm, width: "100%" },
  emptyContainer: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  footer: { paddingHorizontal: Spacing.md, marginTop: Spacing.sm },
  legendRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  lineBadge: { width: 16, borderRadius: 2 },
  legendText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  tooltip: {
    backgroundColor: Colors.bgSurface,
    padding: 8,
    borderRadius: BorderRadius.md,
    marginTop: 8,
    marginHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tooltipDate: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  tooltipRow: { flexDirection: "row", justifyContent: "space-between" },
  tooltipText: { fontSize: 11, fontWeight: FontWeight.bold },
});
