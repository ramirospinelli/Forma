import { projectTSB } from "../../../lib/simulation/projectTSB";
import styles from "./LoadChart.module.css";

export interface LoadDataPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

interface LoadChartProps {
  data: LoadDataPoint[];
}

const CHART_HEIGHT = 160;

function getTsbStatus(tsb: number) {
  if (tsb > 5) return { label: "Fresco", color: "#7FB069" };
  if (tsb > -10) return { label: "Transición", color: "#E6E6E6" };
  if (tsb > -30) return { label: "Óptimo", color: "#F4D35E" };
  return { label: "Sobrecarga", color: "#EE5D5D" };
}

export default function LoadChart({ data }: LoadChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className={styles.empty}>Sincroniza actividades para ver datos.</div>
    );
  }

  const latest = data[data.length - 1];
  const projections = latest ? projectTSB(latest as any, 7) : [];
  const historicData = data.slice(-14);
  const combinedData = [...historicData, ...projections];
  const max = Math.max(
    ...combinedData.map((d) => Math.max(d.ctl, d.atl, 10)),
    1,
  );
  const status = getTsbStatus(latest?.tsb ?? 0);

  return (
    <div className={styles.container}>
      <div className={styles.pills}>
        {[
          {
            label: "CTL",
            value: Math.round(latest?.ctl ?? 0),
            color: "#FF6B35",
          },
          {
            label: "ATL",
            value: Math.round(latest?.atl ?? 0),
            color: "#FF6B6B",
          },
          {
            label: "TSB",
            value: Math.round(latest?.tsb ?? 0),
            color: status.color,
          },
          { label: "Estado", value: status.label, color: status.color },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className={styles.pill}
            style={{ borderColor: color }}
          >
            <span className={styles.pillLabel} style={{ color }}>
              {label}
            </span>
            <span className={styles.pillValue} style={{ color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.chart}>
        {combinedData.map((d, i) => {
          const isProjection = i >= historicData.length;
          const atlH = (d.atl / max) * CHART_HEIGHT;
          const ctlH = (d.ctl / max) * CHART_HEIGHT;
          return (
            <div key={i} className={styles.col}>
              <div className={styles.barWrapper}>
                <div
                  className={styles.barAtl}
                  style={{ height: atlH, opacity: isProjection ? 0.1 : 0.4 }}
                />
                <div
                  className={styles.barCtl}
                  style={{ height: ctlH, opacity: isProjection ? 0.2 : 1 }}
                />
              </div>
              <span
                className={styles.dayLabel}
                style={{ opacity: isProjection ? 0.5 : 1 }}
              >
                {new Date(d.date).getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.dot} style={{ background: "#FF6B35" }} />
          <span>CTL</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.dot} style={{ background: "#FF6B6B" }} />
          <span>ATL</span>
        </div>
        <div className={styles.legendItem}>
          <div
            className={styles.dot}
            style={{ background: "#FF6B35", opacity: 0.2 }}
          />
          <span>Proyección 7d</span>
        </div>
      </div>
    </div>
  );
}
