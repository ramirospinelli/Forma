/**
 * Forma Load - Proprietary Metric
 * Based on Banister's original TRIMP but using a continuous exponential function
 * to avoid "zone jumping" discretization errors and better reflect high-intensity strain.
 *
 * Formula: Load = sum(delta_t * %HRR * 0.64 * e^(1.92 * %HRR))
 */

export interface FormaLoadConfig {
  maxHr: number;
  restHr: number;
  gender: "male" | "female";
}

export function calculateFormaLoad(
  hrStream: number[],
  config: FormaLoadConfig,
  timeStream?: number[], // Optional time stream for accurate deltas
): number {
  const { maxHr, restHr, gender } = config;
  const hrRange = maxHr - restHr;

  if (hrRange <= 0 || hrStream.length === 0) return 0;

  // Coefficient b: 1.92 for males, 1.67 for females (standard Banister)
  const b = gender === "male" ? 1.92 : 1.67;

  let totalLoad = 0;

  // If no timeStream or mismatch, assume generic 1Hz
  if (!timeStream || timeStream.length !== hrStream.length) {
    for (const hr of hrStream) {
      if (hr < restHr) continue;
      const x = (hr - restHr) / hrRange;
      const sampleLoad = (x * 0.64 * Math.exp(b * x)) / 60; // Normalize to minutes
      totalLoad += sampleLoad;
    }
  } else {
    // Correct way: use time deltas
    for (let i = 0; i < hrStream.length - 1; i++) {
      const hr = hrStream[i];
      if (hr < restHr) continue;

      const delta = timeStream[i + 1] - timeStream[i];
      if (delta <= 0 || delta > 30) continue; // Skip pauses or non-monotonic time

      const x = (hr - restHr) / hrRange;
      // Load per second * delta seconds, then divide by 60 for minute-based TRIMP scale
      const increment = (x * 0.64 * Math.exp(b * x) * delta) / 60;
      totalLoad += increment;
    }
  }

  return totalLoad;
}
