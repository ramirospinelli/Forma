-- Migración para v1.3.0: Sistema de Planificación Cochia (Adaptive Trainer)
-- Crea la estructura para el "Entrenador Consciente"

-- 1. Crear el enum de estado para los entrenamientos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workout_status') THEN
        CREATE TYPE workout_status AS ENUM ('planned', 'completed', 'skipped', 'modified');
    END IF;
END $$;

-- 2. Tabla planned_workouts con soporte para estructura granular
CREATE TABLE IF NOT EXISTS planned_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    activity_type TEXT NOT NULL, -- Run, Ride, Swim, etc.
    title TEXT NOT NULL,
    description TEXT,
    workout_structure JSONB,      -- Estructura de intervalos (Warm-up, Main, Cool-down)
    planned_duration INTEGER,    -- Segundos
    planned_intensity FLOAT,      -- IF esperado
    planned_tss FLOAT,            -- Carga TRIMP/TSS estimada
    coach_notes TEXT,            -- Explicación del "por qué" de esta sesión
    status workout_status NOT NULL DEFAULT 'planned',
    linked_activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planned_workouts_user_date ON planned_workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_link ON planned_workouts(linked_activity_id);

-- 3.5 Restricción de unicidad para evitar duplicados
ALTER TABLE planned_workouts DROP CONSTRAINT IF EXISTS unique_user_date;
ALTER TABLE planned_workouts ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);

-- 4. Seguridad (RLS)
ALTER TABLE planned_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own planned workouts" 
ON planned_workouts FOR ALL 
USING (auth.uid() = user_id);

-- 5. Trigger de actualización
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_planned_workouts_updated_at ON planned_workouts;
CREATE TRIGGER tr_planned_workouts_updated_at
    BEFORE UPDATE ON planned_workouts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Comentarios para documentación
COMMENT ON COLUMN planned_workouts.workout_structure IS 'Granular intervals for the session in JSON format.';
COMMENT ON COLUMN planned_workouts.coach_notes IS 'Personalized explanation from Cochia about the objective of this workout.';
