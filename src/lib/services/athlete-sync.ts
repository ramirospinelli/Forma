import { supabase } from "../supabase";
import { syncRecentActivities } from "../strava";

export class AthleteSyncService {
  /**
   * Identifies athletes who need a background sync and orchestrates the process
   * respecting Strava rate limits.
   *
   * Logic:
   * 1. Fetch athletes that are not currently syncing.
   * 2. Sort by last_sync_at (oldest first).
   * 3. Sync each one with a safety delay.
   */
  static async syncAllAthletes() {
    console.log("[AthleteSyncService] Starting global background sync...");

    // 1. Fetch profiles with Strava connected, not currently in error or syncing
    // We also sync 'error' profiles after a while, but for now just idle ones.
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, last_sync_at")
      .not("strava_access_token", "is", null)
      .neq("sync_status", "syncing")
      .order("last_sync_at", { ascending: true, nullsFirst: true });

    if (error) {
      console.error("[AthleteSyncService] Error fetching athletes:", error);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log("[AthleteSyncService] No athletes need sync.");
      return;
    }

    console.log(
      `[AthleteSyncService] Found ${profiles.length} athletes to process.`,
    );

    for (const profile of profiles) {
      try {
        console.log(
          `[AthleteSyncService] Syncing athlete: ${profile.full_name || profile.id}...`,
        );

        // Orchestrate the incremental sync for this specific athlete
        const syncedCount = await syncRecentActivities(profile.id);

        console.log(
          `[AthleteSyncService] Finished ${profile.full_name}. Synced ${syncedCount} activities.`,
        );

        // 2-second delay between athletes to prevent bursting Strava and our DB
        // Also helps stay within the 100 req / 15 min limit (4 athletes/min = 60/15min)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(
          `[AthleteSyncService] Critical failure syncing athlete ${profile.id}:`,
          err,
        );
        // Continue with next athlete
      }
    }

    console.log("[AthleteSyncService] Global background sync completed.");
  }
}
