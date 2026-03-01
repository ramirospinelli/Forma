// Supabase Edge Function: sync-athletes
// Deno script to sync Activities from Strava for all connected athletes.
// Deployment: supabase functions deploy sync-athletes

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // 1. Authorization check (only allow service role or manual trigger with key)
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log("--- Starting Global Sync Cycle ---");

    // 2. Fetch athletes with Strava connected, oldest sync first
    const { data: profiles, error: pError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, last_sync_at, strava_refresh_token, strava_access_token, strava_token_expires_at",
      )
      .not("strava_refresh_token", "is", null)
      .neq("sync_status", "syncing")
      .order("last_sync_at", { ascending: true, nullsFirst: true })
      .limit(10);

    if (pError) throw pError;
    if (!profiles?.length) return new Response("No athletes to sync");

    const summary = [];

    for (const profile of profiles) {
      try {
        console.log(`Processing: ${profile.full_name || profile.id}`);

        // A. Token Management
        let accessToken = profile.strava_access_token;
        const expiresAt = new Date(
          profile.strava_token_expires_at || 0,
        ).getTime();

        if (expiresAt < Date.now() + 60000) {
          console.log(`Refreshing token for ${profile.full_name}`);
          const refreshResp = await fetch(
            "https://www.strava.com/oauth/token",
            {
              method: "POST",
              body: new URLSearchParams({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                refresh_token: profile.strava_refresh_token!,
                grant_type: "refresh_token",
              }),
            },
          );
          const refreshed = await refreshResp.json();
          accessToken = refreshed.access_token;

          await supabase
            .from("profiles")
            .update({
              strava_access_token: refreshed.access_token,
              strava_refresh_token: refreshed.refresh_token,
              strava_token_expires_at: new Date(
                refreshed.expires_at * 1000,
              ).toISOString(),
              sync_status: "syncing",
            })
            .eq("id", profile.id);
        } else {
          await supabase
            .from("profiles")
            .update({ sync_status: "syncing" })
            .eq("id", profile.id);
        }

        // B. Incremental Fetch (after last_sync_at)
        const after = profile.last_sync_at
          ? Math.floor(new Date(profile.last_sync_at).getTime() / 1000)
          : 1735689600; // Jan 1st 2025 default

        const activityResp = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const activities = await activityResp.json();

        if (Array.isArray(activities) && activities.length > 0) {
          console.log(
            `Found ${activities.length} new activities for ${profile.full_name}`,
          );

          const rows = activities.map((a) => ({
            user_id: profile.id,
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
            tss: Math.round(
              (a.moving_time / 3600) * (a.type === "Run" ? 100 : 60),
            ), // Standalone estimation
          }));

          const { error: upsertError } = await supabase
            .from("activities")
            .upsert(rows, { onConflict: "strava_id" });

          if (upsertError) throw upsertError;
        }

        // C. Finalize athlete
        await supabase
          .from("profiles")
          .update({
            sync_status: "idle",
            last_sync_at: new Date().toISOString(),
            sync_error_message: null,
          })
          .eq("id", profile.id);

        summary.push({
          name: profile.full_name,
          status: "ok",
          count: activities.length,
        });

        // Wait 2s to respect rate limits between athletes
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        console.error(`Error for ${profile.full_name}:`, err.message);
        await supabase
          .from("profiles")
          .update({
            sync_status: "error",
            sync_error_message: err.message,
          })
          .eq("id", profile.id);
        summary.push({
          name: profile.full_name,
          status: "error",
          error: err.message,
        });
      }
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
