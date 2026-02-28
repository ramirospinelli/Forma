export interface HeartRateZones {
  z1_min: number;
  z1_max: number;
  z2_min: number;
  z2_max: number;
  z3_min: number;
  z3_max: number;
  z4_min: number;
  z4_max: number;
  z5_min: number;
  z5_max: number;
}

export interface ActivityTRIMP {
  activity_id: string;
  trimp_score: number;
  formula_version: string;
  calculated_at: string;
  zone_model_type?: string;
  zone_model_version?: number;
  zone_snapshot?: any;
  intensity_factor?: number;
  aerobic_efficiency?: number;
}

export interface DailyLoadProfile {
  date: string; // YYYY-MM-DD
  user_id: string;
  daily_trimp: number;
  ctl: number; // Chronic Training Load (42 days)
  atl: number; // Acute Training Load (7 days)
  tsb: number; // Training Stress Balance (Form)
  acwr?: number; // Acute:Chronic Workload Ratio
  formula_version: string;
  calculated_at: string;
  engine_status?: any;
}

export interface WeeklyLoadProfile {
  week_start_date: string; // YYYY-MM-DD (Monday)
  user_id: string;
  total_trimp: number;
  monotony: number;
  strain: number;
  formula_version: string;
  calculated_at?: string;
}

export interface TrainingSnapshot {
  currentProfile: DailyLoadProfile;
  recentWeek: WeeklyLoadProfile;
  nextWorkouts: any[]; // Placeholder for future workouts
  generated_at: string;
}
