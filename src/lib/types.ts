// ─── Strava Activity Types ────────────────────────────────────────────────────

export type ActivityType =
  | "Run"
  | "Ride"
  | "Swim"
  | "Walk"
  | "Hike"
  | "WeightTraining"
  | "Yoga"
  | "Workout"
  | string;

export interface StravaActivity {
  id: number;
  name: string;
  type: ActivityType;
  distance: number; // metros
  moving_time: number; // segundos
  elapsed_time: number; // segundos
  total_elevation_gain: number; // metros
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  start_date: string;
  start_date_local: string;
  summary_polyline?: string;
  athlete_count?: number;
  pr_count?: number;
  kudos_count?: number;
  map?: {
    summary_polyline: string;
  };
  splits_metric?: Split[];
  laps?: Lap[];
  suffer_score?: number; // Strava's Relative Effort / TSS equivalent
  calories?: number;
  kilojoules?: number;
}

export interface Split {
  average_speed: number;
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  pace_zone: number;
  split: number;
}

export interface Lap {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  distance: number;
  average_speed: number;
  average_heartrate?: number;
  lap_index: number;
}

// ─── Database Types ───────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  strava_id?: number;
  strava_access_token?: string;
  strava_refresh_token?: string;
  strava_token_expires_at?: string;
  tp_access_token?: string;
  tp_refresh_token?: string;
  tp_token_expires_at?: string;
  weight_kg?: number;
  height_cm?: number;
  lthr?: number;
  birth_date?: string;
  gender?: "male" | "female" | "other";
  last_sync_at?: string;
  sync_status?: "idle" | "syncing" | "error";
  sync_error_message?: string;
  suggested_lthr?: number;
  suggested_lthr_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  strava_id: number;
  name: string;
  type: ActivityType;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  start_date: string;
  start_date_local: string;
  summary_polyline?: string;
  splits_data?: Split[];
  laps_data?: Lap[];
  kudos_count?: number;
  pr_count?: number;
  tss?: number; // Training Stress Score
  intensity_factor?: number;
  aerobic_efficiency?: number;
  ai_insight?: string;
  suffer_score?: number;
  calories?: number;
  created_at: string;
}

export interface UserThresholds {
  user_id: string;
  threshold_pace: number; // seconds/km
  threshold_power?: number;
  ftp?: number;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  type: "distance" | "time" | "activities";
  activity_type?: ActivityType;
  target_value: number;
  period: "weekly" | "monthly" | "yearly";
  created_at: string;
}

export interface PlannedWorkout {
  id: string;
  user_id: string;
  tp_id?: string;
  title: string;
  description?: string;
  activity_type: ActivityType;
  planned_date: string;
  planned_distance?: number;
  planned_duration?: number;
  planned_tss?: number;
  status: "planned" | "completed" | "skipped";
  created_at: string;
}

// ─── Metrics Types ────────────────────────────────────────────────────────────

export interface WeeklyMetrics {
  week_start: string;
  total_distance: number;
  total_time: number;
  total_elevation: number;
  activity_count: number;
  avg_pace?: number;
  activities: Activity[];
}

export interface DashboardMetrics {
  thisWeek: {
    distance: number;
    time: number;
    elevation: number;
    count: number;
  };
  lastWeek: {
    distance: number;
    time: number;
    elevation: number;
    count: number;
  };
  streak: number;
  totalActivities: number;
  recentActivities: Activity[];
  weeklyHistory: WeeklyMetrics[];
  trainingLoad: TrainingLoad;
}

export interface TrainingLoad {
  fitness: number; // CTL (Chronic Training Load) - 42 days
  fatigue: number; // ATL (Acute Training Load) - 7 days
  form: number; // TSB (Training Stress Balance) - Fitness - Fatigue
  status:
    | "En progreso"
    | "Estable"
    | "Recuperando"
    | "Exigiendo de más"
    | "Perdiendo forma";
  trend: "up" | "down" | "steady";
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    profile: string;
    city?: string;
    country?: string;
  };
}

export interface CoachChat {
  id: string;
  user_id: string;
  role: "user" | "model";
  content: string;
  created_at: string;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface TargetEvent {
  id: string;
  user_id: string;
  name: string;
  event_date: string;
  activity_type: ActivityType;
  target_distance: number;
  target_time?: number;
  target_tss?: number;
  linked_activity_id?: string | null;
  target_elevation_gain?: number;
  coach_insight?: string | null;
  created_at: string;
}
