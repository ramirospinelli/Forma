import { projectTSB, findPeakDay } from "../../lib/simulation/projectTSB";
import { formatDate } from "../../lib/utils";
import type { DailyLoadProfile } from "../../lib/domain/metrics/types";
import styles from "./PeakForecast.module.css";

export default function PeakForecast({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  const currentProfile = data[data.length - 1] as DailyLoadProfile;
  const projections = projectTSB(currentProfile, 7);
  const peak = findPeakDay(projections);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>⚡</span>
        <h3 className={styles.title}>Predicción de Pico de Forma</h3>
      </div>

      <p className={styles.predText}>
        Si descansás por completo, tu pico de forma será el{" "}
        <strong style={{ color: "#FFB347" }}>
          {formatDate(peak.date).split(",")[0] /* Solo el día y nombre */}
        </strong>{" "}
        con un TSB de{" "}
        <strong style={{ color: peak.tsb > 0 ? "#4CAF7D" : "#FFB347" }}>
          +{peak.tsb.toFixed(0)}
        </strong>
        .
      </p>

      <div className={styles.daysGrid}>
        {projections.map((day, i) => {
          const isPeak = day.date === peak.date;
          const h = Math.max(Math.min(day.tsb * 2, 50), 4);
          return (
            <div key={i} className={styles.dayCol}>
              <div
                className={styles.bar}
                style={{
                  height: h,
                  background: isPeak ? "#FFB347" : "rgba(255,255,255,0.15)",
                }}
              />
              <span className={styles.dayLabel}>
                {new Date(day.date).toLocaleDateString("es-AR", {
                  weekday: "narrow",
                })}
              </span>
              <span
                className={styles.tsbVal}
                style={{ color: isPeak ? "#FFB347" : "#5C5C7A" }}
              >
                {day.tsb.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
