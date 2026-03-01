import { Activity } from "../types";
import { supabase } from "../supabase";

export class ThresholdEstimatorService {
  /**
   * Analyzes an activity to detect a possible new LTHR.
   * Based on the Joe Friel / TrainingPeaks principle:
   * Estimated LTHR = 95% to 100% of a sustained hard effort (>20 mins).
   */
  static async detectNewLthr(userId: string, activity: Activity) {
    if (activity.type !== "Run" && activity.type !== "Ride") return null;
    if (!activity.average_heartrate || activity.moving_time < 1200) return null;

    // Fetch current user LTHR from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("lthr")
      .eq("id", userId)
      .single();

    const currentLthr = profile?.lthr || 0;
    const avgHr = activity.average_heartrate;
    const durationMins = activity.moving_time / 60;

    let estimated = 0;

    // Heuristic for sustained threshold effort
    if (durationMins >= 20 && durationMins < 30) {
      estimated = Math.round(avgHr * 0.95);
    } else if (durationMins >= 30 && durationMins <= 60) {
      estimated = Math.round(avgHr * 0.98);
    } else if (durationMins > 60) {
      estimated = Math.round(avgHr * 1.0); // For >1h at this HR, it's definitely LTHR or above
    }

    // Only suggest if it's a significant improvement (at least 1 bpm higher)
    // We don't want to suggest LOWERING it automatically as LTHR rarely drops quickly
    if (estimated > currentLthr && estimated > 0) {
      console.log(
        `[ThresholdEstimator] Possible new LTHR detected for ${userId}: ${estimated} bpm`,
      );

      await supabase
        .from("profiles")
        .update({
          suggested_lthr: estimated,
          suggested_lthr_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return estimated;
    }

    return null;
  }
}
