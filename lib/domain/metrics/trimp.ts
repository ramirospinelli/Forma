import { HeartRateZones } from "./types";
import { HrZone, getZoneForHr, getTrimpWeightForZone } from "./zones";

export const FORMULA_VERSION = "1.1.0"; // Incremented for Dynamic Zones

/**
 * Calculates generic 5 HR zones based on Max HR.
 * Legacy support for static models.
 */
export function calculateHrZones(
  athleteMaxHr: number,
  athleteRestHr: number = 0,
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
 * Modern implementation supporting dynamic HrZone array.
 */
export function calculateTimeInDynamicZones(
  heartRateStream: number[],
  zones: HrZone[],
): number[] {
  const times = [0, 0, 0, 0, 0];

  for (const hr of heartRateStream) {
    const zone = getZoneForHr(hr, zones);
    if (zone >= 1 && zone <= 5) {
      times[zone - 1]++;
    }
  }

  return times;
}

/**
 * Legacy support for HeartRateZones type.
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
  }

  return times;
}

/**
 * Flexible TRIMP calculation based on zonal weights.
 */
export function calculateZonalTRIMP(timeInZonesSeconds: number[]): number {
  if (timeInZonesSeconds.length !== 5) {
    throw new Error("timeInZonesSeconds must have exactly 5 elements");
  }

  let totalScore = 0;
  for (let i = 0; i < 5; i++) {
    const zone = i + 1;
    const minutesInZone = timeInZonesSeconds[i] / 60;
    totalScore += minutesInZone * getTrimpWeightForZone(zone);
  }

  return Math.round(totalScore * 10) / 10;
}

/**
 * Legacy Edwards method (fixed weights 1 to 5).
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

  return Math.round(totalScore * 10) / 10;
}

/**
 * Estimates TRIMP (TSS equivalent) without Heart Rate data.
 * Assuming 1 hour at IF = 1.0 yields ~100 TRIMP/TSS.
 * Formula: (Duration_seconds / 3600) * 100 * IF^2
 */
export function estimateTRIMP(
  durationSeconds: number,
  intensityFactor: number,
): number {
  if (intensityFactor <= 0 || durationSeconds <= 0) return 0;

  const hours = durationSeconds / 3600;
  const score = hours * 100 * Math.pow(intensityFactor, 2);

  return Math.round(score * 10) / 10;
}
