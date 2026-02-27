import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Colors,
  Spacing,
  FontWeight,
  BorderRadius,
  Shadows,
} from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface WeeklySummaryProps {
  monotony: number;
  strain: number;
  totalLoad: number;
  previousLoad: number;
}

export default function WeeklySummary({
  monotony,
  strain,
  totalLoad,
  previousLoad,
}: WeeklySummaryProps) {
  if (totalLoad === 0 && monotony === 0) {
    return (
      <View
        style={[
          styles.container,
          { padding: Spacing.xl, alignItems: "center" },
        ]}
      >
        <Ionicons name="analytics-outline" size={32} color={Colors.textMuted} />
        <Text
          style={[styles.statLabel, { marginTop: 12, textAlign: "center" }]}
        >
          No hay análisis semanal disponible
        </Text>
      </View>
    );
  }

  const loadChange =
    previousLoad > 0 ? ((totalLoad - previousLoad) / previousLoad) * 100 : 0;

  const monotonyColor =
    monotony < 1.5
      ? Colors.accent
      : monotony < 2.0
        ? "#F4D35E"
        : Colors.primary;

  const monotonyLabel =
    monotony < 1.5 ? "Bajo" : monotony < 2.0 ? "Moderado" : "ALTO";

  return (
    <View style={styles.container}>
      {/* Load Trend */}
      <View style={styles.mainStat}>
        <View>
          <Text style={styles.statLabel}>Carga Total Semanal</Text>
          <Text style={styles.statValue}>{Math.round(totalLoad)}</Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                loadChange >= 0
                  ? "rgba(78,205,196,0.1)"
                  : "rgba(255,107,53,0.1)",
            },
          ]}
        >
          <Ionicons
            name={loadChange >= 0 ? "trending-up" : "trending-down"}
            size={14}
            color={loadChange >= 0 ? Colors.accent : Colors.primary}
          />
          <Text
            style={[
              styles.badgeText,
              { color: loadChange >= 0 ? Colors.accent : Colors.primary },
            ]}
          >
            {Math.abs(Math.round(loadChange))}%
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Indices */}
      <View style={styles.indicesRow}>
        <View style={styles.indexItem}>
          <Text style={styles.indexLabel}>Monotonía ({monotonyLabel})</Text>
          <Text style={[styles.indexValue, { color: monotonyColor }]}>
            {(monotony ?? 0).toFixed(2)}
          </Text>
          {monotony >= 2.0 && (
            <Text style={styles.warningText}>Riesgo de lesión alto</Text>
          )}
        </View>

        <View style={styles.indexItem}>
          <Text style={styles.indexLabel}>Strain (Estrés)</Text>
          <Text style={styles.indexValue}>{Math.round(strain ?? 0)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  mainStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 32,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  indicesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  indexItem: {
    flex: 1,
  },
  indexLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  indexValue: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  warningText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
});
