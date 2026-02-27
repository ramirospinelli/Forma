import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  FontWeight,
  BorderRadius,
  FontSize,
} from "../../constants/theme";
import { useACWR } from "../../hooks/analytics/useACWR";
import { LinearGradient } from "expo-linear-gradient";

export default function HealthShield({ userId }: { userId: string }) {
  const { data, isLoading } = useACWR(userId);

  if (isLoading || !data) return null;

  const { current, status, trend } = data;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Escudo de Salud</Text>
        <Text style={styles.subtitle}>ACWR (Carga Aguda vs Crónica)</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.shieldContainer}>
          <LinearGradient
            colors={[`${status.color}40`, "transparent"]}
            style={styles.shieldGradient}
          >
            <Ionicons name="shield-checkmark" size={48} color={status.color} />
            <Text style={[styles.acwrValue, { color: status.color }]}>
              {current.toFixed(2)}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.info}>
          <View
            style={[styles.badge, { backgroundColor: `${status.color}20` }]}
          >
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.description}>
            {status.label === "Optimal"
              ? "Tu progresión es segura. El riesgo de lesión es mínimo."
              : status.label === "Caution"
                ? "Cuidado: Estás incrementando la carga rápido. Considera un día de descanso."
                : status.label === "High Risk"
                  ? "PELIGRO: Sobrecarga crítica detectada. Riesgo de lesión inminente."
                  : "Desentrenamiento detectado. Tu carga crónica está cayendo."}
          </Text>

          <View style={styles.trendContainer}>
            <Ionicons
              name={trend >= 0 ? "trending-up" : "trending-down"}
              size={14}
              color={
                trend > 10
                  ? Colors.danger
                  : trend > 0
                    ? Colors.warning
                    : Colors.success
              }
            />
            <Text style={styles.trendText}>
              Tendencia semanal: {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Risk Scale */}
      <View style={styles.scaleContainer}>
        <View style={styles.scale}>
          <View
            style={[
              styles.scaleMarker,
              { left: `${Math.min((current / 2) * 100, 100)}%` },
            ]}
          />
          <View
            style={[
              styles.scaleSegment,
              { flex: 0.8, backgroundColor: Colors.textMuted },
            ]}
          />
          <View
            style={[
              styles.scaleSegment,
              { flex: 0.5, backgroundColor: Colors.success },
            ]}
          />
          <View
            style={[
              styles.scaleSegment,
              { flex: 0.2, backgroundColor: Colors.warning },
            ]}
          />
          <View
            style={[
              styles.scaleSegment,
              { flex: 0.5, backgroundColor: Colors.danger },
            ]}
          />
        </View>
        <View style={styles.scaleLabels}>
          <Text style={styles.scaleLabel}>0.0</Text>
          <Text style={styles.scaleLabel}>0.8</Text>
          <Text style={styles.scaleLabel}>1.3</Text>
          <Text style={styles.scaleLabel}>1.5</Text>
          <Text style={styles.scaleLabel}>2.0+</Text>
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
    marginBottom: Spacing.md,
  },
  header: { marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  shieldContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  shieldGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  acwrValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    marginTop: -5,
  },
  info: { flex: 1 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  trendText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  scaleContainer: { marginTop: Spacing.md },
  scale: {
    height: 4,
    flexDirection: "row",
    borderRadius: 2,
    overflow: "visible",
    backgroundColor: "rgba(255,255,255,0.05)",
    position: "relative",
  },
  scaleSegment: { height: "100%" },
  scaleMarker: {
    position: "absolute",
    top: -4,
    width: 2,
    height: 12,
    backgroundColor: "#FFF",
    zIndex: 10,
    borderRadius: 1,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  scaleLabel: {
    fontSize: 8,
    color: Colors.textMuted,
  },
});
