import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Target,
  Timer,
  Activity as ActivityIcon,
} from "lucide-react";
import { plannedWorkoutService } from "../lib/services/plannedWorkouts";
import styles from "./WorkoutDetail.module.css";
import Header from "../components/Header";

export default function WorkoutDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: workout, isLoading } = useQuery({
    queryKey: ["planned_workout", id],
    queryFn: () => plannedWorkoutService.getWorkoutById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Expertos de Cochia preparando tu sesión...</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className={styles.loading}>
        <h3>No se encontró el entrenamiento</h3>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          Regresar
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header title="Entrenamiento" showBack={true} />

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.detailHeader}>
            <div className={styles.typeTag}>{workout.activity_type}</div>
            <h1 className={styles.workoutTitle}>{workout.title}</h1>
            <p className={styles.workoutDate}>{workout.date}</p>
          </div>

          <div className={styles.metricsGridTwo}>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>
                <ActivityIcon size={14} style={{ marginBottom: 4 }} />{" "}
                Intensidad
              </span>
              <span className={styles.metricValue}>
                {Math.round((workout.planned_intensity || 0) * 100)}%
              </span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>
                <Timer size={14} style={{ marginBottom: 4 }} /> Duración
              </span>
              <span className={styles.metricValue}>
                {Math.round((workout.planned_duration || 0) / 60)} min
              </span>
            </div>
          </div>

          <div className={styles.sectionDivider} />

          {workout.workout_structure ? (
            <div className={styles.descriptionBox}>
              <h4 className={styles.sectionTitle}>
                <Sparkles size={18} color="var(--color-primary)" /> Sesión
                Estructurada
              </h4>
              <div className={styles.structureList}>
                {["warmup", "main_set", "cooldown"].map((section) => {
                  const steps = workout.workout_structure[section];
                  if (!steps || steps.length === 0) return null;
                  return (
                    <div key={section} className={styles.structureSection}>
                      <h5>
                        {section === "warmup"
                          ? "Calentamiento"
                          : section === "main_set"
                            ? "Bloque Principal"
                            : "Enfriamiento"}
                      </h5>
                      {steps.map((step: any, idx: number) => (
                        <div key={idx} className={styles.stepRow}>
                          <div className={styles.stepTime}>
                            {step.min >= 60
                              ? `${Math.floor(step.min / 60)}'${step.min % 60 > 0 ? (step.min % 60) + '"' : ""}`
                              : `${step.min}"`}
                          </div>
                          <div className={styles.stepTarget}>{step.target}</div>
                          <div className={styles.stepDesc}>
                            {step.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.descriptionBox}>
              <h4 className={styles.sectionTitle}>
                <Sparkles size={18} color="var(--color-primary)" /> Objetivo
              </h4>
              <p className={styles.coachNotesDescription}>
                {workout.description || "Referirse a las notas del coach."}
              </p>
            </div>
          )}

          {workout.coach_notes && (
            <div className={styles.coachNotes}>
              <h4 className={styles.sectionTitle}>
                <Target size={18} color="var(--color-primary)" /> Por qué lo
                hacemos
              </h4>
              <p>{workout.coach_notes}</p>
            </div>
          )}

          <div className={styles.explanationBox}>
            <h4 className={styles.explanationTitle}>
              ¿Qué significa la Intensidad?
            </h4>
            <div className={styles.explanationItem}>
              <strong>Intensidad:</strong> Es el esfuerzo relativo a tu
              capacidad máxima. 100% sería ir a tope (umbral), 60% es un ritmo
              muy suave.
            </div>
            <div className={styles.explanationItem}>
              <small>
                Cochia calcula la carga interna automáticamente para optimizar
                tu plan basándose en tus pulsaciones.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
