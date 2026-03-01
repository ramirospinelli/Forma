import { useState } from "react";
import {
  X,
  Trophy,
  Calendar as CalendarIcon,
  Ruler,
  Clock,
  TrendingUp,
} from "lucide-react";
import styles from "./CreateEventModal.module.css";
import { ActivityType } from "../../lib/types";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: {
    name: string;
    event_date: string;
    activity_type: ActivityType;
    target_distance: number;
    target_time?: number;
    target_elevation_gain?: number; // Added target_elevation_gain
  }) => void;
  isLoading: boolean;
  initialData?: {
    name: string;
    event_date: string;
    activity_type: ActivityType;
    target_distance: number;
    target_time?: number;
    target_elevation_gain?: number; // Added target_elevation_gain
  };
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  isLoading,
  initialData,
}: EventModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [date, setDate] = useState(initialData?.event_date || "");
  const [type, setType] = useState<ActivityType>(
    initialData?.activity_type || "Ride",
  );
  const [distance, setDistance] = useState(
    initialData ? (initialData.target_distance / 1000).toString() : "",
  );
  const [time, setTime] = useState(
    initialData?.target_time ? (initialData.target_time / 60).toString() : "",
  );
  const [elevation, setElevation] = useState(
    // Added elevation state
    initialData?.target_elevation_gain?.toString() || "",
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date || !distance) return;

    onSave({
      name,
      event_date: date,
      activity_type: type,
      target_distance: Math.round(parseFloat(distance) * 1000), // KM to M
      target_time: time ? Math.round(parseFloat(time) * 60) : undefined, // Min to Sec
      target_elevation_gain: elevation ? parseFloat(elevation) : undefined, // Added target_elevation_gain
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{initialData ? "Editar Objetivo" : "Nuevo Objetivo"}</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Nombre del Evento</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Gran Fondo de los Andes"
              required
              autoFocus
            />
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Fecha</label>
              <div className={styles.inputIconWrapper}>
                <CalendarIcon size={16} className={styles.inputIcon} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Deporte</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className={styles.select}
              >
                <option value="Ride">🚴 Ciclismo</option>
                <option value="Run">🏃 Running</option>
                <option value="Swim">🏊 Natación</option>
                <option value="Hike">🥾 Senderismo</option>
              </select>
            </div>
          </div>

          <div className={styles.sectionHeader}>
            <Trophy size={16} />
            <span>Metas del Objetivo</span>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Distancia (km)</label>
              <div className={styles.inputIconWrapper}>
                <Ruler size={16} className={styles.inputIcon} />
                <input
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="Ej: 100"
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Meta Tiempo (min - opcional)</label>
              <div className={styles.inputIconWrapper}>
                <Clock size={16} className={styles.inputIcon} />
                <input
                  type="number"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Ej: 210"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Desnivel + (m - opcional)</label>
              <div className={styles.inputIconWrapper}>
                <TrendingUp size={16} className={styles.inputIcon} />
                <input
                  type="number"
                  value={elevation}
                  onChange={(e) => setElevation(e.target.value)}
                  placeholder="Ej: 800"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || !name || !date || !distance}
          >
            {isLoading
              ? "Guardando..."
              : initialData
                ? "Guardar Cambios"
                : "Crear Objetivo"}
          </button>
        </form>
      </div>
    </div>
  );
}
