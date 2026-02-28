import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { exchangeStravaCode } from "../lib/strava";
import { useAuthStore } from "../store/authStore";
import styles from "./AuthCallback.module.css";

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID!;

const redirectUri = window.location.hostname.includes("localhost")
  ? `${window.location.origin}/Forma/auth/callback`
  : "https://ramirospinelli.github.io/Forma/auth/callback";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { fetchProfile } = useAuthStore();
  const processing = useRef(false);

  useEffect(() => {
    async function handleAuth() {
      if (processing.current) return;

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error || !code) {
        console.error("Auth error from Strava:", error);
        navigate("/auth", { replace: true });
        return;
      }

      processing.current = true;
      try {
        const tokenData = await exchangeStravaCode(code, redirectUri);
        const athlete = tokenData.athlete;
        const email = `strava_${athlete.id}@forma.app`;
        const password = `strava_${athlete.id}_${STRAVA_CLIENT_ID}`;

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

        await fetchProfile(userId);
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Callback processing error:", err);
        navigate("/auth", { replace: true });
      }
    }
    handleAuth();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      <p className={styles.text}>Procesando inicio de sesión...</p>
    </div>
  );
}
