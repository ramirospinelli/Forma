import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Calendar,
  Search,
  X,
  Plus,
  Trophy,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import PullToRefresh from "react-simple-pull-to-refresh";
import { getActivityColor } from "../lib/utils";
import type { Activity, ActivityType, TargetEvent } from "../lib/types";
import { useEvents, useCreateEvent } from "../hooks/data/useEvents";
import Header from "../components/Header";
import EventModal from "../components/CreateEventModal";
import ActivityCard from "../components/analytics/ActivityCard";
import { plannedWorkoutService } from "../lib/services/plannedWorkouts";
import styles from "./Activities.module.css";

const FILTERS: { label: string; value: ActivityType | "All" }[] = [
  { label: "Todas", value: "All" },
  { label: "🏃 Correr", value: "Run" },
  { label: "🚴 Bici", value: "Ride" },
  { label: "🏊 Nado", value: "Swim" },
  { label: "🚶 Caminar", value: "Walk" },
  { label: "🏋️ Pesas", value: "WeightTraining" },
];

export default function Activities() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActivityType | "All">("All");
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [calMonth, setCalMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
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

  const { data: events = [] } = useEvents(user?.id);
  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ["planned_workouts", user?.id],
    queryFn: async () => {
      // Fetch current month (+/- some padding)
      const start = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const end = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];
      return plannedWorkoutService.getWorkoutsForRange(user!.id, start, end);
    },
    enabled: !!user && profile?.cochia_planner_enabled !== false,
  });

  const createEventMutation = useCreateEvent();

  const togglePlannerMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("profiles")
        .update({ cochia_planner_enabled: enabled })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Preferencia actualizada");
    },
  });

  const handleSaveEvent = async (eventData: any) => {
    if (!user?.id) return;
    try {
      await createEventMutation.mutateAsync({
        ...eventData,
        user_id: user.id,
      });
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to save event:", err);
    }
  };

  const toLocalStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["activities"] });
  };

  const selectedStr = toLocalStr(selectedDate);
  const dayActivities = activities.filter(
    (a) => (a.start_date_local ?? a.start_date).split("T")[0] === selectedStr,
  );
  const dayEvents = events.filter((e) => e.event_date === selectedStr);
  const dayPlanned = plannedWorkouts.filter((w) => w.date === selectedStr);

  const filteredActivities = activities.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || a.type === filter;
    return matchSearch && matchFilter;
  });

  const getDaysInMonth = () => {
    const year = calMonth.getFullYear(),
      month = calMonth.getMonth();
    const days: (Date | null)[] = [];
    const first = new Date(year, month, 1);
    let firstDay = first.getDay() - 1;
    if (firstDay === -1) firstDay = 6;
    for (let i = 0; i < firstDay; i++) days.push(null);
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const actsByDate = new Map<string, Activity[]>();
  activities.forEach((a) => {
    const k = (a.start_date_local ?? a.start_date).split("T")[0];
    if (!actsByDate.has(k)) actsByDate.set(k, []);
    actsByDate.get(k)!.push(a);
  });

  const plannedByDate = new Map<string, any[]>();
  plannedWorkouts.forEach((w) => {
    const k = w.date;
    if (!plannedByDate.has(k)) plannedByDate.set(k, []);
    plannedByDate.get(k)!.push(w);
  });

  const eventsByDate = new Map<string, TargetEvent[]>();
  events.forEach((e) => {
    const k = e.event_date;
    if (!eventsByDate.has(k)) eventsByDate.set(k, []);
    eventsByDate.get(k)!.push(e);
  });

  const todayStr = toLocalStr(today);
  const days = getDaysInMonth();

  return (
    <div className={styles.page}>
      <Header
        rightElement={
          <div style={{ display: "flex", gap: "8px" }}>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${view === "calendar" ? styles.toggleActive : ""}`}
                onClick={() => setView("calendar")}
              >
                <Calendar size={18} />
              </button>
              <button
                className={`${styles.toggleBtn} ${view === "list" ? styles.toggleActive : ""}`}
                onClick={() => setView("list")}
              >
                <List size={18} />
              </button>
            </div>
            <div className={styles.dividerSmall} />
            <button
              className={styles.addBtn}
              onClick={() => setShowAddModal(true)}
              title="Nuevo Evento"
            >
              <Plus size={18} />
            </button>
          </div>
        }
      />

      {view === "calendar" ? (
        <PullToRefresh
          onRefresh={handleRefresh}
          pullingContent={
            <div style={{ textAlign: "center", padding: 20 }}>
              Tirá para refrescar...
            </div>
          }
          refreshingContent={
            <div style={{ textAlign: "center", padding: 20 }}>
              <span
                className={styles.spinner}
                style={{
                  width: 24,
                  height: 24,
                  borderWidth: 2,
                  display: "inline-block",
                }}
              />
            </div>
          }
          backgroundColor="var(--color-bg)"
        >
          <div className={styles.calScroll}>
            <div className={styles.calContainer}>
              <div className={styles.calHeader}>
                <button
                  className={styles.calNav}
                  onClick={() =>
                    setCalMonth((m) => {
                      const n = new Date(m);
                      n.setMonth(n.getMonth() - 1);
                      return n;
                    })
                  }
                >
                  <ChevronLeft size={20} color="var(--color-text-primary)" />
                </button>
                <span className={styles.calMonth}>
                  {calMonth.toLocaleDateString("es-AR", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  className={styles.calNav}
                  onClick={() =>
                    setCalMonth((m) => {
                      const n = new Date(m);
                      n.setMonth(n.getMonth() + 1);
                      return n;
                    })
                  }
                >
                  <ChevronRight size={20} color="var(--color-text-primary)" />
                </button>
              </div>
              <div className={styles.weekDays}>
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <span key={i} className={styles.weekDay}>
                    {d}
                  </span>
                ))}
              </div>
              <div className={styles.calGrid}>
                {days.map((d, i) => {
                  if (!d) return <div key={i} className={styles.calEmpty} />;
                  const ds = toLocalStr(d);
                  const acts = actsByDate.get(ds) ?? [];
                  const evts = eventsByDate.get(ds) ?? [];
                  const isSelected = ds === selectedStr;
                  const isToday = ds === todayStr;
                  const hasEvent = evts.length > 0;

                  return (
                    <button
                      key={i}
                      className={`
                        ${styles.calDay} 
                        ${isSelected ? styles.calSelected : ""} 
                        ${isToday && !isSelected ? styles.calToday : ""} 
                        ${hasEvent && !isSelected ? styles.calHasEvent : ""}
                      `}
                      onClick={() => setSelectedDate(d)}
                    >
                      {hasEvent ? (
                        <div className={styles.calEventIcon}>
                          <Trophy
                            size={14}
                            color={isSelected ? "white" : "#fbbf24"}
                          />
                        </div>
                      ) : (
                        <span className={styles.calDayNum}>{d.getDate()}</span>
                      )}
                      <div className={styles.calDots}>
                        {plannedByDate.get(ds)?.map((w, j) => (
                          <div
                            key={`plan-${j}`}
                            className={`${styles.calDot} ${styles.calPlanDot}`}
                            style={{
                              border: `1px solid ${getActivityColor(w.activity_type)}`,
                            }}
                          />
                        ))}
                        {acts.slice(0, 3).map((a, j) => (
                          <div
                            key={j}
                            className={styles.calDot}
                            style={{ background: getActivityColor(a.type) }}
                          />
                        ))}
                        {evts.map((e, j) => (
                          <div
                            key={`evt-${j}`}
                            className={`${styles.calDot} ${styles.calEventDot}`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.dayDetail}>
              <h2 className={styles.dayTitle}>
                {selectedDate.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h2>
              {dayActivities.length === 0 &&
              dayEvents.length === 0 &&
              dayPlanned.length === 0 ? (
                <div className={styles.emptyDay}>
                  <span className={styles.emptyIcon}>📅</span>
                  <p className={styles.emptyText}>
                    No hay entrenamientos u objetivos
                  </p>
                </div>
              ) : (
                <>
                  {dayPlanned.map((w) => (
                    <div
                      key={w.id}
                      className={styles.plannedDetailCard}
                      onClick={() => navigate(`/plan/workout/${w.id}`)}
                    >
                      <div className={styles.plannedHeader}>
                        <div className={styles.plannedIcon}>
                          <Target size={16} />
                        </div>
                        <div className={styles.plannedInfo}>
                          <span className={styles.plannedTitle}>{w.title}</span>
                          <span className={styles.plannedType}>
                            {w.activity_type}
                          </span>
                        </div>
                      </div>

                      {w.coach_notes && (
                        <div className={styles.coachNotes}>
                          <p>{w.coach_notes}</p>
                        </div>
                      )}

                      <div className={styles.plannedMeta}>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Intensidad</span>
                          <span className={styles.metaValue}>
                            {Math.round((w.planned_intensity || 0) * 100)}%
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Duración</span>
                          <span className={styles.metaValue}>
                            {Math.round((w.planned_duration || 0) / 60)} min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className={styles.eventCard}
                      onClick={() => navigate(`/event/${e.id}`)}
                    >
                      <div className={styles.eventIcon}>🏆</div>
                      <div className={styles.eventInfo}>
                        <span className={styles.eventName}>{e.name}</span>
                        <span className={styles.eventMeta}>
                          {e.activity_type === "Run"
                            ? "🏃 Carrera"
                            : "🚴 Competencia"}{" "}
                          • {(e.target_distance / 1000).toFixed(1)} km
                        </span>
                      </div>
                      <ChevronRight
                        size={18}
                        color="var(--color-text-secondary)"
                      />
                    </div>
                  ))}
                  {dayActivities.map((a) => (
                    <ActivityCard
                      key={a.id}
                      activity={a}
                      onClick={() => navigate(`/activity/${a.id}`)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </PullToRefresh>
      ) : (
        <div className={styles.listContainer}>
          <div className={styles.searchBar}>
            <Search size={18} color="#5C5C7A" />
            <input
              className={styles.searchInput}
              placeholder="Buscar actividad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className={styles.clearBtn}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className={styles.filterRow}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`${styles.filterChip} ${filter === f.value ? styles.filterActive : ""}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <PullToRefresh
            onRefresh={handleRefresh}
            pullingContent={
              <div style={{ textAlign: "center", padding: 20 }}>
                Tirá para refrescar...
              </div>
            }
            refreshingContent={
              <div style={{ textAlign: "center", padding: 20 }}>
                <span
                  className={styles.spinner}
                  style={{
                    width: 24,
                    height: 24,
                    borderWidth: 2,
                    display: "inline-block",
                  }}
                />
              </div>
            }
            backgroundColor="var(--color-bg)"
          >
            <div className={styles.listScroll}>
              {isLoading ? (
                <div className={styles.spinner} />
              ) : filteredActivities.length === 0 ? (
                <div className={styles.emptyDay}>
                  <p className={styles.emptyText}>
                    No se encontraron actividades
                  </p>
                </div>
              ) : (
                filteredActivities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    onClick={() => navigate(`/activity/${a.id}`)}
                  />
                ))
              )}
            </div>
          </PullToRefresh>
        </div>
      )}

      <EventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveEvent}
        isLoading={createEventMutation.isPending}
      />
    </div>
  );
}
