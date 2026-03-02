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
  | "Recuperación"
  | "Resistencia"
  | "Tempo"
  | "Umbral"
  | "VO2 Máx"
  | "Anaeróbico";

export function classifyIntensity(ifValue: number): IntensityClassification {
  if (ifValue < 0.75) return "Recuperación";
  if (ifValue < 0.85) return "Resistencia";
  if (ifValue < 0.95) return "Tempo";
  if (ifValue < 1.05) return "Umbral";
  if (ifValue < 1.2) return "VO2 Máx";
  return "Anaeróbico";
}

/**
 * Classifies an athlete's rank based on their CTL (Fitness).
 * CTL reflects consistent load over 42 days.
 */
export type AthleteRank = {
  name: string;
  minCTL: number;
  maxCTL: number;
  description: string;
  color: string;
};

const ATHLETE_RANKS: AthleteRank[] = [
  {
    name: "Iniciado",
    minCTL: 0,
    maxCTL: 20,
    description: "Estás construyendo el hábito y despertando tu motor.",
    color: "#A0A0B0",
  },
  {
    name: "Activo",
    minCTL: 20,
    maxCTL: 45,
    description: "Atleta regular con una base establecida.",
    color: "#4CAF7D",
  },
  {
    name: "Comprometido",
    minCTL: 45,
    maxCTL: 70,
    description: "Entrenamiento serio con buena capacidad aeróbica.",
    color: "#45B7D1",
  },
  {
    name: "Avanzado",
    minCTL: 70,
    maxCTL: 95,
    description: "Alto rendimiento. Tu motor está muy por encima de la media.",
    color: "#FF9234",
  },
  {
    name: "Élite",
    minCTL: 95,
    maxCTL: 250,
    description: "Nivel profesional. Capacidad física excepcional.",
    color: "#C77DFF",
  },
];

export function classifyAthleteRank(ctl: number): AthleteRank {
  return (
    ATHLETE_RANKS.find((r) => ctl < r.maxCTL) ||
    ATHLETE_RANKS[ATHLETE_RANKS.length - 1]
  );
}
