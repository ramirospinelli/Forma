import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../../constants/theme";
import {
  getTsbStatus,
  getAcrStatus,
  getRampRateStatus,
} from "../../../lib/interpreters/safety";
import { Ionicons } from "@expo/vector-icons";

interface SafetyPanelProps {
  ctl: number;
  atl: number;
  tsb: number;
  weeklyDelta?: number;
  monotony?: number;
}

export default function SafetyPanel({
  ctl,
  atl,
  tsb,
  weeklyDelta = 0,
  monotony = 0,
}: SafetyPanelProps) {
  const [showInfo, setShowInfo] = useState(false);

  const tsbStatus = getTsbStatus(tsb);
  const acrStatus = getAcrStatus(atl, ctl);
  const rampStatus = getRampRateStatus(weeklyDelta);

  const metrics = [
    {
      id: "acr",
      label: "ACR (Fatiga/Forma)",
      value: ctl > 0 ? (atl / ctl).toFixed(2) : "0.00",
      status: acrStatus,
      icon: "speedometer-outline",
    },
    {
      id: "ramp",
      label: "Ramp Rate (Subida)",
      value: `+${weeklyDelta.toFixed(1)}/sem`,
      status: rampStatus,
      icon: "trending-up-outline",
    },
    {
      id: "monotony",
      label: "Monotonía",
      value: monotony.toFixed(2),
      status:
        monotony >= 2.0
          ? {
              label: "ALTA",
              color: Colors.primary,
              interpretation: "Falta variabilidad en tus entrenos.",
            }
          : {
              label: "Saludable",
              color: Colors.accent,
              interpretation: "Buena variabilidad de intensidades.",
            },
      icon: "git-commit-outline",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Panel de Seguridad & Riesgo</Text>
        <TouchableOpacity onPress={() => setShowInfo(!showInfo)}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {showInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: "bold", color: Colors.primary }}>
              • ACR:
            </Text>{" "}
            Carga Aguda vs Crónica. Ideal 0.8 a 1.3. +1.5 = Riesgo de lesión.
            {"\n"}
            <Text style={{ fontWeight: "bold", color: Colors.primary }}>
              • Ramp Rate:
            </Text>{" "}
            Crecimiento de CTL semanal. Óptimo: 3-7 pts/s.{"\n"}
            <Text style={{ fontWeight: "bold", color: Colors.primary }}>
              • Monotonía:
            </Text>{" "}
            Variabilidad. Si entrenas siempre igual, aumenta la Monotonía y el
            riesgo de quemarte.
          </Text>
        </View>
      )}

      {/* Primary TSB State */}
      <View style={[styles.mainCard, { borderColor: tsbStatus.color }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>ESTADO DE FORMA ACTUAL</Text>
          <View style={[styles.badge, { backgroundColor: tsbStatus.color }]}>
            <Text style={styles.badgeText}>{tsbStatus.label}</Text>
          </View>
        </View>
        <Text style={styles.interpretation}>{tsbStatus.interpretation}</Text>
      </View>

      {/* Metric Grid */}
      <View style={styles.grid}>
        {metrics.map((m) => (
          <View key={m.id} style={styles.metricItem}>
            <View style={styles.metricHeader}>
              <Ionicons
                name={m.icon as any}
                size={14}
                color={Colors.textMuted}
              />
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
            <Text style={[styles.metricValue, { color: m.status.color }]}>
              {m.value}
            </Text>
            <Text style={styles.metricInterpretation} numberOfLines={2}>
              {m.status.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  infoBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  infoText: {
    fontSize: 10,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  mainCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: "#000",
  },
  interpretation: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  metricItem: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
  },
  metricValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  metricInterpretation: {
    fontSize: 9,
    color: Colors.textMuted,
  },
});
