import { useState } from "react";
import { useZonalDistribution } from "../../../hooks/analytics/useZonalDistribution";
import styles from "./ZonalDistribution.module.css";

const ZONE_COLORS = ["#4ECDC4", "#96E6B3", "#FFD93D", "#FF9234", "#FF6B6B"];
const ZONE_NAMES = [
  "Z1 Base",
  "Z2 Aeróbico",
  "Z3 Umbral",
  "Z4 VO2Max",
  "Z5 Neuromuscular",
];

export default function ZonalDistribution() {
  const [showInfo, setShowInfo] = useState(false);
  const { data: weeks, isLoading } = useZonalDistribution();

  if (isLoading || !weeks || weeks.length === 0) return null;

  const week = weeks[weeks.length - 1];
  const total = week.totalTrimp || 1;
  const dist = week.zones.map((z) => (z / total) * 100);

  const isPolarized = dist[0] + dist[1] > 70 && dist[3] + dist[4] > 15;
  const excessiveZ3 = dist[2] > 40;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Distribución de Intensidad</h3>
          <p className={styles.subtitle}>TRIMP por zona — semana actual</p>
        </div>
        <button
          className={styles.infoBtn}
          onClick={() => setShowInfo(!showInfo)}
        >
          ⓘ
        </button>
      </div>

      <div className={styles.bar}>
        {dist.map((pct, i) =>
          pct > 1 ? (
            <div
              key={i}
              className={styles.segment}
              style={{ width: `${pct}%`, background: ZONE_COLORS[i] }}
            />
          ) : null,
        )}
      </div>

      <div className={styles.legend}>
        {dist.map((pct, i) =>
          pct > 0 ? (
            <div key={i} className={styles.legendItem}>
              <div
                className={styles.dot}
                style={{ background: ZONE_COLORS[i] }}
              />
              <span>
                Z{i + 1}: {Math.round(pct)}%
              </span>
            </div>
          ) : null,
        )}
      </div>

      {showInfo && (
        <div className={styles.infoBox}>
          <p>
            <strong style={{ color: ZONE_COLORS[0] }}>Z1-Z2:</strong> Base
            Aeróbica.
          </p>
          <p>
            <strong style={{ color: ZONE_COLORS[2] }}>Z3:</strong> Zona Gris
            (Fatiga sin máxima adaptación).
          </p>
          <p>
            <strong style={{ color: ZONE_COLORS[4] }}>Z4-Z5:</strong> Alta
            Calidad / Intervalos.
          </p>
          <p>Objetivo polarizado: 80% Z1-Z2, 20% Z4-Z5.</p>
        </div>
      )}

      <div className={styles.alerts}>
        {excessiveZ3 && (
          <div className={styles.alertWarning}>
            ⚠️ Exceso de Z3 — acumulás fatiga sin máxima adaptación.
          </div>
        )}
        {isPolarized && (
          <div className={styles.alertSuccess}>
            ✅ Entrenamiento Polarizado (80/20).
          </div>
        )}
      </div>
    </div>
  );
}
