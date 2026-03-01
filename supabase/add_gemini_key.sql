-- Migración para añadir la API Key de Gemini a los perfiles de usuario
-- Esto permite que cada usuario use su propio agente sin saturar la cuenta global.

-- 1. Añadir la columna si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='gemini_api_key') THEN
        ALTER TABLE profiles ADD COLUMN gemini_api_key TEXT;
    END IF;
END $$;

-- 2. Comentario para documentación
COMMENT ON COLUMN profiles.gemini_api_key IS 'User-provided Google Gemini API Key for personalized AI Coaching and insights.';

-- Nota: Se recomienda que esta columna tenga políticas RLS adecuadas 
-- (que ya deberían existir para la tabla profiles, asegurando que solo el dueño vea su perfil).
