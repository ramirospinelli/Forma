import { useState } from "react";
import { useACWR } from "../../hooks/analytics/useACWR";
import { useAuthStore } from "../../store/authStore";
import styles from "./HealthShield.module.css";

export default function HealthShield({
  data: _externalData,
}: {
  data?: any[];
}) {
  const { user } = useAuthStore();
  const { data, isLoading } = useACWR(user?.id ?? "");
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading || !data) return null;

  const { current, status, trend } = data;
  const markerPct = Math.min((current / 2) * 100, 100);

  const description =
    status.label === "Optimal"
      ? "Tu progresión es segura. El riesgo de lesión es mínimo."
      : status.label === "Caution"
        ? "Cuidado: Incrementás carga rápido. Considerá un día de descanso."
        : status.label === "High Risk"
          ? "PELIGRO: Sobrecarga crítica detectada. Riesgo de lesión inminente."
          : "Desentrenamiento detectado. Tu carga crónica está cayendo.";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Escudo de Salud</h3>
          <p className={styles.subtitle}>ACWR — Carga Aguda vs Crónica</p>
        </div>
        <button
          className={styles.infoBtn}
          onClick={() => setShowInfo(!showInfo)}
        >
          ⓘ
        </button>
      </div>

      <div className={styles.content}>
        <div
          className={styles.shield}
          style={{
            background: `radial-gradient(circle, ${status.color}30, transparent)`,
          }}
        >
          <svg
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill={status.color}
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.4))" }}
          >
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            <path
              d="M9 12l2 2 4-4"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.acwrValue} style={{ color: status.color }}>
            {current.toFixed(2)}
          </span>
        </div>
        <div className={styles.info}>
          <span
            className={styles.badge}
            style={{ background: `${status.color}20`, color: status.color }}
          >
            {status.label.toUpperCase()}
          </span>
          <p className={styles.description}>{description}</p>
          <p
            className={styles.trend}
            style={{
              color: trend > 10 ? "#FF6B6B" : trend > 0 ? "#FFB347" : "#4CAF7D",
            }}
          >
            {trend >= 0 ? "↑" : "↓"} Tendencia: {trend >= 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </p>
        </div>
      </div>

      {showInfo && (
        <div className={styles.infoBox}>
          <p>
            <strong>¿Qué es el ACWR?</strong> Compara lo que entrenaste esta
            semana vs las últimas 4 semanas.
          </p>
          <p>
            <strong style={{ color: "#4CAF7D" }}>0.8–1.3 "Optimal":</strong>{" "}
            Carga segura y progresiva.
          </p>
          <p>
            <strong style={{ color: "#FF6B6B" }}>&gt;1.5 "High Risk":</strong>{" "}
            Sobrecarga. Alto riesgo de lesión.
          </p>
        </div>
      )}

      <div className={styles.scale}>
        <div className={styles.scaleTrack}>
          <div
            className={styles.seg}
            style={{ flex: 0.8, background: "#5C5C7A" }}
          />
          <div
            className={styles.seg}
            style={{ flex: 0.5, background: "#4CAF7D" }}
          />
          <div
            className={styles.seg}
            style={{ flex: 0.2, background: "#FFB347" }}
          />
          <div
            className={styles.seg}
            style={{ flex: 0.5, background: "#FF6B6B" }}
          />
          <div className={styles.marker} style={{ left: `${markerPct}%` }} />
        </div>
        <div className={styles.scaleLabels}>
          {"0.0  0.8  1.3  1.5  2.0+".split("  ").map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
