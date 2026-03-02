import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Target,
  Timer,
  Activity as ActivityIcon,
  Trash2,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { plannedWorkoutService } from "../lib/services/plannedWorkouts";
import styles from "./WorkoutDetail.module.css";
import Header from "../components/Header";

export default function WorkoutDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newDate, setNewDate] = useState("");

  const { data: workout, isLoading } = useQuery({
    queryKey: ["planned_workout", id],
    queryFn: () => plannedWorkoutService.getWorkoutById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plannedWorkoutService.deleteWorkout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned_workouts"] });
      toast.success("Entrenamiento eliminado.");
      navigate(-1);
    },
    onError: () => toast.error("Error al eliminar."),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      plannedWorkoutService.updateWorkout(id, { date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned_workouts"] });
      queryClient.invalidateQueries({ queryKey: ["planned_workout", id] });
      toast.success("Entrenamiento movido correctamente.");
      setIsEditingDate(false);
    },
    onError: () => toast.error("Error al mover el entrenamiento."),
  });

  const confirmDelete = () => {
    deleteMutation.mutate(id!);
    setShowDeleteModal(false);
  };

  const handleMove = () => {
    if (!newDate) return;
    moveMutation.mutate({ id: id!, date: newDate });
  };

  // Min date for moving is strictly tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

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

          <div className={styles.actionsSection}>
            <button
              className={`${styles.actionBtn} ${styles.moveBtn}`}
              onClick={() => setIsEditingDate(true)}
            >
              <Calendar size={18} /> Mover
            </button>
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={18} /> Eliminar
            </button>
          </div>

          {showDeleteModal && (
            <div
              className={styles.modalOverlay}
              onClick={() => setShowDeleteModal(false)}
            >
              <div
                className={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalIconBox}>
                  <Trash2 size={24} color="#ff5757" />
                </div>
                <h3 className={styles.modalTitle}>¿Eliminar Entrenamiento?</h3>
                <p className={styles.modalText}>
                  Esta acción no se puede deshacer. Se borrará del calendario.
                </p>
                <div className={styles.modalActions}>
                  <button
                    className={styles.modalCancel}
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className={styles.modalConfirm}
                    onClick={confirmDelete}
                  >
                    {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isEditingDate && (
            <div className={styles.dateEditor}>
              <h4>Seleccionar nueva fecha</h4>
              <input
                type="date"
                className={styles.dateInput}
                min={minDateStr}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <div className={styles.editorActions}>
                <button
                  className={styles.cancelDateBtn}
                  onClick={() => setIsEditingDate(false)}
                >
                  Cancelar
                </button>
                <button
                  className={styles.saveDateBtn}
                  onClick={handleMove}
                  disabled={!newDate || moveMutation.isPending}
                >
                  {moveMutation.isPending ? "Moviendo..." : "Confirmar Cambio"}
                </button>
              </div>
            </div>
          )}

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
