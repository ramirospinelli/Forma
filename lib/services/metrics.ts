import { supabase } from "../supabase";
import {
  ActivityTRIMP,
  DailyLoadProfile,
  FORMULA_VERSION,
  calculateCTL,
  calculateATL,
  calculateTSB,
  calculateHrZones,
  calculateTimeInZones,
  calculateEdwardsTRIMP,
  calculateFormaLoad,
  calculateMonotony,
  calculateStrain,
} from "../domain/metrics";
import { getValidStravaToken, fetchActivityStreams } from "./strava-api";

export type MetricModel = "edwards" | "forma";

export class MetricPersistenceService {
  /**
   * Saves calculated TRIMP for a specific activity.
   */
  static async saveActivityMetrics(
    metrics: ActivityTRIMP & { hr_zones_time: number[] },
  ) {
    const { error } = await supabase.from("activity_metrics").upsert(
      {
        activity_id: metrics.activity_id,
        trimp_score: metrics.trimp_score,
        hr_zones_time: metrics.hr_zones_time,
        formula_version: metrics.formula_version,
      },
      { onConflict: "activity_id" },
    );

    if (error) {
      console.error(
        `Error saving activity metrics for ${metrics.activity_id}:`,
        error.message,
      );
      throw error;
    }
    console.log(
      `Successfully saved activity metrics for ${metrics.activity_id}`,
    );
  }

  /**
   * Fetches the load profile for the day before a given date.
   */
  static async getPreviousDayProfile(
    userId: string,
    date: string,
  ): Promise<DailyLoadProfile | null> {
    const { data, error } = await supabase
      .from("daily_load_profile")
      .select("*")
      .eq("user_id", userId)
      .lt("date", date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Saves or updates a daily load snapshot.
   */
  static async saveDailyLoadProfile(profile: DailyLoadProfile) {
    const { error } = await supabase.from("daily_load_profile").upsert({
      user_id: profile.user_id,
      date: profile.date,
      daily_trimp: profile.daily_trimp,
      ctl: profile.ctl,
      atl: profile.atl,
      tsb: profile.tsb,
      formula_version: profile.formula_version,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  /**
   * Calculates and persists the daily load curve starting from a specific date.
   * This is the "Engine" that maintains the temporal chain.
   */
  static async syncLoadChain(userId: string, startDate: string) {
    const today = new Date().toISOString().split("T")[0];

    // 1. Get the starting point (yesterday's final state before startDate)
    let lastProfile = await this.getPreviousDayProfile(userId, startDate);
    let currentCTL = lastProfile?.ctl || 0;
    let currentATL = lastProfile?.atl || 0;

    // 2. Fetch all daily TRIMP sums from database
    const { data: dailyActivities, error } = await supabase
      .from("activity_metrics")
      .select(
        `
        trimp_score,
        activities!inner(start_date_local, user_id)
      `,
      )
      .eq("activities.user_id", userId)
      .gte("activities.start_date_local", startDate)
      .order("start_date_local", {
        referencedTable: "activities",
        ascending: true,
      });

    if (error) throw error;

    // Group TRIMP by date
    const trimpByDate: Record<string, number> = {};
    dailyActivities?.forEach((row: any) => {
      const date = row.activities.start_date_local.split("T")[0];
      trimpByDate[date] = (trimpByDate[date] || 0) + row.trimp_score;
    });

    // 3. Iterate sequentially from startDate to Today
    let iterDate = new Date(startDate);
    const endDate = new Date(today);

    while (iterDate <= endDate) {
      const dateStr = iterDate.toISOString().split("T")[0];
      const dailyTrimp = trimpByDate[dateStr] || 0;

      // Calculate new smoothed values
      const newCTL = calculateCTL(dailyTrimp, currentCTL);
      const newATL = calculateATL(dailyTrimp, currentATL);
      const tsb = calculateTSB(currentCTL, currentATL);

      // Persist day
      const { error } = await supabase.from("daily_load_profile").upsert(
        {
          user_id: userId,
          date: dateStr,
          daily_trimp: dailyTrimp,
          ctl: newCTL,
          atl: newATL,
          tsb: tsb,
          formula_version: FORMULA_VERSION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" },
      );

      if (error) {
        console.error(
          `Error saving daily load profile for ${dateStr}:`,
          error.message,
        );
        throw error;
      }
      console.log(
        `Saved daily load profile for ${dateStr}: CTL=${newCTL.toFixed(1)}`,
      );

      // Update for next iteration
      currentCTL = newCTL;
      currentATL = newATL;
      iterDate.setDate(iterDate.getDate() + 1);
    }
  }

  /**
   * Orchestrates the sync for a single activity:
   * 1. Fetch HR Stream
   * 2. Calculate TRIMP
   * 3. Save activity metrics
   * 4. Trigger chain recalculation
   */
  static async syncActivityMetrics(
    userId: string,
    activity_id: string,
    stravaId: number,
    model: MetricModel = "edwards",
  ) {
    const token = await getValidStravaToken(userId);
    if (!token) return;

    const streams = await fetchActivityStreams(token, stravaId);
    console.log(
      `Fetched streams for activity ${stravaId}:`,
      typeof streams,
      Array.isArray(streams) ? "is array" : "is not array",
    );

    // Support both formats: Array from key_by_type=false and Object from key_by_type=true
    let hrStream: number[] | undefined;
    if (Array.isArray(streams)) {
      hrStream = streams.find((s) => s.type === "heartrate")?.data;
    } else if (streams && typeof streams === "object") {
      hrStream = (streams as any).heartrate?.data;
    }

    if (!hrStream) {
      console.warn(`No heartrate data found for activity ${stravaId}`);
      return;
    }
    console.log(`Heartrate stream size: ${hrStream.length}`);

    // Placeholder settings. In Phase 3 these will come from User Profile.
    const maxHr = 190;
    const restHr = 55;
    const gender = "male";

    let trimp = 0;
    let timeInZones: number[] = [];

    if (model === "forma") {
      trimp = calculateFormaLoad(hrStream, { maxHr, restHr, gender });
      const zones = calculateHrZones(maxHr);
      timeInZones = calculateTimeInZones(hrStream, zones);
    } else {
      const zones = calculateHrZones(maxHr);
      timeInZones = calculateTimeInZones(hrStream, zones);
      trimp = calculateEdwardsTRIMP(timeInZones);
    }

    await this.saveActivityMetrics({
      activity_id: activity_id,
      trimp_score: trimp,
      hr_zones_time: timeInZones,
      formula_version: `${model}@${FORMULA_VERSION}`,
      calculated_at: new Date().toISOString(),
    });

    // Find activity date to start the chain sync
    const { data: activity } = await supabase
      .from("activities")
      .select("start_date_local")
      .eq("id", activity_id)
      .single();

    if (activity) {
      await this.syncLoadChain(userId, activity.start_date_local.split("T")[0]);
      await this.syncWeeklyMetrics(userId);
    }
  }

  /**
   * Aggregates daily TRIMP into weeks and calculates Monotony and Strain.
   */
  static async syncWeeklyMetrics(userId: string) {
    // 1. Fetch all daily TRIMP scores
    const { data: dailyData, error } = await supabase
      .from("daily_load_profile")
      .select("date, daily_trimp")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (error) throw error;
    if (!dailyData || dailyData.length === 0) return;

    // 2. Group by week (Monday to Sunday)
    const weeks: Record<string, number[]> = {};

    dailyData.forEach((day) => {
      const date = new Date(day.date);
      // Adjust to Monday of that week
      const dayDiff = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const monday = new Date(date);
      monday.setDate(date.getDate() - dayDiff);
      const weekKey = monday.toISOString().split("T")[0];

      if (!weeks[weekKey]) weeks[weekKey] = new Array(7).fill(0);
      const index = date.getDay() === 0 ? 6 : date.getDay() - 1;
      weeks[weekKey][index] = day.daily_trimp;
    });

    // 3. Calculate and save each week
    for (const [weekStart, dailyLoads] of Object.entries(weeks)) {
      const totalTrimp = dailyLoads.reduce((a, b) => a + b, 0);
      const monotony = calculateMonotony(dailyLoads);
      const strain = calculateStrain(totalTrimp, monotony);

      await supabase.from("weekly_load_metrics").upsert(
        {
          user_id: userId,
          week_start_date: weekStart,
          total_trimp: totalTrimp,
          monotony: monotony,
          strain: strain,
          formula_version: FORMULA_VERSION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start_date" },
      );
    }
    console.log(`Successfully synced weekly metrics for user ${userId}`);
  }
}
