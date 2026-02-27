import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../../constants/theme";
import { useZonalDistribution } from "../../../hooks/analytics/useZonalDistribution";

export default function ZonalDistribution() {
  const [showInfo, setShowInfo] = useState(false);
  const { data: weeks, isLoading } = useZonalDistribution();

  if (isLoading || !weeks || weeks.length === 0) return null;

  const currentWeek = weeks[weeks.length - 1];
  const zoneColors = ["#4ECDC4", "#96E6B3", "#FFD93D", "#FF9234", "#FF6B6B"];
  const zoneLabels = ["Z1", "Z2", "Z4", "Z5", "Z6"]; // Labels usually avoid Z3 as "grey zone" in some models but we use Z1-Z5

  const distribution = currentWeek.zones.map((z) =>
    currentWeek.totalTrimp > 0 ? (z / currentWeek.totalTrimp) * 100 : 0,
  );

  // Polarization detection
  const isPolarized =
    distribution[0] + distribution[1] > 70 &&
    distribution[3] + distribution[4] > 15;
  const excessiveZ3 = distribution[2] > 40;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Distribución de Intensidad</Text>
          <Text style={styles.subtitle}>
            Calidad del estímulo semanal (TRIMP por Zona)
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowInfo(!showInfo)}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Stacked Bar */}
      <View style={styles.barContainer}>
        {distribution.map((pct, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { width: `${pct}%`, backgroundColor: zoneColors[i] },
            ]}
          />
        ))}
      </View>

      {/* Legend & Stats */}
      <View style={styles.grid}>
        {distribution.map((pct, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: zoneColors[i] }]} />
            <Text style={styles.legendText}>
              Z{i + 1}: {Math.round(pct)}%
            </Text>
          </View>
        ))}
      </View>

      {showInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: "bold", color: zoneColors[0] }}>
              Z1-Z2
            </Text>
            : Base Aeróbica.
            <Text style={{ fontWeight: "bold", color: zoneColors[2] }}>
              {" "}
              Z3
            </Text>
            : Zona Gris (Fatiga prolongada).
            <Text style={{ fontWeight: "bold", color: zoneColors[4] }}>
              {" "}
              Z4-Z5
            </Text>
            : Entrenamientos de Alta Calidad e Intervalos.{"\n"}
            Entrenamiento "Polarizado": 80% en Z1-Z2, 20% en Z4-Z5.
          </Text>
        </View>
      )}

      {/* Analysis Panel */}
      <View style={styles.analysisPanel}>
        {excessiveZ3 && (
          <View style={styles.alert}>
            <Text style={styles.alertText}>
              ⚠️ Exceso de Z3 ("Zona Gris"). Estás acumulando fatiga sin máxima
              adaptación.
            </Text>
          </View>
        )}
        {isPolarized && (
          <View style={styles.success}>
            <Text style={styles.successText}>
              ✅ Entrenamiento Polarizado detectado. Estructura de alta calidad
              (80/20).
            </Text>
          </View>
        )}
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
  headerRow: {
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
  barContainer: {
    height: 12,
    flexDirection: "row",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: Spacing.sm,
  },
  segment: {
    height: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  analysisPanel: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  alert: {
    backgroundColor: "rgba(255,107,107,0.1)",
    padding: Spacing.xs,
    borderRadius: 4,
  },
  alertText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  success: {
    backgroundColor: "rgba(78,205,196,0.1)",
    padding: Spacing.xs,
    borderRadius: 4,
  },
  successText: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  infoBox: {
    marginTop: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  infoText: {
    fontSize: 9,
    color: Colors.textMuted,
    lineHeight: 14,
  },
});
