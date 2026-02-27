import { supabase } from "../supabase";
import {
  ActivityTRIMP,
  DailyLoadProfile,
  FORMULA_VERSION,
  calculateCTL,
  calculateATL,
  calculateTSB,
  calculateFormaLoad,
  calculateMonotony,
  calculateStrain,
  calculateACWR,
  calculateEF,
  calculateIF,
  calculateDynamicZones,
  calculateTimeInDynamicZones,
  calculateZonalTRIMP,
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
        zone_model_type: metrics.zone_model_type,
        zone_model_version: metrics.zone_model_version,
        zone_snapshot: metrics.zone_snapshot,
        intensity_factor: metrics.intensity_factor,
        aerobic_efficiency: metrics.aerobic_efficiency,
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
      acwr: profile.acwr,
      engine_status: profile.engine_status,
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
      const acwr = calculateACWR(newATL, newCTL);

      // Persist day
      const { error } = await supabase.from("daily_load_profile").upsert(
        {
          user_id: userId,
          date: dateStr,
          daily_trimp: dailyTrimp,
          ctl: newCTL,
          atl: newATL,
          tsb: tsb,
          acwr: acwr,
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
  static async syncActivityMetrics(options: {
    userId: string;
    activity_id: string;
    stravaId: number;
    model?: MetricModel;
    skipChainSync?: boolean;
  }) {
    const {
      userId,
      activity_id,
      stravaId,
      model = "edwards",
      skipChainSync = false,
    } = options;
    const token = await getValidStravaToken(userId);
    if (!token) return;

    const streams = await fetchActivityStreams(token, stravaId);

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

    // Placeholder settings. In Phase 3 these will come from User Profile.
    const maxHr = 190;
    const restHr = 55;

    // Get user profile for physiological data
    // 0. Get user profile and thresholds for physiological data
    const thresholds = await this.getUserThresholds(userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("lthr, gender, birth_date")
      .eq("id", userId)
      .single();

    const userGender = profile?.gender || "male";

    // 1. Resolve HR Zones (Priority: Custom > Dynamic Model)
    let zones: any[];
    let zoneType: string;
    let maxHrForForma: number;

    if (thresholds.hr_zones && Array.isArray(thresholds.hr_zones)) {
      zones = thresholds.hr_zones;
      zoneType = "CUSTOM";
      maxHrForForma = zones[zones.length - 1]?.max || 190;
    } else {
      const zoneResult = calculateDynamicZones(profile);
      zones = zoneResult.zones;
      zoneType = zoneResult.type;
      maxHrForForma = zoneResult.estimatedMaxHr;
    }

    let trimp = 0;
    let timeInZones: number[] = [];

    if (model === "forma") {
      // Forma model uses the whole stream and physiological factors
      trimp = calculateFormaLoad(hrStream, {
        maxHr: maxHrForForma,
        restHr: 55,
        gender: userGender as "male" | "female",
      });
      timeInZones = calculateTimeInDynamicZones(hrStream, zones);
    } else {
      // Zonal model (Edwards)
      timeInZones = calculateTimeInDynamicZones(hrStream, zones);
      trimp = calculateZonalTRIMP(timeInZones);
    }

    // Calculate Performance Metrics (EF, IF)
    // thresholds already fetched above

    // Get real activity data for intensity calculation
    const { data: actData } = await supabase
      .from("activities")
      .select("average_speed, type")
      .eq("id", activity_id)
      .single();

    const speed = actData?.average_speed || 0;
    const avgHr =
      hrStream.length > 0
        ? hrStream.reduce((a, b) => a + b, 0) / hrStream.length
        : 0;

    const ef = calculateEF(speed, avgHr);

    // IF Calculation logic:
    // 1. For Run: uses Pace (s/km)
    // 2. For others (Ride, etc): Use Power if available, otherwise fallback to LTHR
    let intensityFactor = 0;
    if (actData?.type === "Run") {
      intensityFactor = calculateIF(
        speed > 0 ? 1000 / speed : 0,
        thresholds.threshold_pace,
        true,
      );
    } else {
      // If we have LTHR, use Heart Rate Intensity
      if (profile?.lthr && avgHr > 0) {
        intensityFactor = avgHr / profile.lthr;
      } else {
        // Absolute fallback to speed/power default
        intensityFactor = calculateIF(
          speed,
          thresholds.threshold_power || 250,
          false,
        );
      }
    }

    await this.saveActivityMetrics({
      activity_id: activity_id,
      trimp_score: trimp,
      hr_zones_time: timeInZones,
      formula_version: `${model}@${FORMULA_VERSION}`,
      zone_model_type: zoneType,
      zone_model_version: 1,
      zone_snapshot: zones, // Stores the exact thresholds used
      intensity_factor: intensityFactor,
      aerobic_efficiency: ef,
      calculated_at: new Date().toISOString(),
    });

    // Find activity date to start the chain sync
    const { data: activity } = await supabase
      .from("activities")
      .select("start_date_local")
      .eq("id", activity_id)
      .single();

    if (activity && !skipChainSync) {
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
  }

  /**
   * Fetches user performance thresholds.
   */
  static async getUserThresholds(userId: string) {
    const { data, error } = await supabase
      .from("user_thresholds")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    // Default values if not set
    return (
      data || {
        threshold_pace: 270, // 4:30/km
        threshold_power: 250,
        ftp: 250,
      }
    );
  }
  /**
   * Recalculates all metrics and loads from scratch for a user.
   * Useful when zones or LTHR are updated.
   * Scoped to the last 6 months for performance.
   */
  static async recomputeFullHistory(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateStr = sixMonthsAgo.toISOString().split("T")[0];

    // 1. Get activities from the last 6 months with heart rate
    const { data: activities, error } = await supabase
      .from("activities")
      .select("id, strava_id, start_date_local")
      .eq("user_id", userId)
      .gte("start_date_local", dateStr)
      .not("average_heartrate", "is", null)
      .order("start_date_local", { ascending: true });

    if (error) throw error;
    if (!activities || activities.length === 0) return;

    // 2. Iterate and sync metrics for each (silently, without chain sync)
    for (const act of activities) {
      try {
        await this.syncActivityMetrics({
          userId,
          stravaId: act.strava_id,
          activity_id: act.id,
          model: "forma",
          skipChainSync: true,
        });
        // Respect Strava/DB rate limits
        await new Promise((r) => setTimeout(r, 250));
      } catch (e) {
        console.error(`Error backfilling activity ${act.id}:`, e);
      }
    }

    // 3. One final global chain sync from the beginning
    const firstDate = activities[0].start_date_local.split("T")[0];
    await this.syncLoadChain(userId, firstDate);
    await this.syncWeeklyMetrics(userId);
  }
}
