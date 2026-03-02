-- Refinamiento v1.3.1: Contexto de Entrenamiento y Correcciones
-- Añade los campos necesarios para que Cochia sea un entrenador consciente del atleta

-- 1. Añadir campos de preferencia de entrenamiento a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS primary_sport TEXT DEFAULT 'Run',
ADD COLUMN IF NOT EXISTS training_goal TEXT DEFAULT 'Maintenance',
ADD COLUMN IF NOT EXISTS cochia_planner_enabled BOOLEAN DEFAULT TRUE;

-- 2. Asegurar consistencia en planned_workouts
-- Si por error se creó como planned_date, la renombramos a date
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='planned_workouts' AND column_name='planned_date') THEN
        ALTER TABLE planned_workouts RENAME COLUMN planned_date TO date;
    END IF;
END $$;

-- Si la columna date no existe aún (por fallo en migración previa), la creamos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='planned_workouts' AND column_name='date') THEN
        ALTER TABLE planned_workouts ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- 3. Comentarios de ayuda
COMMENT ON COLUMN profiles.training_frequency IS 'Veces por semana que el atleta puede/quiere entrenar.';
COMMENT ON COLUMN profiles.primary_sport IS 'Deporte principal para la planificación (Run, Ride, Swim, etc.).';
COMMENT ON COLUMN profiles.training_goal IS 'Objetivo actual (Base, Evento, Fitness, Recuperación).';
COMMENT ON COLUMN profiles.cochia_planner_enabled IS 'Indica si el usuario desea utilizar las funciones de planificación de Cochia.';
