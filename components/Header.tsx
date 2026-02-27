import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  Shadows,
} from "../constants/theme";
import { BlurView } from "expo-blur";

import { useRouter } from "expo-router";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  fallbackRoute?: string;
}

export default function Header({
  title,
  showBack,
  onBack,
  rightElement,
  fallbackRoute = "/",
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isBlurSupported = Platform.OS === "ios" || Platform.OS === "web";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  };

  const content = (
    <View style={[styles.content, { marginTop: insets.top }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="flash" size={16} color="white" />
          </View>
          <Text style={styles.logoText}>FORMA</Text>
        </View>
        {title ? <Text style={styles.title}>{title}</Text> : null}
      </View>
      <View style={styles.right}>{rightElement}</View>
    </View>
  );

  return (
    <View style={[styles.container, { height: 60 + insets.top }]}>
      {isBlurSupported ? (
        <BlurView tint="dark" intensity={80} style={styles.container_inner}>
          {content}
        </BlurView>
      ) : (
        <View
          style={[styles.container_inner, { backgroundColor: Colors.bgCard }]}
        >
          {content}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    zIndex: 100,
    width: "100%",
  },
  container_inner: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flex: 1,
    ...Shadows.sm,
  },
  content: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginRight: Spacing.xs,
    paddingVertical: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
});
