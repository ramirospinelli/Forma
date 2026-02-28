import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Calendar,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import {
  formatDistance,
  formatDuration,
  getActivityEmoji,
  formatRelativeDate,
  getActivityColor,
  speedToPace,
} from "../lib/utils";
import type { Activity, ActivityType } from "../lib/types";
import Header from "../components/Header";
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
  const { user } = useAuthStore();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActivityType | "All">("All");
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [calMonth, setCalMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

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

  const toLocalStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const selectedStr = toLocalStr(selectedDate);
  const dayActivities = activities.filter(
    (a) => (a.start_date_local ?? a.start_date).split("T")[0] === selectedStr,
  );

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

  const todayStr = toLocalStr(today);
  const days = getDaysInMonth();

  return (
    <div className={styles.page}>
      <Header
        title="Mis Actividades"
        rightElement={
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
        }
      />

      {view === "calendar" ? (
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
                const isSelected = ds === selectedStr;
                const isToday = ds === todayStr;
                return (
                  <button
                    key={i}
                    className={`${styles.calDay} ${isSelected ? styles.calSelected : ""} ${isToday && !isSelected ? styles.calToday : ""}`}
                    onClick={() => setSelectedDate(d)}
                  >
                    <span className={styles.calDayNum}>{d.getDate()}</span>
                    <div className={styles.calDots}>
                      {acts.slice(0, 3).map((a, j) => (
                        <div
                          key={j}
                          className={styles.calDot}
                          style={{ background: getActivityColor(a.type) }}
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
            {dayActivities.length === 0 ? (
              <div className={styles.emptyDay}>
                <span className={styles.emptyIcon}>📅</span>
                <p className={styles.emptyText}>No hay entrenamientos</p>
              </div>
            ) : (
              dayActivities.map((a) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  onClick={() => navigate(`/activity/${a.id}`)}
                />
              ))
            )}
          </div>
        </div>
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
        </div>
      )}
    </div>
  );
}

function ActivityCard({
  activity: a,
  onClick,
}: {
  activity: Activity;
  onClick: () => void;
}) {
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
            <span className={styles.statLabel}>TSS</span>
          </div>
        )}
      </div>
    </button>
  );
}
