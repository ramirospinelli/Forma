import { useState } from "react";
import styles from "./Auth.module.css";

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID!;

const redirectUri = window.location.hostname.includes("localhost")
  ? `${window.location.origin}/Forma/auth/callback`
  : "https://ramirospinelli.github.io/Forma/auth/callback";

const features = [
  { icon: "📊", text: "Métricas detalladas de tus actividades" },
  { icon: "📈", text: "Seguí tu progreso semana a semana" },
  { icon: "🏆", text: "Visualizá tus récords personales" },
  { icon: "🎯", text: "Establecé y cumplí tus objetivos" },
];

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStravaLogin = () => {
    setIsLoading(true);
    setError(null);
    const authUrl =
      `https://www.strava.com/oauth/authorize?` +
      `client_id=${STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&approval_prompt=auto` +
      `&scope=read,activity:read_all`;
    window.location.assign(authUrl);
  };

  return (
    <div className={styles.container}>
      <div className={styles.circleTop} />
      <div className={styles.circleBottom} />

      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <div className={styles.logoGradient}>
            <span className={styles.logoIcon}>⚡</span>
          </div>
          <h1 className={styles.logoText}>Forma</h1>
          <p className={styles.logoTagline}>Tu rendimiento, tu progreso</p>
        </div>

        <div className={styles.features}>
          {features.map((f, i) => (
            <div key={i} className={styles.featureRow}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <span className={styles.featureText}>{f.text}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className={styles.errorBox}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        <button
          className={styles.stravaButton}
          onClick={handleStravaLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <span>🔗</span>
              <span>Conectar con Strava</span>
            </>
          )}
        </button>

        <p className={styles.disclaimer}>
          Solo leemos tus actividades. No publicamos nada en tu cuenta.
        </p>
      </div>
    </div>
  );
}
