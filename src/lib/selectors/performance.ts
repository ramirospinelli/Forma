import {
  IntensityClassification,
  classifyIntensity,
} from "../domain/metrics/performance";

/**
 * Maps ACWR value to a risk status and color.
 */
export const getACWRStatus = (acwr: number) => {
  if (acwr < 0.8) return { label: "Detraining", color: "#9B9BB4", risk: "low" };
  if (acwr <= 1.3) return { label: "Optimal", color: "#4CAF7D", risk: "none" };
  if (acwr <= 1.5)
    return { label: "Caution", color: "#FFB347", risk: "moderate" };
  return { label: "High Risk", color: "#FF5757", risk: "high" };
};

/**
 * Calculates efficiency trend percentage.
 */
export const calculateEfficiencyTrend = (
  currentEf: number,
  previousEf: number,
) => {
  if (!previousEf || previousEf === 0) return 0;
  return ((currentEf - previousEf) / previousEf) * 100;
};

/**
 * Selectors for Intensity Factor UI labels and colors.
 */
export const getIFLabel = (ifValue: number) => {
  const classification = classifyIntensity(ifValue);
  const colors: Record<IntensityClassification, string> = {
    Recovery: "#4ECDC4",
    Endurance: "#4CAF7D",
    Tempo: "#FFD93D",
    Threshold: "#FF6B35",
    VO2Max: "#FF5757",
    Anaerobic: "#C77DFF",
  };

  return {
    label: classification,
    color: colors[classification],
  };
};
