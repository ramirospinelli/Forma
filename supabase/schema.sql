-- ============================================================
-- FORMA - Supabase Database Schema (Full Consolidated Version)
-- Optimized for Adaptive AI Coaching and Multi-Athlete Sync
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS & ENUMS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net"; -- For background worker HTTP calls

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workout_status') THEN
        CREATE TYPE workout_status AS ENUM ('planned', 'completed', 'skipped', 'modified');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status_type') THEN
        CREATE TYPE sync_status_type AS ENUM ('idle', 'syncing', 'error');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  
  -- Strava & TP Credentials
  strava_id BIGINT UNIQUE,
  strava_access_token TEXT,
  strava_refresh_token TEXT,
  strava_token_expires_at TIMESTAMPTZ,
  tp_access_token TEXT,
  tp_refresh_token TEXT,
  tp_token_expires_at TIMESTAMPTZ,
  
  -- Athlete Profile
  weight_kg FLOAT,
  height_cm INT,
  lthr INT, -- Lactate Threshold Heart Rate
  suggested_lthr INTEGER,
  suggested_lthr_at TIMESTAMP WITH TIME ZONE,
  birth_date DATE,
  gender TEXT, 
  
  -- AI Coaching & Planning Preferences
  gemini_api_key TEXT,
  training_frequency INTEGER DEFAULT 3,
  primary_sport TEXT[] DEFAULT ARRAY['Run']::TEXT[],
  training_goal TEXT DEFAULT 'Maintenance',
  cochia_planner_enabled BOOLEAN DEFAULT TRUE,
  
  -- Sync Metadata
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle', -- Can use sync_status_type if preferred, or text for simplicity
  sync_error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabla para umbrales de rendimiento específicos por usuario
CREATE TABLE IF NOT EXISTS public.user_thresholds (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  threshold_pace FLOAT DEFAULT 270, -- seconds per km (4:30/km)
  threshold_power FLOAT DEFAULT 250, -- watts
  ftp FLOAT DEFAULT 250, -- watts
  hr_zones JSONB, -- Stores custom zones [{zone: 1, min: X, max: Y}, ...]
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de actividades (Strava)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strava_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  distance FLOAT NOT NULL DEFAULT 0,
  moving_time INTEGER NOT NULL DEFAULT 0,
  elapsed_time INTEGER NOT NULL DEFAULT 0,
  total_elevation_gain FLOAT NOT NULL DEFAULT 0,
  average_speed FLOAT NOT NULL DEFAULT 0,
  max_speed FLOAT NOT NULL DEFAULT 0,
  average_heartrate FLOAT,
  max_heartrate FLOAT,
  average_cadence FLOAT,
  start_date TIMESTAMPTZ NOT NULL,
  start_date_local TIMESTAMPTZ NOT NULL,
  summary_polyline TEXT,
  splits_data JSONB,
  laps_data JSONB,
  kudos_count INT DEFAULT 0,
  pr_count INT DEFAULT 0,
  tss FLOAT,
  intensity_factor FLOAT,
  aerobic_efficiency FLOAT,
  ai_insight TEXT,
  suffer_score FLOAT,
  calories FLOAT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabla de métricas avanzadas por actividad
CREATE TABLE IF NOT EXISTS public.activity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    trimp_score FLOAT8 NOT NULL,
    hr_zones_time INT4[] NOT NULL, -- Seconds in Z1, Z2, Z3, Z4, Z5
    formula_version TEXT NOT NULL,
    zone_model_type TEXT DEFAULT 'STATIC',
    zone_model_version INT DEFAULT 1,
    zone_snapshot JSONB,
    intensity_factor FLOAT,
    aerobic_efficiency FLOAT,
    tss FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id)
);

-- Tabla de historial diario de carga (PMC)
CREATE TABLE IF NOT EXISTS public.daily_load_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    daily_trimp FLOAT8 NOT NULL DEFAULT 0,
    ctl FLOAT8 NOT NULL DEFAULT 0,
    atl FLOAT8 NOT NULL DEFAULT 0,
    tsb FLOAT8 NOT NULL DEFAULT 0,
    acwr FLOAT,
    formula_version TEXT NOT NULL,
    engine_status JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Tabla de resumen de carga semanal
CREATE TABLE IF NOT EXISTS public.weekly_load_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    total_trimp FLOAT8 NOT NULL DEFAULT 0,
    monotony FLOAT8 NOT NULL DEFAULT 0,
    strain FLOAT8 NOT NULL DEFAULT 0,
    formula_version TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- Tabla de entrenamientos planificados
CREATE TABLE IF NOT EXISTS public.planned_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    workout_structure JSONB,      -- Estructura de intervalos (Warm-up, Main, Cool-down)
    planned_duration INTEGER,    -- Segundos
    planned_intensity FLOAT,      -- IF esperado
    planned_tss FLOAT,            -- Carga TRIMP/TSS estimada
    coach_notes TEXT,            -- Explicación del "por qué" de esta sesión
    status public.workout_status NOT NULL DEFAULT 'planned',
    linked_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Tabla de Eventos Objetivo
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  target_distance FLOAT, 
  target_time INTEGER, 
  target_tss FLOAT, 
  target_elevation_gain FLOAT,
  coach_insight TEXT,
  linked_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabla de historial de chat con el Coach
CREATE TABLE IF NOT EXISTS public.coach_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ============================================================
-- 2. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW health_metrics AS
SELECT 
  user_id,
  date,
  ctl,
  atl,
  acwr,
  CASE 
    WHEN acwr < 0.8 THEN 'Detraining'
    WHEN acwr <= 1.3 THEN 'Optimal'
    WHEN acwr <= 1.5 THEN 'Caution'
    ELSE 'High Risk'
  END as risk_status
FROM public.daily_load_profile;

CREATE OR REPLACE VIEW monthly_load_summary AS
SELECT 
    user_id,
    date_trunc('month', date::date) as month,
    avg(ctl) as avg_fitness,
    max(atl) as peak_fatigue,
    avg(tsb) as avg_form,
    sum(daily_trimp) as total_monthly_trimp
FROM public.daily_load_profile
GROUP BY user_id, month;

-- ============================================================
-- 3. INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON public.activities(user_id, start_date_local DESC);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_user_date ON public.planned_workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_load_user_date ON public.daily_load_profile(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_sync_status_last_sync ON public.profiles(sync_status, last_sync_at);

-- ============================================================
-- 4. SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_load_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_load_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_chats ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Thresholds Policies
CREATE POLICY "Users can access own thresholds" ON public.user_thresholds FOR ALL USING (auth.uid() = user_id);

-- Activities & Metrics Policies
CREATE POLICY "Users can view own activities" ON public.activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activities" ON public.activities FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can access own activity metrics" ON public.activity_metrics 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.activities WHERE id = public.activity_metrics.activity_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can access own load profile" ON public.daily_load_profile FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own weekly load" ON public.weekly_load_metrics FOR ALL USING (auth.uid() = user_id);

-- Planning & Events Policies
CREATE POLICY "Users can manage own planned workouts" ON public.planned_workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own events" ON public.events FOR ALL USING (auth.uid() = user_id);

-- Coach Chats Policies
CREATE POLICY "Users can view their own chats" ON public.coach_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chats" ON public.coach_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chats" ON public.coach_chats FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. Triggers & Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_planned_workouts_updated_at
    BEFORE UPDATE ON public.planned_workouts
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Auto-create thresholds row for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_thresholds()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_thresholds (user_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_thresholds();

-- ============================================================
-- 6. DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN public.profiles.gemini_api_key IS 'User-provided Google Gemini API Key for personalized AI Coaching.';
COMMENT ON COLUMN public.profiles.training_frequency IS 'Veces por semana que el atleta puede/quiere entrenar.';
COMMENT ON COLUMN public.profiles.primary_sport IS 'Lista de deportes que el atleta practica y sobre los cuales Cochia puede planificar.';
COMMENT ON COLUMN public.profiles.training_goal IS 'Objetivo actual (Base, Evento, Fitness, Recuperación).';
COMMENT ON COLUMN public.profiles.cochia_planner_enabled IS 'Indica si el usuario desea utilizar las funciones de planificación de Cochia.';
COMMENT ON COLUMN public.planned_workouts.workout_structure IS 'Granular intervals for the session in JSON format.';
COMMENT ON COLUMN public.planned_workouts.coach_notes IS 'Personalized explanation from Cochia about the objective of this workout.';
