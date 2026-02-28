export const WEEKLY_METRICS_VERSION = "1.0.0";

/**
 * Calculates Training Monotony over a 7-day period.
 * Formula: Weekly Average Load / Standard Deviation of Daily Loads.
 * If Standard Deviation is 0, monotony defaults to 0 to avoid division by zero.
 *
 * @param dailyLoads Array of 7 numbers representing daily TRIMP/Load scores.
 */
export function calculateMonotony(dailyLoads: number[]): number {
  if (dailyLoads.length === 0) return 0;

  const n = dailyLoads.length;
  const sum = dailyLoads.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  if (mean === 0) return 0; // No training done

  // Calculate Variance
  const variance =
    dailyLoads.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // If stdDev is 0 (identical load every day), monotony is conceptually infinite.
  // We cap it at 2.0 (High Monotony indicator) for safety.
  if (stdDev === 0) {
    return 2.0;
  }

  return mean / stdDev;
}

/**
 * Calculates Training Strain.
 * Formula: Total Weekly Load * Training Monotony.
 *
 * High strain implies high volume coupled with lack of variance (high monotony).
 */
export function calculateStrain(
  totalWeeklyLoad: number,
  monotony: number,
): number {
  return totalWeeklyLoad * monotony;
}
