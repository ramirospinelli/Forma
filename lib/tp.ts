import { supabase } from "./supabase";
import { PlannedWorkout } from "./types";
import * as AuthSession from "expo-auth-session";

const TP_CLIENT_ID = process.env.EXPO_PUBLIC_TP_CLIENT_ID!;
const TP_CLIENT_SECRET = process.env.EXPO_PUBLIC_TP_CLIENT_SECRET!;

// Note: TrainingPeaks API usually requires partner approval.
// This implementation provides the structure for OAuth and Sync.

/**
 * Exchange code for TP tokens
 */
export async function exchangeTPCodeForTokens(code: string) {
  // In a real scenario, this would call TP's token endpoint
  // https://oauth.trainingpeaks.com/oauth/token

  // Mock response for demonstration if no client secret is set
  if (!TP_CLIENT_SECRET || TP_CLIENT_SECRET === "YOUR_TP_CLIENT_SECRET") {
    return {
      access_token: "mock_tp_access_token",
      refresh_token: "mock_tp_refresh_token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  const response = await fetch("https://oauth.trainingpeaks.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: TP_CLIENT_ID,
      client_secret: TP_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) throw new Error("Failed to exchange TP code");
  return response.json();
}

/**
 * Sync planned workouts from TrainingPeaks to Supabase
 */
export async function syncPlannedWorkouts(userId: string) {
  // 1. Get user tokens
  const { data: profile } = await supabase
    .from("profiles")
    .select("tp_access_token, tp_refresh_token, tp_token_expires_at")
    .eq("id", userId)
    .single();

  if (!profile?.tp_access_token) return;

  // 2. Mock some workouts if we are in demo mode
  // In real life, fetch from TP API: https://api.trainingpeaks.com/v1/workouts/planned
  const mockPlanned: Partial<PlannedWorkout>[] = [
    {
      user_id: userId,
      tp_id: "tp_1",
      title: "Intervalos de Umbral (TP)",
      activity_type: "Run",
      planned_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      planned_duration: 3600,
      planned_tss: 85,
      status: "planned",
    },
    {
      user_id: userId,
      tp_id: "tp_2",
      title: "Z2 Endurance Ride",
      activity_type: "Ride",
      planned_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      planned_duration: 7200,
      planned_tss: 110,
      status: "planned",
    },
    {
      user_id: userId,
      activity_type: "Swim",
      title: "Técnica y Aeróbico",
      planned_date: new Date(Date.now() + 259200000).toISOString(),
      planned_duration: 2700,
      planned_tss: 45,
      status: "planned",
    },
  ];

  const { error } = await supabase.from("planned_workouts").upsert(
    mockPlanned.map((p) => ({
      ...p,
      user_id: userId,
    })),
    { onConflict: "user_id, tp_id" },
  );

  if (error) console.error("Error syncing planned workouts:", error);
}

/**
 * Helper to get TP Auth URL
 */
export function getTPAuthUrl() {
  const redirectUri = AuthSession.makeRedirectUri();
  return `https://oauth.trainingpeaks.com/oauth/authorize?client_id=${TP_CLIENT_ID}&response_type=code&scope=workouts:read&redirect_uri=${encodeURIComponent(redirectUri)}`;
}
