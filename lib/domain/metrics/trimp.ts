import { HeartRateZones } from "./types";

export const FORMULA_VERSION = "1.0.0";

/**
 * Calculates generic 5 HR zones based on Max HR.
 * Formula (Karvonen or simple % MaxHR). Using simple % MaxHR for now.
 * Z1: 50-60%
 * Z2: 60-70%
 * Z3: 70-80%
 * Z4: 80-90%
 * Z5: 90-100%
 */
export function calculateHrZones(
  athleteMaxHr: number,
  athleteRestHr: number = 0, // Keeping for future Karvonen implementations
): HeartRateZones {
  return {
    z1_min: Math.round(athleteMaxHr * 0.5),
    z1_max: Math.round(athleteMaxHr * 0.6) - 1,
    z2_min: Math.round(athleteMaxHr * 0.6),
    z2_max: Math.round(athleteMaxHr * 0.7) - 1,
    z3_min: Math.round(athleteMaxHr * 0.7),
    z3_max: Math.round(athleteMaxHr * 0.8) - 1,
    z4_min: Math.round(athleteMaxHr * 0.8),
    z4_max: Math.round(athleteMaxHr * 0.9) - 1,
    z5_min: Math.round(athleteMaxHr * 0.9),
    z5_max: athleteMaxHr,
  };
}

/**
 * Processes an array of heart rate readings (1 sample per second assumed)
 * and returns the time spent in each zone (in seconds).
 * Array index 0 = Z1, 1 = Z2, ..., 4 = Z5.
 */
export function calculateTimeInZones(
  heartRateStream: number[],
  zones: HeartRateZones,
): number[] {
  const times = [0, 0, 0, 0, 0];

  for (const hr of heartRateStream) {
    if (hr >= zones.z5_min) times[4]++;
    else if (hr >= zones.z4_min) times[3]++;
    else if (hr >= zones.z3_min) times[2]++;
    else if (hr >= zones.z2_min) times[1]++;
    else if (hr >= zones.z1_min) times[0]++;
    // values below Z1 are ignored for TRIMP
  }

  return times;
}

/**
 * Calculates TRIMP based on Edwards method.
 * Z1 time * 1 + Z2 time * 2 + Z3 time * 3 + Z4 time * 4 + Z5 time * 5
 * Division by 60 converts seconds to minutes for the final score.
 *
 * @param timeInZonesSeconds Array of exactly 5 numbers representing seconds in zones 1 to 5.
 */
export function calculateEdwardsTRIMP(timeInZonesSeconds: number[]): number {
  if (timeInZonesSeconds.length !== 5) {
    throw new Error("timeInZonesSeconds must have exactly 5 elements");
  }

  const multipliers = [1, 2, 3, 4, 5];
  let totalScore = 0;

  for (let i = 0; i < 5; i++) {
    const minutesInZone = timeInZonesSeconds[i] / 60;
    totalScore += minutesInZone * multipliers[i];
  }

  return Math.round(totalScore * 10) / 10; // Round to 1 decimal place
}
