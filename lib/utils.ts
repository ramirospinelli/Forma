import { ActivityType, Activity, TrainingLoad } from "./types";

// ─── Distance ────────────────────────────────────────────────────────────────

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function formatDistance(meters: number): string {
  const km = metersToKm(meters);
  if (km < 1) return `${Math.round(meters)}m`;
  return `${km.toFixed(1)} km`;
}

// ─── Time ─────────────────────────────────────────────────────────────────────

export function secondsToHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDuration(seconds: number): string {
  return secondsToHMS(seconds);
}

// ─── Pace ─────────────────────────────────────────────────────────────────────

/** Returns pace in min/km from speed in m/s */
export function speedToPace(speedMs: number): string {
  if (!speedMs || speedMs === 0) return "--";
  const paceSeconds = 1000 / speedMs;
  const min = Math.floor(paceSeconds / 60);
  const sec = Math.round(paceSeconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/** Returns pace in km/h from speed in m/s */
export function speedToKmh(speedMs: number): string {
  return (speedMs * 3.6).toFixed(1);
}

// ─── Elevation ────────────────────────────────────────────────────────────────

export function formatElevation(meters: number): string {
  return `${Math.round(meters)}m`;
}

// ─── Activity Colors & Icons ──────────────────────────────────────────────────

export function getActivityColor(type: ActivityType): string {
  const colors: Record<string, string> = {
    Run: "#FF6B35",
    Ride: "#4ECDC4",
    Swim: "#45B7D1",
    Walk: "#96CEB4",
    Hike: "#88D8A3",
    WeightTraining: "#C77DFF",
    Yoga: "#FFD93D",
    Workout: "#FF6BD6",
  };
  return colors[type] ?? "#A8DAFF";
}

export function getActivityIcon(type: ActivityType): string {
  const icons: Record<string, string> = {
    Run: "running",
    Ride: "bicycle",
    Swim: "water",
    Walk: "walk",
    Hike: "mountain",
    WeightTraining: "barbell",
    Yoga: "leaf",
    Workout: "fitness",
  };
  return icons[type] ?? "flash";
}

export function getActivityEmoji(type: ActivityType): string {
  const emojis: Record<string, string> = {
    Run: "🏃",
    Ride: "🚴",
    Swim: "🏊",
    Walk: "🚶",
    Hike: "🥾",
    WeightTraining: "🏋️",
    Yoga: "🧘",
    Workout: "💪",
  };
  return emojis[type] ?? "⚡";
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday first
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─── Metrics calculations ─────────────────────────────────────────────────────

export function calculateStreak(activities: { start_date: string }[]): number {
  if (!activities.length) return 0;

  const sorted = [...activities].sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = today;

  for (const activity of sorted) {
    const actDate = new Date(activity.start_date);
    actDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (currentDate.getTime() - actDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0 || diffDays === 1) {
      streak++;
      currentDate = actDate;
    } else {
      break;
    }
  }

  return streak;
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Training Load (CTL, ATL, TSB) ───────────────────────────────────────────

export function calculateTrainingLoad(activities: Activity[]): TrainingLoad {
  if (!activities.length) {
    return {
      fitness: 0,
      fatigue: 0,
      form: 0,
      status: "Recovery",
      trend: "steady",
    };
  }

  // Sort activities by date ascending
  const sorted = [...activities].sort(
    (a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
  );

  // Constants
  const CTL_WINDOW = 42;
  const ATL_WINDOW = 7;

  let ctl = 0;
  let atl = 0;

  // Group TSS by day
  const dailyTss: Record<string, number> = {};
  sorted.forEach((a) => {
    const day = a.start_date.split("T")[0];
    dailyTss[day] = (dailyTss[day] || 0) + (a.tss || 0);
  });

  // Calculate CTL and ATL for all days from first activity to today
  const firstDay = new Date(sorted[0].start_date);
  const lastDay = new Date();
  const dayMs = 1000 * 60 * 60 * 24;

  const daysDiff = Math.ceil((lastDay.getTime() - firstDay.getTime()) / dayMs);

  for (let i = 0; i <= daysDiff; i++) {
    const currentDay = new Date(firstDay.getTime() + i * dayMs);
    const dateStr = currentDay.toISOString().split("T")[0];
    const tss = dailyTss[dateStr] || 0;

    // CTL_today = CTL_yesterday * e^(-1/42) + TSS_today * (1 - e^(-1/42))
    ctl =
      ctl * Math.exp(-1 / CTL_WINDOW) + tss * (1 - Math.exp(-1 / CTL_WINDOW));

    // ATL_today = ATL_yesterday * e^(-1/7) + TSS_today * (1 - e^(-1/7))
    atl =
      atl * Math.exp(-1 / ATL_WINDOW) + tss * (1 - Math.exp(-1 / ATL_WINDOW));
  }

  const form = ctl - atl;

  // Determine Status based on form (TSB) and fitness (CTL)
  let status: TrainingLoad["status"];
  if (ctl < 10) {
    status = "Detraining"; // Very low fitness
  } else if (form < -30) {
    status = "Overreaching"; // Very low form, high fatigue relative to fitness
  } else if (form < -10) {
    status = "Productive"; // Low form, building fitness
  } else if (form > 10) {
    status = "Recovery"; // High form, recovering or tapering
  } else {
    status = "Maintaining"; // Balanced form
  }

  // Determine Trend (comparing ATL to CTL)
  const trend: TrainingLoad["trend"] =
    atl > ctl * 1.2 ? "up" : atl < ctl * 0.8 ? "down" : "steady";

  return {
    fitness: Math.round(ctl),
    fatigue: Math.round(atl),
    form: Math.round(form),
    status,
    trend,
  };
}
