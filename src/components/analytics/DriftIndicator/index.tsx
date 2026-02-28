import { detectCardiacDrift } from "../../../lib/domain/metrics/drift";
import styles from "./DriftIndicator.module.css";

interface Props {
  hrStream: number[];
  velocityStream: number[];
}

const SEVERITY_CONFIG = {
  none: { color: "#4ECDC4", icon: "✓", bg: "rgba(78,205,196,0.1)" },
  mild: { color: "#FFD93D", icon: "⚡", bg: "rgba(255,211,61,0.1)" },
  moderate: { color: "#FF9234", icon: "⚠️", bg: "rgba(255,146,52,0.1)" },
  severe: { color: "#FF6B6B", icon: "🔥", bg: "rgba(255,107,107,0.1)" },
};

export default function DriftIndicator({ hrStream, velocityStream }: Props) {
  if (!hrStream || hrStream.length < 60) return null;

  const result = detectCardiacDrift(hrStream, velocityStream);
  const cfg = SEVERITY_CONFIG[result.severity];

  return (
    <div
      className={styles.container}
      style={{ background: cfg.bg, borderColor: `${cfg.color}30` }}
    >
      <div className={styles.header}>
        <span className={styles.icon}>{cfg.icon}</span>
        <div>
          <span className={styles.label} style={{ color: cfg.color }}>
            Cardiac Drift
          </span>
          <span className={styles.value}>{result.label}</span>
        </div>
        {result.detected && (
          <span className={styles.badge} style={{ background: cfg.color }}>
            -{result.dropPct.toFixed(1)}%
          </span>
        )}
      </div>

      {result.detected && (
        <div className={styles.detail}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>EF primera mitad</span>
            <span className={styles.detailValue}>
              {result.efStart.toFixed(4)}
            </span>
          </div>
          <div className={styles.arrow}>→</div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>EF segunda mitad</span>
            <span className={styles.detailValue} style={{ color: cfg.color }}>
              {result.efEnd.toFixed(4)}
            </span>
          </div>
        </div>
      )}

      <p className={styles.hint}>
        {result.severity === "none"
          ? "Eficiencia cardíaca estable durante la actividad."
          : result.severity === "mild"
            ? "Leve aumento de FC al mismo esfuerzo. Normal en la mayoría de las carreras."
            : result.severity === "moderate"
              ? "FC subió significativamente. Revisá hidratación y ritmo."
              : "Drift severo. Posible deshidratación o sobreesfuerzo."}
      </p>
    </div>
  );
}
