import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../constants/theme";
import { supabase } from "../lib/supabase";
import { exchangeStravaCode } from "../lib/strava";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID!;

export default function AuthScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri =
    typeof window !== "undefined" &&
    window.location.hostname.includes("github.io")
      ? "https://ramirospinelli.github.io/Forma/auth/callback"
      : AuthSession.makeRedirectUri({
          scheme: "forma",
          path: "auth/callback",
        });

  const handleStravaLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authUrl =
        `https://www.strava.com/oauth/authorize?` +
        `client_id=${STRAVA_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&approval_prompt=auto` +
        `&scope=read,activity:read_all`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
      );

      if (result.type !== "success") {
        setIsLoading(false);
        if (result.type === "cancel") return;
        setError("Login cancelado. Intentá de nuevo.");
        return;
      }

      const url = result.url;
      const code = new URL(url).searchParams.get("code");

      if (!code) {
        setError("No se pudo obtener el código de autorización.");
        setIsLoading(false);
        return;
      }

      // Exchange code for tokens
      const tokenData = await exchangeStravaCode(code);
      const athlete = tokenData.athlete;

      // Sign in/up with Supabase using athlete email proxy
      const email = `strava_${athlete.id}@forma.app`;
      const password = `strava_${athlete.id}_${STRAVA_CLIENT_ID}`;

      // Try sign in first
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      let userId: string;

      if (signInError) {
        // User doesn't exist, sign up
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
          });

        if (signUpError || !signUpData.user) {
          throw signUpError ?? new Error("Sign up failed");
        }
        userId = signUpData.user.id;
      } else {
        userId = signInData.user!.id;
      }

      // Save/update Strava profile
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: `${athlete.firstname} ${athlete.lastname}`,
        avatar_url: athlete.profile,
        strava_id: athlete.id,
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: new Date(
          tokenData.expires_at * 1000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      });

      router.replace("/(tabs)");
    } catch (err) {
      console.error("Auth error:", err);
      setError("Algo salió mal. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#1a0a05", "#0a0a0f", "#0a0a0f"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoIcon}>⚡</Text>
          </LinearGradient>
          <Text style={styles.logoText}>Forma</Text>
          <Text style={styles.logoTagline}>Tu rendimiento, tu progreso</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {[
            { icon: "📊", text: "Métricas detalladas de tus actividades" },
            { icon: "📈", text: "Seguí tu progreso semana a semana" },
            { icon: "🏆", text: "Visualizá tus records personales" },
            { icon: "🎯", text: "Establecé y cumplí tus objetivos" },
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Connect button */}
        <TouchableOpacity
          style={styles.stravaButton}
          onPress={handleStravaLogin}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#FC4C02", "#FF6E35"]}
            style={styles.stravaButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.stravaLogo}>🔗</Text>
                <Text style={styles.stravaButtonText}>Conectar con Strava</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Solo leemos tus actividades. No publicamos nada en tu cuenta.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.12,
    backgroundColor: Colors.primary,
  },
  circleTop: {
    width: 300,
    height: 300,
    top: -100,
    right: -80,
  },
  circleBottom: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -60,
    backgroundColor: Colors.accent,
    opacity: 0.08,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: height * 0.12,
    paddingBottom: Spacing.xxl,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  logoIcon: {
    fontSize: 36,
  },
  logoText: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  logoTagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  features: {
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.bgCard,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    flex: 1,
  },
  errorBox: {
    backgroundColor: "rgba(255, 87, 87, 0.15)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: Spacing.md,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: "center",
  },
  stravaButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  stravaButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  stravaLogo: {
    fontSize: 20,
  },
  stravaButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
