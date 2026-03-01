import { useState } from "react";
import { useDailyLoadProfile } from "../../lib/hooks/useMetrics";
import { useAuthStore } from "../../store/authStore";
import type { Activity } from "../../lib/types";
import styles from "./PerformanceChart.module.css";

interface Props {
  activities?: Activity[];
  days?: number;
}

export default function PerformanceChart({
  activities: _activities,
  days = 30,
}: Props) {
  const { user } = useAuthStore();
  const { data, isLoading } = useDailyLoadProfile(user?.id, days);
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading)
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  if (!data || data.length < 2)
    return (
      <div className={styles.empty}>
        No hay datos suficientes (mínimo 2 días).
      </div>
    );

  const max = Math.max(...data.map((d) => Math.max(d.ctl, d.atl, 10)), 1);
  const min = Math.min(...data.map((d) => Math.min(d.tsb, 0)));
  const range = max - min || 1;
  const H = 140;

  const latest = data[data.length - 1];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.legendRow}>
          {[
            ["FORMA", "#4CAF7D", latest.tsb.toFixed(0)],
            ["FATIGA", "#FF6B6B", latest.atl.toFixed(0)],
            ["FITNESS", "#FF6B35", latest.ctl.toFixed(0)],
          ].map(([l, c, v]) => (
            <div key={l} className={styles.legendItem}>
              <div className={styles.dot} style={{ background: c }} />
              <span>
                {l}: <strong>{v}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.chart} style={{ height: H }}>
        {/* Zero line for TSB */}
        <div
          className={styles.zeroLine}
          style={{ bottom: `${(-min / range) * 100}%` }}
        />
        {data.map((d, i) => {
          const ctlH = ((d.ctl - min) / range) * H;
          const atlH = ((d.atl - min) / range) * H;
          const tsbB = ((-min + d.tsb) / range) * H;
          return (
            <div key={i} className={styles.col}>
              <div className={styles.barAtl} style={{ height: atlH }} />
              <div className={styles.barCtl} style={{ height: ctlH }} />
              <div
                className={styles.tsbDot}
                style={{ bottom: Math.max(tsbB, 0) }}
              />
            </div>
          );
        })}
      </div>

      <div className={styles.infoBox}>
        <p>
          <strong style={{ color: "#FF6B35" }}>FITNESS:</strong> Tu nivel de
          entrenamiento acumulado. Cuanto más alto, más "motor" tenés.
        </p>
        <p>
          <strong style={{ color: "#FF6B6B" }}>FATIGA:</strong> Qué tan cansado
          estás por lo que entrenaste los últimos días.
        </p>
        <p>
          <strong style={{ color: "#4CAF7D" }}>FORMA:</strong> Tu estado actual.
          Positivo indica que estás descansado; muy negativo que necesitás
          recuperar.
        </p>
      </div>

      <p className={styles.footer}>Últimos {days} días</p>
    </div>
  );
}
