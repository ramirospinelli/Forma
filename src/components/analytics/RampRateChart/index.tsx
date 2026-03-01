import { useState } from "react";
import { formatDateShort } from "../../../lib/utils";
import { useRampRate } from "../../../hooks/analytics/useRampRate";
import type { LoadDataPoint } from "../LoadChart/index";
import styles from "./RampRateChart.module.css";

interface Props {
  data: LoadDataPoint[];
}

function getRampColor(val: number) {
  if (val > 10) return "#FF6B35";
  if (val > 7) return "#F4D35E";
  return "#4ECDC4";
}

export default function RampRateChart({ data }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const rampData = useRampRate(data);
  if (!rampData || rampData.length === 0) return null;

  const displayData = rampData
    .filter((_, i) => (rampData.length > 14 ? i % 7 === 0 : true))
    .map((d) => ({
      ...d,
      label: formatDateShort(d.date),
    }));

  const latest = displayData[displayData.length - 1];
  const deltas = displayData.map((d) => Number(d.delta) || 0);
  const max = Math.max(...deltas, 5);
  const min = Math.min(...deltas, 0);
  const range = max - min || 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Ramp Rate</h3>
          <p className={styles.subtitle}>Crecimiento semanal de CTL</p>
        </div>
        <div className={styles.headerRight}>
          {latest && (
            <span
              className={styles.badge}
              style={{ background: getRampColor(latest.delta) }}
            >
              {latest.delta >= 0 ? "+" : ""}
              {latest.delta.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.infoBox}>
        <p>
          <strong style={{ color: "#4ECDC4" }}>Ritmo Seguro (3-7):</strong>{" "}
          Estás mejorando de forma constante y saludable. ✅
        </p>
        <p>
          <strong style={{ color: "#F4D35E" }}>Zona Exigente (7-10):</strong>{" "}
          Cuidado, estás incrementando la carga muy rápido.
        </p>
        <p>
          <strong style={{ color: "#FF6B35" }}>Peligro (&gt;10):</strong>{" "}
          Demasiado esfuerzo nuevo. Riesgo de lesión muy alto.
        </p>
      </div>

      <div className={styles.chart}>
        <div
          className={styles.zeroLine}
          style={{ bottom: `${(-min / range) * 100}%` }}
        />
        {displayData.map((d, i) => {
          const val = Number(d.delta) || 0;
          const hPct = (Math.abs(val) / range) * 100;
          const isNeg = val < 0;
          const color = getRampColor(val);
          return (
            <div key={i} className={styles.col}>
              <div className={styles.barWrapper}>
                <div
                  className={styles.bar}
                  style={{
                    height: `${hPct}%`,
                    background: color,
                    bottom: isNeg ? undefined : `${(-min / range) * 100}%`,
                    top: isNeg ? `${(max / range) * 100}%` : undefined,
                  }}
                />
              </div>
              <span className={styles.colLabel}>{d.label.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        {[
          ["Delta Semanal", "#FF6B35"],
          ["Estable", "#4ECDC4"],
        ].map(([l, c]) => (
          <div key={l} className={styles.legendItem}>
            <div className={styles.dot} style={{ background: c }} />
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
