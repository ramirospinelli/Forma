import { useState } from "react";
import {
  getTsbStatus,
  getAcrStatus,
  getRampRateStatus,
  getMonotonyStatus,
} from "../../../lib/interpreters/safety";
import type { LoadDataPoint } from "../LoadChart/index";
import styles from "./SafetyPanel.module.css";
interface SafetyPanelProps {
  data: LoadDataPoint[];
  monotony?: number;
}

export default function SafetyPanel({ data, monotony = 0 }: SafetyPanelProps) {
  const [showInfo, setShowInfo] = useState(false);
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1];
  const prev = data.length > 7 ? data[data.length - 8] : null;
  const weeklyDelta = prev ? latest.ctl - prev.ctl : 0;

  const tsbStatus = getTsbStatus(latest.tsb);
  const acrStatus = getAcrStatus(latest.atl, latest.ctl);
  const rampStatus = getRampRateStatus(weeklyDelta);
  const monStatus = getMonotonyStatus(monotony);

  const metrics = [
    {
      label: "ACR (Ratio)",
      value: latest.ctl > 0 ? (latest.atl / latest.ctl).toFixed(2) : "0.00",
      status: acrStatus,
    },
    {
      label: "Ramp Rate",
      value: `${weeklyDelta >= 0 ? "+" : ""}${weeklyDelta.toFixed(1)}/sem`,
      status: rampStatus,
    },
    {
      label: "Monotonía",
      value: monotony.toFixed(2),
      status: monStatus,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Panel de Seguridad</h3>
      </div>

      <div className={styles.infoBox}>
        <p>
          <strong>ACR:</strong> Indica si incrementaste el esfuerzo muy rápido.
          Ideal 0.8-1.3. Sobre 1.5 es riesgo de lesión.
        </p>
        <p>
          <strong>Ramp Rate:</strong> Qué tan rápido sube tu Fitness. Lo ideal
          es entre 3 y 7 puntos por semana.
        </p>
      </div>

      <div className={styles.mainCard} style={{ borderColor: tsbStatus.color }}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>ESTADO ACTUAL</span>
          <span
            className={styles.badge}
            style={{ background: tsbStatus.color }}
          >
            {tsbStatus.label}
          </span>
        </div>
        <p className={styles.interpretation}>{tsbStatus.interpretation}</p>
      </div>

      <div className={styles.grid}>
        {metrics.map((m) => (
          <div key={m.label} className={styles.metricCard}>
            <span className={styles.metricLabel}>{m.label}</span>
            <span
              className={styles.metricValue}
              style={{ color: m.status.color }}
            >
              {m.value}
            </span>
            <span className={styles.metricSub}>{m.status.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
