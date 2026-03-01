import { useState } from "react";
import styles from "./EFChart.module.css";

interface EFPoint {
  date: string;
  type: string;
  ef: number;
}

interface Props {
  data: EFPoint[];
  activityType?: string;
  onTypeChange?: (t: string) => void;
  isLoading?: boolean;
}

const TYPE_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Correr", value: "Run" },
  { label: "Bici", value: "Ride" },
];

const TYPE_COLORS: Record<string, string> = {
  Run: "#FF6B35",
  Ride: "#4ECDC4",
  default: "#96E6B3",
};

export default function EFChart({
  data,
  activityType = "",
  onTypeChange,
  isLoading = false,
}: Props) {
  const [showInfo, setShowInfo] = useState(false);
  // Don't render at all if no data and not loading and no filter active
  if (!isLoading && (!data || data.length === 0) && !activityType) return null;

  const hasData = data && data.length > 0;
  const efs = hasData ? data.map((d) => d.ef) : [0, 1];
  const minEF = Math.min(...efs) * 0.95 || 0;
  const maxEF = Math.max(...efs) * 1.05 || 1;
  const range = maxEF - minEF || 0.01;

  const windowSize = Math.max(4, Math.floor((data?.length ?? 0) / 10));
  const rollingAvg = (hasData ? data : []).map((_, i) => {
    const slice = data.slice(Math.max(0, i - windowSize + 1), i + 1);
    return slice.reduce((s, d) => s + d.ef, 0) / slice.length;
  });

  const latest = hasData ? data[data.length - 1] : null;
  const trend =
    hasData && data.length > 1 ? data[data.length - 1].ef - data[0].ef : 0;

  const getTrendStatus = () => {
    if (Math.abs(trend) < 0.005) return { label: "ESTABLE", color: "#F4D35E" };
    if (trend > 0) return { label: "MEJORANDO", color: "#4ECDC4" };
    return { label: "BAJANDO", color: "#FF6B6B" };
  };

  const status = getTrendStatus();

  // Sparkline: normalize to 0-100
  const toY = (ef: number) => 100 - ((ef - minEF) / range) * 100;

  const svgW = 300;
  const svgH = 80;
  const pointsRaw = hasData
    ? data.map((d, i) => ({
        x: (i / Math.max(data.length - 1, 1)) * svgW,
        y: (toY(d.ef) / 100) * svgH,
        color: TYPE_COLORS[d.type] || TYPE_COLORS.default,
      }))
    : [];

  const avgLine = rollingAvg
    .map((ef, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * svgW;
      const y = (toY(ef) / 100) * svgH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Eficiencia Aeróbica</h3>
          <p className={styles.subtitle}>
            EF = velocidad / FC — mejora = motor aeróbico más eficiente
          </p>
        </div>
        <div className={styles.headerRight}>
          {latest && (
            <span
              className={styles.badge}
              style={{ background: status.color, color: "#000" }}
            >
              {trend >= 0 ? "▲" : "▼"} {status.label} (
              {Math.abs(trend).toFixed(3)})
            </span>
          )}
        </div>
      </div>

      <div className={styles.infoBox}>
        <p>
          La <strong>Eficiencia</strong> mide qué tan rápido vas con menos
          esfuerzo (pulso). Una línea ascendente indica que tu corazón se está
          volviendo más fuerte.
        </p>
      </div>

      {onTypeChange && (
        <div className={styles.typeFilter}>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.filterBtn} ${activityType === opt.value ? styles.filterActive : ""}`}
              onClick={() => onTypeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* SVG sparkline or loader/empty state */}
      {isLoading ? (
        <div
          className={styles.chartWrapper}
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
            Cargando...
          </span>
        </div>
      ) : !hasData ? (
        <div
          className={styles.chartWrapper}
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
            Sin actividades con datos de EF para este filtro.
          </span>
        </div>
      ) : (
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className={styles.svg}
            preserveAspectRatio="none"
          >
            <polyline
              points={avgLine}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
            {pointsRaw.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={data.length > 40 ? 2 : 3.5}
                fill={p.color}
                opacity={0.85}
              />
            ))}
          </svg>
          <div className={styles.axisLabels}>
            <span>{maxEF.toFixed(2)}</span>
            <span>{minEF.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Latest value */}
      {latest && (
        <div className={styles.summaryContainer}>
          <div className={styles.summary}>
            <span className={styles.summaryLabel}>Última EF</span>
            <span className={styles.summaryValue}>{latest.ef.toFixed(3)}</span>
            <span className={styles.summaryLabel}>
              {data.length} actividades
            </span>
          </div>
          <p className={styles.interpretation} style={{ color: status.color }}>
            {trend > 0.005
              ? "¡Excelente! Estás logrando ir más rápido con el mismo esfuerzo."
              : Math.abs(trend) <= 0.005
                ? "Tu eficiencia se mantiene estable. Buen trabajo manteniendo la base."
                : "Tu eficiencia ha bajado un poco. Esto puede ser por fatiga acumulada o falta de base aeróbica."}
          </p>
        </div>
      )}
    </div>
  );
}
