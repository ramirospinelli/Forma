import { useState } from "react";
import { formatDateShort } from "../../../lib/utils";
import styles from "./MonotonyChart.module.css";

interface WeekData {
  week_start_date: string;
  total_trimp: number;
  monotony: number;
  strain: number;
}

interface Props {
  data: WeekData[];
}

function getMonotonyColor(m: number) {
  if (m > 2.0) return "#FF6B6B";
  if (m > 1.5) return "#FFD93D";
  return "#4ECDC4";
}

function getStrainColor(s: number, maxStrain: number) {
  const pct = maxStrain > 0 ? s / maxStrain : 0;
  if (pct > 0.75) return "#FF6B6B";
  if (pct > 0.5) return "#FFD93D";
  return "#96E6B3";
}

export default function MonotonyChart({ data }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  if (!data || data.length === 0) return null;

  const display = [...data].reverse().slice(-12); // last 12 weeks, chronological
  const maxStrain = Math.max(...display.map((d) => d.strain), 1);
  const maxMonotony = Math.max(...display.map((d) => d.monotony), 1);
  const latest = display[display.length - 1];

  const formatWeek = (dateStr: string) => formatDateShort(dateStr);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Carga Semanal</h3>
          <p className={styles.subtitle}>Monotonía y Strain por semana</p>
        </div>
        <div className={styles.headerRight}>
          {latest && (
            <span
              className={styles.badge}
              style={{ background: getMonotonyColor(latest.monotony) }}
            >
              M {latest.monotony.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.infoBox}>
        <p>
          <strong style={{ color: "#4ECDC4" }}>Variedad:</strong> Buenos
          descansos y entrenos de distinta intensidad. ✅
        </p>
        <p>
          <strong style={{ color: "#FF6B6B" }}>Monotonía:</strong> Estás
          haciendo siempre lo mismo. Añadí variedad para evitar estancarte o
          lesionarte.
        </p>
      </div>

      {/* Dual chart: strain bars + monotony line dots */}
      <div className={styles.chart}>
        {display.map((d, i) => {
          const strainH = (d.strain / maxStrain) * 100;
          const monotonyH = (d.monotony / Math.max(maxMonotony, 3)) * 100;
          return (
            <div key={i} className={styles.col}>
              <div className={styles.barWrapper}>
                {/* Monotony dot overlay */}
                <div
                  className={styles.monotonyDot}
                  style={{
                    bottom: `${monotonyH}%`,
                    background: getMonotonyColor(d.monotony),
                  }}
                />
                {/* Strain bar */}
                <div
                  className={styles.strainBar}
                  style={{
                    height: `${strainH}%`,
                    background: getStrainColor(d.strain, maxStrain),
                  }}
                />
              </div>
              <span className={styles.colLabel}>
                {formatWeek(d.week_start_date).split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        {[
          ["Strain (barras)", "#96E6B3"],
          ["Monotonía (punto)", "#4ECDC4"],
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
