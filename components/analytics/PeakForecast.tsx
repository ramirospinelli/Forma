import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Colors,
  Spacing,
  FontWeight,
  BorderRadius,
  FontSize,
} from "../../constants/theme";
import { projectTSB, findPeakDay } from "../../lib/simulation/projectTSB";
import { DailyLoadProfile } from "../../lib/domain/metrics/types";
import { Ionicons } from "@expo/vector-icons";

export default function PeakForecast({
  currentProfile,
}: {
  currentProfile: DailyLoadProfile;
}) {
  const projections = projectTSB(currentProfile, 7);
  const peak = findPeakDay(projections);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flash" size={16} color={Colors.warning} />
        <Text style={styles.title}>Predicción de Pico de Forma</Text>
      </View>

      <View style={styles.predictionBox}>
        <Text style={styles.predictionText}>
          Si descansas por completo, tu pico de forma será el{" "}
          <Text style={styles.highlight}>
            {new Date(peak.date).toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
            })}
          </Text>{" "}
          alcanzando un TSB de{" "}
          <Text
            style={[
              styles.highlight,
              { color: peak.tsb > 0 ? Colors.success : Colors.warning },
            ]}
          >
            +{peak.tsb.toFixed(0)}
          </Text>
          .
        </Text>
      </View>

      <View style={styles.daysGrid}>
        {projections.map((day, i) => (
          <View key={i} style={styles.dayCol}>
            <Text style={styles.dayLabel}>
              {new Date(day.date).toLocaleDateString("es-AR", {
                weekday: "narrow",
              })}
            </Text>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(Math.min(day.tsb * 2, 40), 5),
                  backgroundColor:
                    day.tsb > peak.tsb * 0.9 ? Colors.warning : Colors.border,
                },
              ]}
            />
            <Text style={styles.tsbValue}>{day.tsb.toFixed(0)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCardAlt,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  predictionBox: {
    marginBottom: Spacing.md,
  },
  predictionText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: FontWeight.bold,
    color: Colors.warning,
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 80,
    paddingTop: 10,
  },
  dayCol: {
    alignItems: "center",
    gap: 4,
  },
  dayLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
  tsbValue: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
});
