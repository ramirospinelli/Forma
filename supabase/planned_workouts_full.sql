-- Consolidated SQL for Planned Workouts (Adaptive Trainer / Cochia)
-- Includes v1.3.0, v1.3.1, and v1.3.2 refinements

-- 1. ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workout_status') THEN
        CREATE TYPE workout_status AS ENUM ('planned', 'completed', 'skipped', 'modified');
    END IF;
END $$;

-- 2. ENHANCEMENTS TO PROFILES
-- Handle columns individually to avoid default value cast issues
DO $$ 
BEGIN
    -- training_frequency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='profiles' AND column_name='training_frequency') THEN
        ALTER TABLE public.profiles ADD COLUMN training_frequency INTEGER DEFAULT 3;
    END IF;

    -- primary_sport (Handling conversion from TEXT to TEXT[])
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='profiles' AND column_name='primary_sport') THEN
        ALTER TABLE public.profiles ADD COLUMN primary_sport TEXT[] DEFAULT ARRAY['Run']::TEXT[];
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='profiles' AND column_name='primary_sport' AND data_type='text') THEN
        ALTER TABLE public.profiles ALTER COLUMN primary_sport DROP DEFAULT;
        ALTER TABLE public.profiles ALTER COLUMN primary_sport TYPE TEXT[] USING ARRAY[primary_sport];
        ALTER TABLE public.profiles ALTER COLUMN primary_sport SET DEFAULT ARRAY['Run']::TEXT[];
    END IF;

    -- training_goal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='profiles' AND column_name='training_goal') THEN
    ALTER TABLE public.profiles ADD COLUMN training_goal TEXT DEFAULT 'Maintenance';
    END IF;

    -- cochia_planner_enabled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='profiles' AND column_name='cochia_planner_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN cochia_planner_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.training_frequency IS 'Veces por semana que el atleta puede/quiere entrenar.';
COMMENT ON COLUMN public.profiles.primary_sport IS 'Lista de deportes que el atleta practica y sobre los cuales Cochia puede planificar.';
COMMENT ON COLUMN public.profiles.training_goal IS 'Objetivo actual (Base, Evento, Fitness, Recuperación).';
COMMENT ON COLUMN public.profiles.cochia_planner_enabled IS 'Indica si el usuario desea utilizar las funciones de planificación de Cochia.';

-- 3. PLANNED WORKOUTS TABLE (Drop and recreate if needed or ensure all columns exist)
-- Note: We use IF NOT EXISTS for the table, then add columns that might be missing from older versions.

CREATE TABLE IF NOT EXISTS public.planned_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
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
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Renames and Column additions for existing tables
DO $$ 
BEGIN
    -- Rename planned_date to date if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name='planned_workouts' AND column_name='planned_date') THEN
        ALTER TABLE public.planned_workouts RENAME COLUMN planned_date TO date;
    END IF;
    
    -- Add columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planned_workouts' AND column_name='workout_structure') THEN
        ALTER TABLE public.planned_workouts ADD COLUMN workout_structure JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planned_workouts' AND column_name='coach_notes') THEN
        ALTER TABLE public.planned_workouts ADD COLUMN coach_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planned_workouts' AND column_name='planned_intensity') THEN
        ALTER TABLE public.planned_workouts ADD COLUMN planned_intensity FLOAT;
    END IF;

    -- Ensure planned_tss is float
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planned_workouts' AND column_name='planned_tss' AND data_type='integer') THEN
        ALTER TABLE public.planned_workouts ALTER COLUMN planned_tss TYPE FLOAT;
    END IF;
END $$;

-- 4. INDICES
CREATE INDEX IF NOT EXISTS idx_planned_workouts_user_date ON public.planned_workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_link ON public.planned_workouts(linked_activity_id);

-- 5. SECURITY (RLS)
ALTER TABLE public.planned_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own planned workouts" ON public.planned_workouts;
CREATE POLICY "Users can manage their own planned workouts" 
ON public.planned_workouts FOR ALL 
USING (auth.uid() = user_id);

-- 6. TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_planned_workouts_updated_at ON public.planned_workouts;
CREATE TRIGGER tr_planned_workouts_updated_at
    BEFORE UPDATE ON public.planned_workouts
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- 7. DOCUMENTATION
COMMENT ON COLUMN public.planned_workouts.workout_structure IS 'Granular intervals for the session in JSON format.';
COMMENT ON COLUMN public.planned_workouts.coach_notes IS 'Personalized explanation from Cochia about the objective of this workout.';
