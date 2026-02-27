import { DailyLoadProfile, WeeklyLoadProfile, TrainingSnapshot } from "./types";

/**
 * Generates a standard Training Snapshot object.
 * This object is fully decoupled from the UI and serves as a
 * structured payload for future AI analysis or external services.
 *
 * @param currentProfile The athlete's daily profile (CTL, ATL, TSB today).
 * @param recentWeek The athlete's weekly profile (Total TRIMP, Monotony, Strain).
 * @param nextWorkouts Array of upcoming planned workouts.
 */
export function generateTrainingSnapshot(
  currentProfile: DailyLoadProfile,
  recentWeek: WeeklyLoadProfile,
  nextWorkouts: any[],
): TrainingSnapshot {
  return {
    currentProfile,
    recentWeek,
    nextWorkouts,
    generated_at: new Date().toISOString(),
  };
}
