import {
  calculateCTL,
  calculateATL,
  calculateTSB,
  calculateACWR,
} from "../domain/metrics/load";
import { DailyLoadProfile } from "../domain/metrics/types";

/**
 * Simulates the trajectory of CTL, ATL, and TSB for the next 7 days.
 * Assumes a cumulative TRIMP of 0 for future days (full rest).
 */
export function projectTSB(
  currentProfile: DailyLoadProfile,
  daysToProject: number = 7,
): DailyLoadProfile[] {
  const projections: DailyLoadProfile[] = [];
  let lastCTL = currentProfile.ctl;
  let lastATL = currentProfile.atl;
  let lastDate = new Date(currentProfile.date);

  for (let i = 1; i <= daysToProject; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + 1);
    const dateStr = nextDate.toISOString().split("T")[0];

    // Simulate day with 0 TRIMP (Rest)
    const newCTL = calculateCTL(0, lastCTL);
    const newATL = calculateATL(0, lastATL);
    const newTSB = calculateTSB(newCTL, newATL);
    const newACWR = calculateACWR(newATL, newCTL);

    const projectedDay: DailyLoadProfile = {
      user_id: currentProfile.user_id,
      date: dateStr,
      daily_trimp: 0,
      ctl: newCTL,
      atl: newATL,
      tsb: newTSB,
      acwr: newACWR,
      formula_version: currentProfile.formula_version,
      calculated_at: new Date().toISOString(),
    };

    projections.push(projectedDay);

    // Update for next iteration
    lastCTL = newCTL;
    lastATL = newATL;
    lastDate = nextDate;
  }

  return projections;
}

/**
 * Finds the "Peak Day" in a projection (highest TSB).
 */
export function findPeakDay(projections: DailyLoadProfile[]): DailyLoadProfile {
  return [...projections].sort((a, b) => b.tsb - a.tsb)[0];
}
