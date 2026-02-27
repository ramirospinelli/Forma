import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { CartesianChart, Bar, Line, useChartPressState } from "victory-native";
import { Ionicons } from "@expo/vector-icons";
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
  const zeroPos = (max / range) * 100;

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
              {/* Value Label */}
              <View
                style={{
                  position: "absolute",
                  left: -10,
                  right: -10,
                  top: isNegative
                    ? `${zeroPos + heightPct + 2}%`
                    : `${zeroPos - heightPct - 12}%`,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 7,
                    fontWeight: "bold",
                    color: val > 0 ? Colors.primary : Colors.textMuted,
                  }}
                >
                  {val > 0 ? "+" : ""}
                  {val.toFixed(1)}
                </Text>
              </View>

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
  const [showInfo, setShowInfo] = useState(false);
  const rampData = useRampRate(data);
  if (rampData.length === 0) return null;

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
    if (val > 10) return Colors.primary;
    if (val > 7) return "#F4D35E";
    return Colors.accent;
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
        <View style={styles.headerRight}>
          <View
            style={[
              styles.badge,
              { backgroundColor: getRampColor(latest?.delta) },
            ]}
          >
            <Text style={styles.badgeText}>+{latest?.delta.toFixed(1)}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowInfo(!showInfo)}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {showInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            El Ramp Rate mide la velocidad a la que ganas condición física.
            {"\n\n"}
            <Text style={{ fontWeight: "bold", color: Colors.accent }}>
              • 3 a 7 ptos semanales:
            </Text>{" "}
            Progreso ideal y asimilable.{"\n"}
            <Text style={{ fontWeight: "bold", color: "#F4D35E" }}>
              • 7 a 10 ptos:
            </Text>{" "}
            Límite superior. Requiere vigilar descanso rigurosamente.{"\n"}
            <Text style={{ fontWeight: "bold", color: Colors.primary }}>
              • Más de 10 ptos:
            </Text>{" "}
            Aumento peligroso. Alto riesgo de lesión y sobreentrenamiento.
          </Text>
        </View>
      )}

      <View style={{ height: 180, width: "100%" }}>
        {Platform.OS === "web" ? (
          <WebRampRateChart data={displayData} />
        ) : (
          <NativeChart displayData={displayData} />
        )}
      </View>

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

function NativeChart({ displayData }: { displayData: any[] }) {
  const { state } = useChartPressState({ x: 0, y: { delta: 0, avg4w: 0 } });

  return (
    <>
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
        {({ points, chartBounds }) => {
          if (!points || !chartBounds) return null;
          return (
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
          );
        }}
      </CartesianChart>
      {state.isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            Semana: {displayData[Math.round(state.x.value.value)]?.label}
          </Text>
          <Text style={[styles.tooltipVal, { color: Colors.primary }]}>
            Crecimiento: +{state.y.delta.value.value.toFixed(1)}
          </Text>
          <Text style={[styles.tooltipVal, { color: "#FFF" }]}>
            Media 4s: {state.y.avg4w.value.value.toFixed(1)}
          </Text>
        </View>
      )}
    </>
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: FontWeight.bold, color: "#000" },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10, color: Colors.textMuted },
  tooltip: {
    backgroundColor: Colors.bgSurface,
    padding: 8,
    borderRadius: BorderRadius.md,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tooltipText: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  tooltipVal: { fontSize: 12, fontWeight: FontWeight.bold },
  infoBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  infoText: {
    fontSize: 10,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
