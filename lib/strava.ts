import { supabase } from "../lib/supabase";
import { StravaActivity } from "../lib/types";
import { MetricPersistenceService } from "./services/metrics";
import {
  fetchStravaActivities,
  getValidStravaToken,
  exchangeStravaCode,
  refreshStravaToken,
} from "./services/strava-api";

export {
  exchangeStravaCode,
  refreshStravaToken,
  getValidStravaToken,
  fetchStravaActivities,
};

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

  // Limit to last 6 months to optimize and avoid rate limits
  const sixMonthsAgo = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 60 * 60;

  let page = 1;
  let totalSynced = 0;
  let hasMore = true;
  const allSyncedActivities: StravaActivity[] = [];

  while (hasMore) {
    const activities = await fetchStravaActivities(
      token,
      page,
      50,
      sixMonthsAgo,
    );
    if (activities.length === 0) {
      hasMore = false;
    } else {
      await syncActivitiesToSupabase(userId, activities);
      allSyncedActivities.push(...activities);
      totalSynced += activities.length;
      page++;
      if (activities.length < 50) hasMore = false;
    }
  }

  // After all activities are synced, calculate metrics
  // Sorting by date to ensure the load chain builds correctly
  const sortedActivities = allSyncedActivities.sort(
    (a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
  );

  for (const activity of sortedActivities) {
    const { data: dbActivity } = await supabase
      .from("activities")
      .select("id")
      .eq("strava_id", activity.id)
      .single();

    if (dbActivity) {
      try {
        // Use proprietary Forma model as the default now
        // skipChainSync: true to avoid redundant recalculations in batch
        await MetricPersistenceService.syncActivityMetrics({
          userId,
          activity_id: dbActivity.id,
          stravaId: activity.id,
          model: "forma",
          skipChainSync: true,
        });
        // Rate limit safety: Strava allows 100 requests per 15 mins.
        // We add a small delay to avoid hitting short-term limits too fast
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        console.error(
          `Error calculating metrics for activity ${activity.id}:`,
          err,
        );
        // Continue with next instead of crashing the whole batch
      }
    } else {
      console.warn(
        `Activity ${activity.id} not found in DB during metrics calc`,
      );
    }
  }

  // Final trigger for chain sync after bulk metrics calculation
  if (sortedActivities.length > 0) {
    const firstDate = sortedActivities[0].start_date_local.split("T")[0];
    await MetricPersistenceService.syncLoadChain(userId, firstDate);
  }

  // Final trigger for weekly metrics after bulk sync
  await MetricPersistenceService.syncWeeklyMetrics(userId);

  return totalSynced;
}

// ─── Incremental sync (last 30 activities) ────────────────────────────────────

export async function syncRecentActivities(userId: string): Promise<number> {
  const token = await getValidStravaToken(userId);
  if (!token) throw new Error("No Strava token available");

  // 1. Fetch recent activities from Strava
  const activities = await fetchStravaActivities(token, 1, 30);

  if (activities.length === 0) return 0;

  // 2. See which ones we ALREADY have to avoid duplicate work
  const stravaIds = activities.map((a) => a.id);
  const { data: existingActivities } = await supabase
    .from("activities")
    .select("strava_id")
    .in("strava_id", stravaIds);

  const existingIds = new Set(
    existingActivities?.map((a) => a.strava_id) || [],
  );

  // Filter only the NEW activities
  const newActivities = activities.filter((a) => !existingIds.has(a.id));

  if (newActivities.length === 0) {
    console.log(
      "[SYNC] No new activities found. Skipping metrics recalculation.",
    );
    return 0; // Nothing to do!
  }

  // 3. Save only new activities to Supabase
  await syncActivitiesToSupabase(userId, newActivities);

  // Sorting to maintain chain integrity (oldest first)
  const sortedActivities = newActivities.sort(
    (a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
  );

  for (const activity of sortedActivities) {
    const { data: dbActivity } = await supabase
      .from("activities")
      .select("id")
      .eq("strava_id", activity.id)
      .single();

    if (dbActivity) {
      await MetricPersistenceService.syncActivityMetrics({
        userId,
        activity_id: dbActivity.id,
        stravaId: activity.id,
        model: "forma",
        skipChainSync: true,
      });
    }
  }

  // Final trigger for chain and weekly sync after bulk metrics update
  if (sortedActivities.length > 0) {
    const firstDate = sortedActivities[0].start_date_local.split("T")[0];
    await MetricPersistenceService.syncLoadChain(userId, firstDate);
    await MetricPersistenceService.syncWeeklyMetrics(userId);
  }

  return activities.length;
}
