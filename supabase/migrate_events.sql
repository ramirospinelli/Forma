-- Migración para Eventos Objetivo (v1.1.0)
-- Ejecutar este archivo para agregar la tabla de eventos sin afectar el resto del esquema

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  target_distance FLOAT, -- metros
  target_time INTEGER, -- segundos (opcional)
  target_tss FLOAT, -- opcional
  linked_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  target_elevation_gain FLOAT,
  coach_insight TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Policies (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);
