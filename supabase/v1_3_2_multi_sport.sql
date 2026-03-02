-- Refinamiento v1.3.2: Multi-deporte y Ajustes de Plan
-- Soporte para selección de múltiples deportes y limpieza de schema

-- 1. Cambiar primary_sport a TEXT[] para soportar múltiples deportes
-- Primero verificamos si hay que convertir
DO $$ 
BEGIN
    -- Si la columna es text, la convertimos a array (o aseguramos que soporte múltiples)
    -- En Supabase/Postgres es fácil manejar arrays
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='profiles' AND column_name='primary_sport' AND data_type='text') THEN
        ALTER TABLE profiles ALTER COLUMN primary_sport TYPE TEXT[] USING ARRAY[primary_sport];
    END IF;
END $$;

-- 2. Asegurar que las columnas existen (por si acaso no corrió la previa correctamente)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS training_goal TEXT DEFAULT 'Maintenance',
ADD COLUMN IF NOT EXISTS cochia_planner_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN profiles.primary_sport IS 'Lista de deportes que el atleta practica y sobre los cuales Cochia puede planificar.';
