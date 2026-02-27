-- Migration: Create Metrics Tables for Phase 2 Analytics Engine

-- 1. Activity Specific Metrics
CREATE TABLE IF NOT EXISTS public.activity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    trimp_score FLOAT8 NOT NULL,
    hr_zones_time INT4[] NOT NULL, -- Seconds in Z1, Z2, Z3, Z4, Z5
    formula_version TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id)
);

-- 2. Daily Load Profile (CTL, ATL, TSB)
CREATE TABLE IF NOT EXISTS public.daily_load_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    daily_trimp FLOAT8 NOT NULL DEFAULT 0,
    ctl FLOAT8 NOT NULL DEFAULT 0,
    atl FLOAT8 NOT NULL DEFAULT 0,
    tsb FLOAT8 NOT NULL DEFAULT 0,
    formula_version TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 3. Weekly Load Metrics (Monotony, Strain)
CREATE TABLE IF NOT EXISTS public.weekly_load_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL, -- Usually a Monday
    total_trimp FLOAT8 NOT NULL DEFAULT 0,
    monotony FLOAT8 NOT NULL DEFAULT 0,
    strain FLOAT8 NOT NULL DEFAULT 0,
    formula_version TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_load_user_date ON public.daily_load_profile(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_metrics_activity_id ON public.activity_metrics(activity_id);
