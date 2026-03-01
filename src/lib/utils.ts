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
    Run: "walk",
    Ride: "bicycle",
    Swim: "water",
    Walk: "walk",
    Hike: "walk",
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
  const date = parseDateOnly(dateStr.split("T")[0]);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/**
 * Segura de parsear un string 'YYYY-MM-DD' para evitar desfase de 1 día (UTC fallback bug)
 */
export function parseDateOnly(dateStr: string): Date {
  // Si ya tiene T, es ISO con tiempo (actividades de Strava suelen venir así)
  if (dateStr.includes("T")) return new Date(dateStr);

  // Si es solo YYYY-MM-DD, forzamos que sea medianoche LOCAL
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0);
}

export function formatDate(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

// ─── Metrics calculations ─────────────────────────────────────────────────────

export function calculateStreak(activities: Activity[]): number {
  if (!activities.length) return 0;

  // 1. Obtener todos los días únicos con actividad (en medianoche local)
  const uniqueDays = new Set<number>();
  activities.forEach((a) => {
    const d = new Date(a.start_date_local || a.start_date);
    d.setHours(0, 0, 0, 0);
    uniqueDays.add(d.getTime());
  });

  // 2. Ordenar días de más reciente a más antiguo
  const sortedDays = Array.from(uniqueDays).sort((a, b) => b - a);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const yesterdayMs = todayMs - 1000 * 60 * 60 * 24;

  // 3. Verificar si la racha sigue viva (actividad hoy o ayer)
  const latestActivityMs = sortedDays[0];
  if (latestActivityMs < yesterdayMs) return 0;

  // 4. Contar días consecutivos
  let streak = 0;
  let expectedMs = latestActivityMs;

  for (const dayMs of sortedDays) {
    if (dayMs === expectedMs) {
      streak++;
      expectedMs -= 1000 * 60 * 60 * 24;
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
      status: "Recuperando",
      trend: "steady",
    };
  }

  // Sort activities by date ascending
  const sorted = [...activities].sort(
    (a, b) =>
      new Date(a.start_date_local || a.start_date).getTime() -
      new Date(b.start_date_local || b.start_date).getTime(),
  );

  // Constants
  const CTL_WINDOW = 42;
  const ATL_WINDOW = 7;

  let ctl = 0;
  let atl = 0;

  // Group TSS by day using local date string
  const dailyTss: Record<string, number> = {};
  sorted.forEach((a) => {
    const day = (a.start_date_local || a.start_date).split("T")[0];
    dailyTss[day] = (dailyTss[day] || 0) + (a.tss || 0);
  });

  // Calculate CTL and ATL for all days from first activity to today
  const firstDayStr = (
    sorted[0].start_date_local || sorted[0].start_date
  ).split("T")[0];
  const firstDay = parseDateOnly(firstDayStr);
  const lastDay = new Date();
  lastDay.setHours(0, 0, 0, 0);
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
    status = "Perdiendo forma"; // Very low fitness
  } else if (form < -30) {
    status = "Exigiendo de más"; // Very low form, high fatigue relative to fitness
  } else if (form < -10) {
    status = "En progreso"; // Low form, building fitness
  } else if (form > 10) {
    status = "Recuperando"; // High form, recovering or tapering
  } else {
    status = "Estable"; // Balanced form
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

// ─── Security Helpers (Encryption/Decryption) ───────────────────────────────

const ENCRYPTION_SECRET =
  import.meta.env.VITE_ENCRYPTION_KEY || "forma-fitness-default-secret-2025";

/**
 * Encrypts a string using AES-GCM.
 * Returns a base64 encoded string containing IV + Ciphertext.
 */
export async function encryptData(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Derive a key from the secret
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(ENCRYPTION_SECRET),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("forma-salt-v1"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64 string
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypts a base64 encoded string.
 */
export async function decryptData(encoded: string): Promise<string> {
  if (!encoded) return "";
  try {
    const combined = new Uint8Array(
      atob(encoded)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(ENCRYPTION_SECRET),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("forma-salt-v1"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Decryption failed:", err);
    // If decryption fails, it might be because the data was not encrypted yet
    // or the secret is different. Return original to avoid breaking everything
    // but in a real app we'd handle this more strictly.
    return encoded;
  }
}
