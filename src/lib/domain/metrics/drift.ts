export interface DriftResult {
  detected: boolean;
  severity: "none" | "mild" | "moderate" | "severe";
  efStart: number;
  efEnd: number;
  dropPct: number;
  label: string;
}

/**
 * Detects cardiac drift from raw HR + velocity streams.
 *
 * Algorithm:
 * 1. Pair each sample: EF(t) = velocity[t] / heartrate[t]
 * 2. Split samples into first half vs second half
 * 3. Compare average EF of each half
 * 4. If second half EF drops significantly → drift detected
 *
 * Requirements:
 * - Both arrays must have the same length (sampled at the same timestamps)
 * - At least 60 samples (≈ 1 min at 1Hz)
 * - Average HR must be > 0
 */
export function detectCardiacDrift(
  hrStream: number[],
  velocityStream: number[],
): DriftResult {
  const NO_DRIFT: DriftResult = {
    detected: false,
    severity: "none",
    efStart: 0,
    efEnd: 0,
    dropPct: 0,
    label: "Sin drift detectado",
  };

  if (
    !hrStream ||
    !velocityStream ||
    hrStream.length < 60 ||
    hrStream.length !== velocityStream.length
  ) {
    return NO_DRIFT;
  }

  // Build EF series, filter out invalid samples (pause, zero HR, zero speed)
  const efs: number[] = [];
  for (let i = 0; i < hrStream.length; i++) {
    const hr = hrStream[i];
    const v = velocityStream[i];
    if (hr > 40 && v > 0.5) {
      efs.push(v / hr);
    }
  }

  if (efs.length < 40) return NO_DRIFT;

  const mid = Math.floor(efs.length / 2);
  const firstHalf = efs.slice(0, mid);
  const secondHalf = efs.slice(mid);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const efStart = avg(firstHalf);
  const efEnd = avg(secondHalf);

  if (efStart === 0) return NO_DRIFT;

  const dropPct = ((efStart - efEnd) / efStart) * 100;

  if (dropPct < 2) {
    return { ...NO_DRIFT, efStart, efEnd, dropPct };
  }

  let severity: DriftResult["severity"];
  let label: string;

  if (dropPct < 5) {
    severity = "mild";
    label = "Drift leve";
  } else if (dropPct < 10) {
    severity = "moderate";
    label = "Drift moderado";
  } else {
    severity = "severe";
    label = "Drift severo";
  }

  return { detected: true, severity, efStart, efEnd, dropPct, label };
}
