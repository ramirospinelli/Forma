/**
 * Performance-specific metrics like Efficiency Factor and Intensity Factor.
 */

/**
 * Calculates Aerobic Efficiency (EF).
 * Formula: Output (avg speed in m/s or power in watts) / Avg Heart Rate
 *
 * We use m/s for running and cycling if powermeter is missing.
 */
export function calculateEF(output: number, avgHr: number): number {
  if (!output || !avgHr || avgHr === 0) return 0;
  return output / avgHr;
}

/**
 * Calculates Intensity Factor (IF).
 * Formula: Normalized Output / Threshold Output
 *
 * If running: Normalized Pace (s/km) / Threshold Pace (s/km)
 * (Actually for pace it's Threshold / Normalized as lower = faster)
 */
export function calculateIF(
  output: number,
  threshold: number,
  isPace: boolean = false,
): number {
  if (!output || !threshold || threshold === 0) return 0;

  if (isPace) {
    // For pace: 4:00/km (240s) vs 4:30/km (270s)
    // IF = 240 / 270 = 0.88
    return threshold / output;
  }

  // For power/speed: 250w / 200w = 1.25
  return output / threshold;
}

/**
 * Classifies intensity based on IF.
 */
export type IntensityClassification =
  | "Recovery"
  | "Endurance"
  | "Tempo"
  | "Threshold"
  | "VO2Max"
  | "Anaerobic";

export function classifyIntensity(ifValue: number): IntensityClassification {
  if (ifValue < 0.75) return "Recovery";
  if (ifValue < 0.85) return "Endurance";
  if (ifValue < 0.95) return "Tempo";
  if (ifValue < 1.05) return "Threshold";
  if (ifValue < 1.2) return "VO2Max";
  return "Anaerobic";
}
