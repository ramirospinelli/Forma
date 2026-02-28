export interface MetricMetadata {
  id: string;
  label: string;
  definition: string;
  whyItMatters: string;
  interpretation: {
    low?: string;
    optimal?: string;
    high?: string;
    risk?: string;
  };
}

export const METRICS_DOCS: Record<string, MetricMetadata> = {
  ctl: {
    id: "ctl",
    label: "Fitness (CTL)",
    definition:
      "Carga Crónica de Entrenamiento. Es el promedio exponencial de tu carga de los últimos 42 días.",
    whyItMatters:
      "Representa tu nivel de condición física acumulado. Cuanto más alto, más volumen e intensidad puedes tolerar.",
    interpretation: {
      optimal:
        "Un crecimiento gradual (5-8 puntos por semana) indica una progresión saludable.",
      risk: "Subidas muy bruscas (>10 por semana) aumentan significativamente el riesgo de lesiones estructurales.",
    },
  },
  atl: {
    id: "atl",
    label: "Fatiga (ATL)",
    definition:
      "Carga Aguda de Entrenamiento. Promedio exponencial de la carga de los últimos 7 días.",
    whyItMatters:
      "Indica el cansancio que llevas acumulado esta semana. Sube rápido después de sesiones intensas.",
    interpretation: {
      high: "Un ATL muy superior al CTL indica que estás en un periodo de sobrecarga necesaria o excesiva.",
    },
  },
  tsb: {
    id: "tsb",
    label: "Forma (TSB)",
    definition:
      "Balance de Carga (CTL - ATL del día anterior). Indica tu frescura física.",
    whyItMatters:
      "Determina si estás listo para competir o si necesitas descansar.",
    interpretation: {
      low: "Por debajo de -30: Zona de sobrecarga alta. Cuidado con lesiones.",
      optimal:
        "-10 a -30: Zona óptima de entrenamiento para mejora cardiovascular.",
      high: "Por encima de +5: Zona de frescura. Ideal para días de carrera o test de rendimiento.",
    },
  },
  monotony: {
    id: "monotony",
    label: "Monotonía",
    definition:
      "Relación entre el promedio de carga y su desviación estándar semanal.",
    whyItMatters:
      "Entrenar todos los días con la misma intensidad es perjudicial. El cuerpo necesita variabilidad.",
    interpretation: {
      low: "Menos de 1.5: Excelente variabilidad entre días fuertes y suaves.",
      optimal: "1.5 a 1.9: Variabilidad moderada.",
      high: "Más de 2.0: Riesgo alto. Indica que no hay suficientes días de descanso o recuperación activa.",
    },
  },
  strain: {
    id: "strain",
    label: "Strain (Estrés)",
    definition: "Carga Semanal Total multiplicada por la Monotonía.",
    whyItMatters: "Es el indicador definitivo de riesgo de sobreentrenamiento.",
    interpretation: {
      high: "Un valor elevado indica que estás acumulando mucho cansancio sin suficiente recuperación estructural.",
    },
  },
};
