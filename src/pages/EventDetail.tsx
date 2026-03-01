import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Trophy,
  Flame,
  TrendingUp,
  AlertTriangle,
  Trash2,
  Edit2,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import {
  useEvents,
  useUpdateEvent,
  useDeleteEvent,
} from "../hooks/data/useEvents";
import { useDailyLoadProfile } from "../lib/hooks/useMetrics";
import { aiCoachService } from "../lib/services/aiCoach";
import {
  calculateReadinessScore,
  getDaysRemaining,
  getRiskLevel,
  getProjectionStatus,
} from "../lib/domain/metrics/events";
import { getActivityEmoji, formatDate } from "../lib/utils";
import Header from "../components/Header";
import EventModal from "../components/CreateEventModal";
import ConfirmationModal from "../components/ConfirmationModal";
import ActivityCard from "../components/analytics/ActivityCard";
import styles from "./EventDetail.module.css";
import type { Activity } from "../lib/types";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading: eventsLoading } = useEvents(user?.id);
  const event = events.find((e) => e.id === id);

  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  const [isLinking, setIsLinking] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);

  // Fetch activities for calculations and linking
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  // Fetch load profile for actual CTL/ATL
  const { data: loadHistory = [] } = useDailyLoadProfile(user?.id, 1);
  const latestProfile = loadHistory[loadHistory.length - 1];

  // Calculate metrics
  const readiness = useMemo(() => {
    if (!event || activities.length === 0) return null;
    return calculateReadinessScore(
      latestProfile?.ctl || 0,
      activities,
      event.activity_type,
      event.target_distance,
    );
  }, [event, activities, latestProfile]);

  const daysLeft = useMemo(() => {
    if (!event) return 0;
    return getDaysRemaining(event.event_date);
  }, [event]);

  const risk = useMemo(() => {
    if (!latestProfile) return "optimal";
    return getRiskLevel(latestProfile.ctl, latestProfile.atl);
  }, [latestProfile]);

  const projection = useMemo(() => {
    if (!event || !latestProfile) return "unknown";
    return getProjectionStatus(
      event.event_date,
      latestProfile.ctl,
      latestProfile.atl,
    );
  }, [event, latestProfile]);

  if (eventsLoading) return <div className={styles.loading}>⛰️</div>;
  if (!event) return <div className={styles.error}>Evento no encontrado</div>;

  const isCompleted = !!event.linked_activity_id;

  const handleDelete = async () => {
    await deleteEventMutation.mutateAsync({ id: event.id, userId: user!.id });
    navigate("/activities");
  };

  const handleEdit = async (updates: any) => {
    try {
      await updateEventMutation.mutateAsync({
        id: event.id,
        updates,
      });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Failed to update event:", err);
    }
  };

  const handleLinkActivity = async (activityId: string) => {
    try {
      // 1. Vincular inmediatamente para actualizar la UI
      await updateEventMutation.mutateAsync({
        id: event.id,
        updates: { linked_activity_id: activityId },
      });
      setIsLinking(false);

      // 2. Iniciar generación de insight en "segundo plano" (UI ya muestra vinculación)
      setIsGeneratingInsight(true);
      const activity = activities.find((a) => a.id === activityId);

      if (activity) {
        const insight = await aiCoachService.analyzeEventCompletion({
          event: {
            name: event.name,
            target_distance: event.target_distance,
            target_time: event.target_time,
            target_elevation_gain: event.target_elevation_gain,
          },
          activity: {
            distance: activity.distance,
            moving_time: activity.moving_time,
            type: activity.type,
          },
          profile: profile!,
          userName: profile?.full_name || user?.email || "Atleta",
        });

        // 3. Actualizar con el insight cuando esté listo
        await updateEventMutation.mutateAsync({
          id: event.id,
          updates: { coach_insight: insight },
        });
      }
    } catch (err) {
      console.error("Failed to link activity or generate insight:", err);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const handleUnlink = async () => {
    await updateEventMutation.mutateAsync({
      id: event.id,
      updates: { linked_activity_id: null, coach_insight: null },
    });
    setIsUnlinkModalOpen(false);
  };

  const candidates = useMemo(() => {
    if (!event) return [];
    return activities.filter((a) => {
      // Comparar solo la parte de la fecha (YYYY-MM-DD) para evitar problemas de zona horaria
      const actDate = a.start_date_local
        ? a.start_date_local.split("T")[0]
        : "";
      const eventDate = event.event_date; // Ya viene como "YYYY-MM-DD" desde Supabase (DATE)
      return actDate === eventDate && a.type === event.activity_type;
    });
  }, [activities, event]);

  return (
    <div className={styles.page}>
      <Header
        title="Detalle del Objetivo"
        showBack
        rightElement={
          <div className={styles.headerActions}>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className={styles.editBtn}
            >
              <Edit2 size={20} />
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className={styles.deleteBtn}
            >
              <Trash2 size={20} />
            </button>
          </div>
        }
      />

      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroEmoji}>
            {getActivityEmoji(event.activity_type)}
          </div>
          <h1 className={styles.title}>{event.name}</h1>
          <div className={styles.dateBadge}>
            <Calendar size={14} />
            <span>{formatDate(event.event_date)}</span>
          </div>
          <div className={styles.goalSpecs}>
            <div className={styles.spec}>
              <span className={styles.specVal}>
                {(event.target_distance / 1000).toFixed(1)} km
              </span>
              <span className={styles.specLabel}>Distancia</span>
            </div>
            {event.target_elevation_gain && (
              <div className={styles.spec}>
                <span className={styles.specVal}>
                  {event.target_elevation_gain} m
                </span>
                <span className={styles.specLabel}>Desnivel</span>
              </div>
            )}
          </div>
          {!isCompleted && (
            <div className={styles.countdown}>
              <span className={styles.countdownNum}>{daysLeft}</span>
              <span className={styles.countdownLabel}>días restantes</span>
            </div>
          )}
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Trophy size={18} color="var(--color-primary)" />
              <span className={styles.cardLabel}>Estado de Preparación</span>
            </div>
            <div className={styles.readinessContainer}>
              <div className={styles.readinessCircle}>
                <svg viewBox="0 0 36 36" className={styles.circularChart}>
                  <path
                    className={styles.circleBg}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={styles.circle}
                    strokeDasharray={`${readiness?.totalScore || 0}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className={styles.percentage}>
                    {readiness?.totalScore || 0}%
                  </text>
                </svg>
              </div>
              <div className={styles.readinessInfo}>
                <div className={styles.trendRow}>
                  <TrendingUp size={14} color="#4ade80" />
                  <span className={styles.trendText}>Tendencia estable</span>
                </div>
                <p className={styles.readinessDesc}>
                  Tu preparación para el día de la carrera basada en tu
                  historial reciente.
                </p>
                <div className={styles.readinessBreakdown}>
                  <div className={styles.breakdownItem}>
                    <div className={styles.breakdownInfo}>
                      <span className={styles.breakdownLabel}>
                        Volumen de Carga (CTL)
                      </span>
                      <span className={styles.breakdownValue}>
                        {readiness?.accumulationScore.toFixed(0)}%
                      </span>
                    </div>
                    <div className={styles.miniBar}>
                      <div
                        className={styles.miniBarFill}
                        style={{ width: `${readiness?.accumulationScore}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.breakdownItem}>
                    <div className={styles.breakdownInfo}>
                      <span className={styles.breakdownLabel}>
                        Tirada Larga (Últ. 30d)
                      </span>
                      <span className={styles.breakdownValue}>
                        {readiness?.specificityScore.toFixed(0)}%
                      </span>
                    </div>
                    <div className={styles.miniBar}>
                      <div
                        className={styles.miniBarFill}
                        style={{ width: `${readiness?.specificityScore}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.breakdownItem}>
                    <div className={styles.breakdownInfo}>
                      <span className={styles.breakdownLabel}>
                        Hábito (Últ. 4 sem)
                      </span>
                      <span className={styles.breakdownValue}>
                        {readiness?.consistencyScore.toFixed(0)}%
                      </span>
                    </div>
                    <div className={styles.miniBar}>
                      <div
                        className={styles.miniBarFill}
                        style={{ width: `${readiness?.consistencyScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardSmall}>
            <div className={styles.cardHeader}>
              <AlertTriangle
                size={18}
                color={risk === "optimal" ? "#4ade80" : "#fbbf24"}
              />
              <span className={styles.cardLabel}>Riesgo de Lesión</span>
            </div>
            <div className={styles.riskContent}>
              <div className={styles.riskStatus}>
                {risk === "optimal"
                  ? "Óptimo"
                  : risk === "overreaching"
                    ? "Excesivo"
                    : "Bajo"}
              </div>
              <p className={styles.riskDesc}>
                Relación Carga Aguda/Crónica (ACWR). Mide si estás aumentando el
                volumen demasiado rápido.
              </p>
            </div>
            <div className={styles.riskBar}>
              <div
                className={`${styles.riskProgress} ${styles[risk]}`}
                style={{ width: risk === "optimal" ? "80%" : "40%" }}
              />
            </div>
          </div>

          <div className={styles.cardSmall}>
            <div className={styles.cardHeader}>
              <Flame size={18} color="#f87171" />
              <span className={styles.cardLabel}>Proyección Prime</span>
            </div>
            <div className={styles.projectionValue}>
              {projection === "prime"
                ? "¡Listo para brillar!"
                : "En construcción"}
            </div>
            <p className={styles.projectionHint}>
              Tu pico de forma se estima en +12 TSB.
            </p>
          </div>
        </div>

        <div className={styles.sectionHeader}>
          <h3>Resultado del Evento</h3>
        </div>

        {isCompleted ? (
          <>
            <div className={styles.linkedActivityContainer}>
              <ActivityCard
                activity={
                  activities.find((a) => a.id === event.linked_activity_id)!
                }
                onClick={() =>
                  navigate(`/activity/${event.linked_activity_id}`)
                }
              />
              <button
                className={styles.unlinkSimpleBtn}
                onClick={() => setIsUnlinkModalOpen(true)}
              >
                Desvincular actividad
              </button>
            </div>
            {event.coach_insight ? (
              <div className={styles.insightCard}>
                <div className={styles.insightHeader}>
                  <Sparkles size={18} color="var(--color-primary)" />
                  <span>AI Coach Analysis</span>
                </div>
                <p className={styles.insightText}>{event.coach_insight}</p>
              </div>
            ) : (
              isGeneratingInsight && (
                <div className={styles.insightCardLoading}>
                  <Sparkles
                    size={18}
                    color="var(--color-primary)"
                    className={styles.spinner}
                  />
                  <span>El Coach está analizando tu carrera...</span>
                </div>
              )
            )}
          </>
        ) : isLinking ? (
          <div className={styles.linkingList}>
            <div className={styles.linkingHeader}>
              <p>Seleccioná la actividad que corresponde a este objetivo:</p>
              <button
                onClick={() => setIsLinking(false)}
                className={styles.cancelLinkBtn}
              >
                Cancelar
              </button>
            </div>
            <div className={styles.candidates}>
              {candidates.length > 0 ? (
                candidates.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    onClick={() => handleLinkActivity(a.id)}
                  />
                ))
              ) : (
                <p className={styles.noCandidates}>
                  No se encontraron actividades de {event.activity_type} para
                  este día.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.linkPlaceholder}>
            <LinkIcon size={24} color="var(--color-text-muted)" />
            <p>
              Cuando termines la carrera, vincúlala aquí para ver tus resultados
              vs objetivos.
            </p>
            <button
              className={styles.linkBtn}
              onClick={() => setIsLinking(true)}
              disabled={isGeneratingInsight}
            >
              {isGeneratingInsight ? "Analizando..." : "Vincular ahora"}
            </button>
          </div>
        )}
      </div>

      <EventModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEdit}
        isLoading={updateEventMutation.isPending}
        initialData={{
          name: event.name,
          event_date: event.event_date,
          activity_type: event.activity_type,
          target_distance: event.target_distance,
          target_time: event.target_time,
          target_elevation_gain: event.target_elevation_gain,
        }}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="¿Eliminar objetivo?"
        message="Esta acción no se puede deshacer. Se perderán todos los datos y análisis asociados a este evento."
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteEventMutation.isPending}
      />

      <ConfirmationModal
        isOpen={isUnlinkModalOpen}
        onClose={() => setIsUnlinkModalOpen(false)}
        onConfirm={handleUnlink}
        title="¿Desvincular actividad?"
        message="Se eliminará el vínculo entre esta actividad y el objetivo. También se borrará el análisis de IA generado."
        confirmText="Desvincular"
        variant="warning"
        isLoading={updateEventMutation.isPending}
      />
    </div>
  );
}
