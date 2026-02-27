export type RiskLevel =
  | "optimal"
  | "transition"
  | "fresh"
  | "overload"
  | "danger";

export interface RiskStatus {
  level: RiskLevel;
  label: string;
  color: string;
  interpretation: string;
}

/**
 * TSB (Form) Interpretation
 */
export const getTsbStatus = (tsb: number): RiskStatus => {
  if (tsb > 20)
    return {
      level: "fresh",
      label: "Pérdida de Forma",
      color: "#4ECDC4",
      interpretation:
        "Demasiado descanso. Estás perdiendo adaptaciones fisiológicas.",
    };
  if (tsb > 5)
    return {
      level: "fresh",
      label: "Fresco",
      color: "#7FB069",
      interpretation:
        "Listo para competir o realizar un test de máxima intensidad.",
    };
  if (tsb >= -10)
    return {
      level: "transition",
      label: "Transición",
      color: "#E6E6E6",
      interpretation: "Mantenimiento o recuperación activa.",
    };
  if (tsb >= -30)
    return {
      level: "optimal",
      label: "Óptimo",
      color: "#F4D35E",
      interpretation:
        "La zona ideal de entrenamiento para mejora cardiovascular.",
    };
  return {
    level: "overload",
    label: "Sobrecarga",
    color: "#EE5D5D",
    interpretation:
      "Riesgo alto de lesión o sobreentrenamiento. Considera descanso.",
  };
};

/**
 * ACR (Acute:Chronic Workload Ratio) Interpretation
 */
export const getAcrStatus = (atl: number, ctl: number): RiskStatus => {
  const ratio = ctl > 0 ? atl / ctl : 0;
  if (ratio < 0.8)
    return {
      level: "transition",
      label: "Sub-entrenamiento",
      color: "#E6E6E6",
      interpretation: "La carga actual es insuficiente para mantener el nivel.",
    };
  if (ratio <= 1.3)
    return {
      level: "optimal",
      label: "Zona Segura",
      color: "#7FB069",
      interpretation: "Carga equilibrada y productiva.",
    };
  if (ratio <= 1.5)
    return {
      level: "overload",
      label: "Sobre-esfuerzo",
      color: "#F4D35E",
      interpretation: "Carga alta. Monitoriza la fatiga y el sueño.",
    };
  return {
    level: "danger",
    label: "Zona de Peligro",
    color: "#EE5D5D",
    interpretation: "Aumento drástico de carga. Riesgo eminente de lesión.",
  };
};

/**
 * Ramp Rate (Weekly CTL growth) Interpretation
 */
export const getRampRateStatus = (weeklyDelta: number): RiskStatus => {
  if (weeklyDelta < 0)
    return {
      level: "transition",
      label: "Descarga",
      color: "#E6E6E6",
      interpretation: "Asimilando carga previa.",
    };
  if (weeklyDelta <= 5)
    return {
      level: "optimal",
      label: "Progresión Saludable",
      color: "#7FB069",
      interpretation: "Crecimiento sostenible de la condición física.",
    };
  if (weeklyDelta <= 8)
    return {
      level: "overload",
      label: "Progresión Agresiva",
      color: "#F4D35E",
      interpretation: "Crecimiento rápido. Vigila la recuperación.",
    };
  return {
    level: "danger",
    label: "Riesgo Estructural",
    color: "#EE5D5D",
    interpretation: "Demasiado rápido. Riesgo de estrés óseo o ligamentoso.",
  };
};
