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
): number {
  const { maxHr, restHr, gender } = config;
  const hrRange = maxHr - restHr;

  if (hrRange <= 0) return 0;

  // Coefficient b: 1.92 for males, 1.67 for females (standard Banister)
  const b = gender === "male" ? 1.92 : 1.67;

  let totalLoad = 0;

  // Assuming 1Hz stream for now
  for (const hr of hrStream) {
    if (hr < restHr) continue;

    // Intensity Factor (Fractional HR Reserve)
    const x = (hr - restHr) / hrRange;

    // Banister Continuous TRIMP formula (per second)
    const sampleLoad = (x * 0.64 * Math.exp(b * x)) / 60; // Normalize to minutes to stay on similar scale to TRIMP

    totalLoad += sampleLoad;
  }

  return totalLoad;
}
