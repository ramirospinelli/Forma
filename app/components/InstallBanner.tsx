import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useInstallPrompt } from "../../lib/hooks/useInstallPrompt";
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  Shadows,
} from "../../constants/theme";

export default function InstallBanner() {
  const { isInstallable, isIOSWeb, isInstalled, promptInstall } =
    useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  // If app is already installed, or user dismissed the banner, or it can't be installed yet
  if (isInstalled || dismissed || !isInstallable) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={styles.logoBg}>
          <Text style={styles.logoEmoji}>⛰️</Text>
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>Instalar Forma</Text>
        <Text style={styles.subtitle}>
          {isIOSWeb
            ? "Toca Compartir y luego 'Agregar a Inicio'"
            : "Instala la app para tenerla directo en tu celular."}
        </Text>
      </View>

      {!isIOSWeb && (
        <TouchableOpacity style={styles.installButton} onPress={promptInstall}>
          <Text style={styles.installText}>Instalar</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setDismissed(true)}
      >
        <Ionicons name="close" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90, // Above tab bar
    alignSelf: "center",
    width: "90%",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    ...Shadows.md,
    zIndex: 1000,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  logoBg: {
    backgroundColor: Colors.bgSurface,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmoji: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    paddingRight: Spacing.xl,
  },
  installButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  installText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: FontSize.sm,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    padding: 4,
  },
});
