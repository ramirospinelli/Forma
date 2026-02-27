import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { CartesianChart, Line, useChartPressState } from "victory-native";
import {
  Colors,
  Spacing,
  FontWeight,
  BorderRadius,
} from "../../../constants/theme";
import { useQuery } from "@tanstack/react-query";
import {
  getValidStravaToken,
  fetchActivityStreams,
} from "../../../lib/services/strava-api";

interface HeartRateChartProps {
  userId: string;
  stravaId: number;
}

export default function HeartRateChart({
  userId,
  stravaId,
}: HeartRateChartProps) {
  const { data: streams, isLoading } = useQuery({
    queryKey: ["activity_streams", stravaId],
    queryFn: async () => {
      const token = await getValidStravaToken(userId);
      if (!token) throw new Error("No Strava token");
      return fetchActivityStreams(token, stravaId, ["heartrate", "time"]);
    },
    enabled: !!userId && !!stravaId,
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  let hrStream: number[] = [];
  let timeStream: number[] = [];

  if (Array.isArray(streams)) {
    hrStream = streams.find((s: any) => s.type === "heartrate")?.data || [];
    timeStream = streams.find((s: any) => s.type === "time")?.data || [];
  } else if (streams && typeof streams === "object") {
    hrStream = (streams as any).heartrate?.data || [];
    timeStream = (streams as any).time?.data || [];
  }

  if (hrStream.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Esta actividad no contiene datos de frecuencia cardíaca.
        </Text>
      </View>
    );
  }

  const chartData = hrStream.map((hr: number, i: number) => ({
    time: timeStream[i] || i,
    hr,
  }));

  // Downsample if too many points for performance
  const displayData = chartData.filter((_: any, i: number) =>
    chartData.length > 500 ? i % Math.ceil(chartData.length / 500) === 0 : true,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gráfico de Pulsaciones</Text>
      <View style={{ height: 160, width: "100%" }}>
        {Platform.OS === "web" ? (
          <WebChart data={displayData} />
        ) : (
          <NativeChart data={displayData} />
        )}
      </View>
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>MAX</Text>
          <Text style={[styles.statValue, { color: Colors.danger }]}>
            {Math.max(...hrStream)} bpm
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>PROM</Text>
          <Text style={[styles.statValue, { color: Colors.textPrimary }]}>
            {Math.round(
              hrStream.reduce((a: number, b: number) => a + b, 0) /
                hrStream.length,
            )}{" "}
            bpm
          </Text>
        </View>
      </View>
    </View>
  );
}

function NativeChart({ data }: { data: any[] }) {
  const { state } = useChartPressState({ x: 0, y: { hr: 0 } });

  return (
    <>
      <CartesianChart
        data={data}
        xKey="time"
        yKeys={["hr"]}
        padding={{ top: 10, bottom: 10, left: 0, right: 0 }}
        axisOptions={{
          tickCount: 0,
          lineColor: "transparent",
        }}
        chartPressState={state}
      >
        {({ points }) => (
          <>
            <Line points={points.hr} color={Colors.danger} strokeWidth={2} />
            {state.isActive && (
              <Line
                points={[
                  { x: state.x.value.value, y: 0, xValue: 0, yValue: 0 },
                  { x: state.x.value.value, y: 500, xValue: 0, yValue: 0 },
                ]}
                color="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
            )}
          </>
        )}
      </CartesianChart>
      {state.isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {state.y.hr.value.value.toFixed(0)} bpm
          </Text>
        </View>
      )}
    </>
  );
}

function WebChart({ data }: { data: any[] }) {
  const maxHr = Math.max(...data.map((d) => d.hr), 1);
  const minHr = Math.min(...data.map((d) => d.hr), 60);
  const range = maxHr - minHr || 1;

  return (
    <View
      style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 1 }}
    >
      {data
        .filter((_, i) => i % 5 === 0)
        .map((d, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${((d.hr - minHr + 10) / (range + 10)) * 100}%`,
              backgroundColor: Colors.danger,
              opacity: 0.6,
              borderRadius: 1,
            }}
          />
        ))}
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
    marginTop: Spacing.md,
  },
  title: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  loading: { height: 160, justifyContent: "center", alignItems: "center" },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  statItem: { alignItems: "center" },
  statLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
  },
  statValue: { fontSize: 14, fontWeight: FontWeight.bold },
  tooltip: {
    position: "absolute",
    top: 40,
    right: 10,
    backgroundColor: Colors.bgSurface,
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tooltipText: {
    color: Colors.danger,
    fontWeight: FontWeight.bold,
    fontSize: 12,
  },
  errorContainer: {
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  errorText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
});
