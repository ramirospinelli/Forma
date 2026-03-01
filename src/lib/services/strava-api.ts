import { supabase } from "../supabase";
import { StravaActivity, StravaTokenResponse } from "../types";

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET!;
const STRAVA_BASE_URL = "https://www.strava.com/api/v3";

export async function exchangeStravaCode(
  code: string,
  redirectUri: string,
): Promise<StravaTokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", STRAVA_CLIENT_ID);
  params.append("client_secret", STRAVA_CLIENT_SECRET);
  params.append("code", code);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", redirectUri);

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Strava auth code");
  }

  return response.json();
}

export async function refreshStravaToken(
  refreshToken: string,
): Promise<StravaTokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", STRAVA_CLIENT_ID);
  params.append("client_secret", STRAVA_CLIENT_SECRET);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Strava token");
  }

  return response.json();
}

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

  if (expiresAt > now + 60_000) {
    return profile.strava_access_token;
  }

  if (!profile.strava_refresh_token) return null;

  const refreshed = await refreshStravaToken(profile.strava_refresh_token);

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

export async function fetchDetailedActivity(
  accessToken: string,
  activityId: number,
): Promise<StravaActivity> {
  const response = await fetch(`${STRAVA_BASE_URL}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch detailed activity ${activityId}`);
  }

  return response.json();
}

export async function fetchActivityStreams(
  accessToken: string,
  activityId: number,
  types: string[] = ["heartrate", "time"],
): Promise<any[]> {
  try {
    const response = await fetch(
      `${STRAVA_BASE_URL}/activities/${activityId}/streams?keys=${types.join(",")}&key_by_type=false`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Strava Streams Error (${response.status}):`, errorBody);

      if (response.status === 404) return [];
      throw new Error(`Strava API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("fetchActivityStreams exception:", error);
    throw error;
  }
}
