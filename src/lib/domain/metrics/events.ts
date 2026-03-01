import { subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Activity } from "../../../lib/types";
import { calculateACWR } from "./load";

export interface EventReadinessContext {
  targetDistanceMeters: number;
  currentCTL: number;
  historicalCTL7DaysAgo: number;
  currentATL: number;
  activities: Activity[]; // All user activities to calc max distance and volume
  eventDate: Date;
  currentDate?: Date; // Defaults to now
}

export interface ReadinessScoreBreakdown {
  accumulationScore: number;
  specificityScore: number;
  consistencyScore: number;
  totalScore: number;
}

export type ReadinessTrend = "positive" | "negative" | "stable";
export type RiskLevel = "underreaching" | "optimal" | "overreaching";
export type ProjectionStatus =
  | "building"
  | "prime"
  | "needs_tapering"
  | "unknown";

// 3.1 Nivel Inicial: Requisitos del Evento
export function getTargetCTL(distanceMeters: number): number {
  const km = distanceMeters / 1000;
  return km * 1.5;
}

export function getTargetLongRunDistance(distanceMeters: number): number {
  return distanceMeters * 0.8;
}

function getMaxDistanceLast30Days(
  activities: Activity[],
  activityType: string,
  refDate: Date,
): number {
  const thirtyDaysAgo = subDays(refDate, 30);
  const relevant = activities.filter(
    (a) =>
      a.type === activityType &&
      new Date(a.start_date) >= thirtyDaysAgo &&
      new Date(a.start_date) <= refDate,
  );

  if (relevant.length === 0) return 0;
  return Math.max(...relevant.map((a) => a.distance));
}

function getConsistencyScore(activities: Activity[], refDate: Date): number {
  // Porcentaje de las últimas 4 semanas donde se superó un mínimo de horas (ej. > 3h/sem o 10800 seg).
  let passedWeeks = 0;
  for (let i = 0; i < 4; i++) {
    const weekStart = startOfWeek(subDays(refDate, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const weekActivities = activities.filter((a) => {
      const d = new Date(a.start_date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });

    const totalSeconds = weekActivities.reduce(
      (acc, curr) => acc + (curr.moving_time || 0),
      0,
    );
    if (totalSeconds >= 10800) {
      // 3 hours
      passedWeeks++;
    }
  }

  return (passedWeeks / 4) * 100;
}

/**
 * 3.2. Estado Actual (Readiness Score: 0 - 100)
 */
export function calculateReadinessScore(
  ctl: number,
  activities: Activity[],
  activityType: string,
  targetDistanceMeters: number,
  refDateInput: Date | string = new Date(),
): ReadinessScoreBreakdown {
  const refDate =
    typeof refDateInput === "string"
      ? new Date(refDateInput + "T00:00:00")
      : refDateInput;
  const ctlTarget = getTargetCTL(targetDistanceMeters);
  const accumulation =
    ctlTarget > 0 ? Math.min((ctl / ctlTarget) * 100, 100) : 100;

  const maxDistObj = getTargetLongRunDistance(targetDistanceMeters);
  const maxDist30d = getMaxDistanceLast30Days(
    activities,
    activityType,
    refDate,
  );
  const specificity =
    maxDistObj > 0 ? Math.min((maxDist30d / maxDistObj) * 100, 100) : 100;

  const consistency = getConsistencyScore(activities, refDate);

  // Weights: 40% Accumulation, 40% Specificity, 20% Consistency
  const accScore = accumulation * 0.4;
  const specScore = specificity * 0.4;
  const consScore = consistency * 0.2;

  const totalScore = Math.round(accScore + specScore + consScore);

  return {
    accumulationScore: accumulation,
    specificityScore: specificity,
    consistencyScore: consistency,
    totalScore,
  };
}

/**
 * 3.3. Tendencia
 */
export function calculateTrend(
  currentScore: number,
  previousScore: number,
): ReadinessTrend {
  const delta = currentScore - previousScore;
  if (delta > 3) return "positive";
  if (delta < -3) return "negative";
  return "stable";
}

/**
 * 3.4. Tiempo Restante (Días calendario)
 */
export function getDaysRemaining(
  eventDateInput: Date | string,
  currentDateInput: Date = new Date(),
): number {
  const eventDate =
    typeof eventDateInput === "string"
      ? (function () {
          const [y, m, d] = eventDateInput.split("-").map(Number);
          return new Date(y, m - 1, d);
        })()
      : new Date(eventDateInput);

  // Normalizar a medianoche local para comparar solo días
  const d1 = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate(),
  );
  const d2 = new Date(
    currentDateInput.getFullYear(),
    currentDateInput.getMonth(),
    currentDateInput.getDate(),
  );

  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * 3.5. Riesgo (Sobrecarga / Pérdida)
 */
export function getRiskLevel(
  currentCTL: number,
  currentATL: number,
): RiskLevel {
  const acwr = calculateACWR(currentATL, currentCTL);
  if (acwr < 0.8) return "underreaching";
  if (acwr > 1.3) return "overreaching";
  return "optimal";
}

/**
 * 3.6. Proyección (Llegar bien)
 */
export function getProjectionStatus(
  eventDate: Date | string,
  currentCTL: number,
  currentATL: number, // Real current ATL
  currentDate: Date = new Date(),
): ProjectionStatus {
  const daysLeft = getDaysRemaining(eventDate, currentDate);
  const currentTSB = currentCTL - currentATL;

  // Fase constructiva (más de 14 días al evento)
  if (daysLeft > 14) {
    if (currentTSB >= -20) return "building";
    return "needs_tapering"; // TSB too low even for building
  }

  // Fase de Tapering (últimos 14 días)
  // Se proyecta el TSB reduciendo el ATL artificialmente al 40% (simula tapering ideal)
  const projectedATL = currentATL * 0.4;
  const projectedTSB = currentCTL - projectedATL;

  if (projectedTSB >= 5 && projectedTSB <= 15) {
    return "prime";
  }

  return "building"; // Catch-all for other tapering states
}
