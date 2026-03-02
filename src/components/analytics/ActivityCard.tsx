import {
  getActivityEmoji,
  getActivityColor,
  formatRelativeDate,
  formatDistance,
  formatDuration,
  speedToPace,
} from "../../lib/utils";
import { Activity } from "../../lib/types";
import styles from "./ActivityCard.module.css";

interface ActivityCardProps {
  activity: Activity;
  onClick: () => void;
}

export default function ActivityCard({
  activity: a,
  onClick,
}: ActivityCardProps) {
  const color = getActivityColor(a.type);
  const typeName =
    a.type === "Run" ? "Carrera" : a.type === "Ride" ? "Ciclismo" : a.type;

  return (
    <button className={styles.actCard} onClick={onClick}>
      <div className={styles.actHeader}>
        <div className={styles.actType} style={{ background: `${color}15` }}>
          <span>{getActivityEmoji(a.type)}</span>
          <span className={styles.actTypeText} style={{ color }}>
            {typeName}
          </span>
        </div>
        <span className={styles.actDate}>
          {formatRelativeDate(a.start_date_local)}
        </span>
      </div>
      <p className={styles.actName}>{a.name}</p>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatDistance(a.distance)}</span>
          <span className={styles.statLabel}>Distancia</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {formatDuration(a.moving_time)}
          </span>
          <span className={styles.statLabel}>Tiempo</span>
        </div>
        <div className={styles.divider} />
        {a.type === "Run" ? (
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {speedToPace(a.average_speed)}
            </span>
            <span className={styles.statLabel}>Ritmo</span>
          </div>
        ) : (
          <div className={styles.stat}>
            <span className={styles.statValue}>{a.tss || 0}</span>
            <span className={styles.statLabel}>Carga</span>
          </div>
        )}
      </div>
    </button>
  );
}
