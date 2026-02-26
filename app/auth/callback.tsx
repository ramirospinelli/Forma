import { useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { exchangeStravaCode } from "../../lib/strava";
import { Colors } from "../../constants/theme";

export default function AuthCallback() {
  const router = useRouter();
  const { code, error } = useLocalSearchParams();

  useEffect(() => {
    async function handleAuth() {
      if (error) {
        console.error("Auth error from Strava:", error);
        router.replace("/auth");
        return;
      }

      if (code && typeof code === "string") {
        try {
          const tokenData = await exchangeStravaCode(code);
          const athlete = tokenData.athlete;
          const email = `strava_${athlete.id}@forma.app`;
          const password = `strava_${athlete.id}_${process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID}`;

          // Sign in/up
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email, password });

          let userId: string;
          if (signInError) {
            const { data: signUpData, error: signUpError } =
              await supabase.auth.signUp({ email, password });
            if (signUpError || !signUpData.user) throw signUpError;
            userId = signUpData.user.id;
          } else {
            userId = signInData.user!.id;
          }

          // Update Profile
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
          console.error("Callback processing error:", err);
          router.replace("/auth");
        }
      }
    }
    handleAuth();
  }, [code, error]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Procesando inicio de sesión...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  text: {
    color: "white",
    fontSize: 16,
  },
});
