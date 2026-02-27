import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CartesianChart, Line, Area } from "victory-native";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../constants/theme";
import { useDailyLoadProfile } from "../../lib/hooks/useMetrics";

const { width } = Dimensions.get("window");

function WebPerformanceChart({ data }: { data: any[] }) {
  // Find overall min and max to scale everything properly
  const max = Math.max(
    ...data.map((d) => Math.max(d.ctl, d.atl, d.tsb, 10)),
    1,
  );
  const min = Math.min(...data.map((d) => Math.min(d.ctl, d.atl, d.tsb, -10)));
  const range = max - min || 1;

  // We'll show a simplified bar-like chart for web to avoid Skia issues
  return (
    <View
      style={{
        height: 180,
        width: "100%",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 1,
        paddingBottom: 10,
        position: "relative",
      }}
    >
      {/* Zero Line for reference */}
      <View
        style={{
          position: "absolute",
          bottom: `${((0 - min) / range) * 100}%`,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255,255,255,0.1)",
          zIndex: 0,
        }}
      />
      {data.map((d, i) => {
        const ctlH = ((d.ctl - min) / range) * 100;
        const atlH = ((d.atl - min) / range) * 100;
        const tsbH = ((d.tsb - min) / range) * 100;

        return (
          <View
            key={i}
            style={{ flex: 1, height: "100%", position: "relative" }}
          >
            {/* ATL Bar */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: `${atlH}%`,
                backgroundColor: Colors.danger,
                opacity: 0.2,
                zIndex: 1,
              }}
            />
            {/* CTL Bar */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: `${ctlH}%`,
                backgroundColor: Colors.primary,
                opacity: 0.5,
                zIndex: 2,
              }}
            />
            {/* TSB Dot */}
            <View
              style={{
                position: "absolute",
                bottom: `${tsbH}%`,
                width: "100%",
                height: 3,
                backgroundColor: Colors.success,
                opacity: 0.8,
                zIndex: 3,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

export default function PerformanceChart({ userId }: { userId: string }) {
  const { data, isLoading } = useDailyLoadProfile(userId, 90); // Last 90 days
  const [showInfo, setShowInfo] = React.useState(false);

  const chartData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data
      .map((d) => ({
        timestamp: new Date(d.date).getTime(),
        ctl: Number(d.ctl) || 0,
        atl: Number(d.atl) || 0,
        tsb: Number(d.tsb) || 0,
        date: d.date,
      }))
      .filter((d) => !isNaN(d.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  // Victory Native XL components can crash if data.length < 2
  if (!chartData || chartData.length < 2) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>
          No hay datos suficientes para generar la gráfica de rendimiento
          (mínimo 2 días).
        </Text>
      </View>
    );
  }

  const renderChart = () => {
    if (Platform.OS === "web") {
      return <WebPerformanceChart data={chartData} />;
    }

    return (
      <CartesianChart
        data={chartData}
        xKey="timestamp"
        yKeys={["ctl", "atl", "tsb"]}
        domainPadding={{ top: 20, bottom: 20, left: 10, right: 10 }}
      >
        {({ points, chartBounds }) => {
          // Safety guard for Skia rendering context
          if (
            !chartBounds ||
            !points ||
            !points.ctl ||
            !points.atl ||
            !points.tsb
          ) {
            return null;
          }

          return (
            <>
              {/* TSB Area - Represents Form/Readiness */}
              <Area
                points={points.tsb}
                y0={chartBounds.bottom}
                color={Colors.success}
                opacity={0.15}
              />

              {/* ATL Line - Acute Fatigue */}
              <Line points={points.atl} color={Colors.danger} strokeWidth={2} />

              {/* CTL Line - Chronic Fitness */}
              <Line
                points={points.ctl}
                color={Colors.primary}
                strokeWidth={3}
              />
            </>
          );
        }}
      </CartesianChart>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Gestión de Carga (PMC 2.0)</Text>
          <TouchableOpacity onPress={() => setShowInfo(!showInfo)}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={Colors.accent}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>CTL (Fitness)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.legendText}>ATL (Fatiga)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>TSB (Forma)</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 180 }}>{renderChart()}</View>

      {showInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>¿Qué significan estas métricas?</Text>
          <Text style={styles.infoText}>
            <Text style={{ color: Colors.primary, fontWeight: "bold" }}>
              • CTL (Fitness):
            </Text>{" "}
            Refleja tu estado físico a largo plazo (acumulado de 42 días).
            Cuanto más entrenas constantemente, más sube.
          </Text>
          <Text style={styles.infoText}>
            <Text style={{ color: Colors.danger, fontWeight: "bold" }}>
              • ATL (Fatiga):
            </Text>{" "}
            Es el cansancio agudo provocado por tus entrenamientos recientes
            (últimos 7 días). Sube rápido y baja rápido.
          </Text>
          <Text style={styles.infoText}>
            <Text style={{ color: Colors.success, fontWeight: "bold" }}>
              • TSB (Forma):
            </Text>{" "}
            Es tu "frescura" actual (CTL menos ATL). Si es negativo estás
            fatigado/entrenando duro. Si es positivo o cercano a cero, estás
            descansado y listo para competir ("Tapering").
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Evolución de los últimos 90 días</Text>
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
    marginTop: Spacing.xs,
  },
  center: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  legend: {
    flexDirection: "row",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendText: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  infoBox: {
    backgroundColor: "rgba(78,205,196,0.1)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.2)",
  },
  infoTitle: {
    fontSize: FontSize.xs,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 14,
  },
});
