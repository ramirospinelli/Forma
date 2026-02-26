import { supabase } from "../lib/supabase";
import { StravaActivity, StravaTokenResponse } from "../lib/types";

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET!;
const STRAVA_BASE_URL = "https://www.strava.com/api/v3";

// ─── Token Exchange ───────────────────────────────────────────────────────────

export async function exchangeStravaCode(
  code: string,
): Promise<StravaTokenResponse> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Strava auth code");
  }

  return response.json();
}

export async function refreshStravaToken(
  refreshToken: string,
): Promise<StravaTokenResponse> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Strava token");
  }

  return response.json();
}

// ─── Get valid access token ───────────────────────────────────────────────────

export async function getValidStravaToken(
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "strava_access_token, strava_refresh_token, strava_token_expires_at",
    )
    .eq("id", userId)
    .single();

  if (!profile?.strava_access_token) return null;

  const expiresAt = new Date(profile.strava_token_expires_at ?? 0).getTime();
  const now = Date.now();

  // Token still valid
  if (expiresAt > now + 60_000) {
    return profile.strava_access_token;
  }

  // Refresh token
  if (!profile.strava_refresh_token) return null;

  const refreshed = await refreshStravaToken(profile.strava_refresh_token);

  // Save new tokens
  await supabase
    .from("profiles")
    .update({
      strava_access_token: refreshed.access_token,
      strava_refresh_token: refreshed.refresh_token,
      strava_token_expires_at: new Date(
        refreshed.expires_at * 1000,
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return refreshed.access_token;
}

// ─── Fetch Activities from Strava ─────────────────────────────────────────────

export async function fetchStravaActivities(
  accessToken: string,
  page = 1,
  perPage = 30,
  after?: number,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    ...(after ? { after: after.toString() } : {}),
  });

  const response = await fetch(
    `${STRAVA_BASE_URL}/athlete/activities?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Strava activities");
  }

  return response.json();
}

// ─── Sync activities to Supabase ──────────────────────────────────────────────

function estimateTss(type: string, movingTime: number): number {
  const hours = movingTime / 3600;
  // Representative TSS per hour for moderate effort
  const tssFactors: Record<string, number> = {
    Run: 100, // 1h run ~ 100 TSS
    Ride: 60, // 1h ride ~ 60 TSS
    Swim: 60,
    Hike: 40,
    Walk: 30,
    WeightTraining: 40,
    Workout: 50,
  };
  const factor = tssFactors[type] || 50;
  return Math.round(hours * factor);
}

export async function syncActivitiesToSupabase(
  userId: string,
  activities: StravaActivity[],
): Promise<void> {
  const rows = activities.map((a) => {
    // If Strava doesn't provide a suffer_score (Relative Effort), estimate it
    const tss = a.suffer_score || estimateTss(a.type, a.moving_time);

    return {
      user_id: userId,
      strava_id: a.id,
      name: a.name,
      type: a.type,
      distance: a.distance,
      moving_time: a.moving_time,
      elapsed_time: a.elapsed_time,
      total_elevation_gain: a.total_elevation_gain,
      average_speed: a.average_speed,
      max_speed: a.max_speed,
      average_heartrate: a.average_heartrate ?? null,
      max_heartrate: a.max_heartrate ?? null,
      start_date: a.start_date,
      start_date_local: a.start_date_local,
      summary_polyline: a.map?.summary_polyline ?? null,
      kudos_count: a.kudos_count ?? 0,
      pr_count: a.pr_count ?? 0,
      splits_data: a.splits_metric ?? null,
      laps_data: a.laps ?? null,
      tss: tss,
    };
  });

  const { error } = await supabase
    .from("activities")
    .upsert(rows, { onConflict: "strava_id" });

  if (error) throw error;
}

// ─── Full sync flow ───────────────────────────────────────────────────────────

export async function syncAllActivities(userId: string): Promise<number> {
  const token = await getValidStravaToken(userId);
  if (!token) throw new Error("No Strava token available");

  let page = 1;
  let totalSynced = 0;
  let hasMore = true;

  while (hasMore) {
    const activities = await fetchStravaActivities(token, page, 50);
    if (activities.length === 0) {
      hasMore = false;
    } else {
      await syncActivitiesToSupabase(userId, activities);
      totalSynced += activities.length;
      page++;
      if (activities.length < 50) hasMore = false;
    }
  }

  return totalSynced;
}

// ─── Incremental sync (last 30 activities) ────────────────────────────────────

export async function syncRecentActivities(userId: string): Promise<number> {
  const token = await getValidStravaToken(userId);
  if (!token) throw new Error("No Strava token available");

  const activities = await fetchStravaActivities(token, 1, 30);
  await syncActivitiesToSupabase(userId, activities);
  return activities.length;
}
