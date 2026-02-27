import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { Colors, Spacing, FontSize, FontWeight } from "../../constants/theme";

const { width } = Dimensions.get("window");

interface LoadDataPoint {
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
 * This avoids the Victory-Native / Skia WASM crashes on specific browser configurations.
 */
function WebLoadChart({ data }: { data: LoadDataPoint[] }) {
  const latest = data[data.length - 1];
  const max = Math.max(...data.map((d) => Math.max(d.ctl, d.atl, 10)), 1);

  // Interpretation logic for TSB
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
          TSB: {Math.round(latest?.tsb ?? 0)}
        </Text>
      </View>
      <View style={webStyles.chartBody}>
        {data.slice(-14).map((d, i) => (
          <View key={i} style={webStyles.dayColumn}>
            <View style={webStyles.barContainer}>
              {/* ATL Bar */}
              <View
                style={[
                  webStyles.bar,
                  {
                    height: `${(d.atl / max) * 100}%`,
                    backgroundColor: "#FF6B6B",
                    opacity: 0.6,
                  },
                ]}
              />
              {/* CTL Bar (overlaying) */}
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
          <Text style={webStyles.legendText}>Fitness (CTL)</Text>
        </View>
        <View style={webStyles.legendItem}>
          <View style={[webStyles.dot, { backgroundColor: "#FF6B6B" }]} />
          <Text style={webStyles.legendText}>Fatiga (ATL)</Text>
        </View>
      </View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  container: { height: 220, width: "100%", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  tsbValue: {
    fontSize: 11,
    color: Colors.textMuted,
  },
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
    marginTop: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: Colors.textSecondary },
});

// For Native, we can attempt Skia if available, but for now let's use a very safe wrapper
import { CartesianChart, Line, useChartPressState } from "victory-native";

export default function LoadChart({ data }: LoadChartProps) {
  const { state } = useChartPressState({
    x: 0,
    y: { ctl: 0, atl: 0, tsb: 0 },
  });

  if (!data || data.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Sincroniza tus actividades para ver el gráfico.
        </Text>
      </View>
    );
  }

  // FORCE WEB FALLBACK to stop the crash immediately
  if (Platform.OS === "web") {
    return <WebLoadChart data={data} />;
  }

  // Native Implementation (Victory Native)
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
      <View style={{ height: 220, width: "100%" }}>
        <CartesianChart
          data={chartData}
          xKey="x"
          yKeys={["ctl", "atl", "tsb"]}
          padding={16}
          domain={{ y: [-maxVal * 0.2, maxVal * 1.1] }}
          axisOptions={{
            tickCount: 5,
            formatXLabel: (v) => chartData[v]?.dateLabel || "",
            lineColor: Colors.border,
            labelColor: Colors.textMuted,
          }}
          chartPressState={state}
        >
          {({ points }) => (
            <>
              <Line points={points.atl} color="#FF6B6B" strokeWidth={2} />
              <Line
                points={points.ctl}
                color={Colors.primary}
                strokeWidth={3}
              />
            </>
          )}
        </CartesianChart>
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
});
