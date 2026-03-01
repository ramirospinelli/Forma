import {
  calculateCTL,
  calculateATL,
  calculateTSB,
  calculateACWR,
} from "../domain/metrics/load";
import { parseDateOnly } from "../utils";
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

  // Usar parseDateOnly para asegurar que empezamos en medianoche local
  const baseDate =
    typeof currentProfile.date === "string"
      ? parseDateOnly(currentProfile.date)
      : new Date(currentProfile.date);

  for (let i = 1; i <= daysToProject; i++) {
    // Avance por calendario local (getFullYear/getMonth/getDate)
    const nextDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() + i,
    );
    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;

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
  }

  return projections;
}

/**
 * Finds the "Peak Day" in a projection (highest TSB).
 */
export function findPeakDay(projections: DailyLoadProfile[]): DailyLoadProfile {
  // Sort by TSB descending, and by date descending if TSB is equal
  return [...projections].sort((a, b) => {
    if (b.tsb !== a.tsb) return b.tsb - a.tsb;
    return b.date.localeCompare(a.date);
  })[0];
}
