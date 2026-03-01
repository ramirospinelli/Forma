-- Migration: Multi-Athlete Background Sync Support
-- v1.2.0

-- Add sync metadata to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
ADD COLUMN IF NOT EXISTS sync_error_message TEXT;

-- Create an index to quickly find athletes that need syncing
CREATE INDEX IF NOT EXISTS idx_profiles_sync_status_last_sync ON public.profiles(sync_status, last_sync_at);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.last_sync_at IS 'Timestamp of the last successful activity fetch from Strava';
COMMENT ON COLUMN public.profiles.sync_status IS 'Current state of the background synchronization worker';
COMMENT ON COLUMN public.profiles.sync_error_message IS 'Detailed error message if the last sync failed';

-- Add a column to activities to track if they were fetched in a full or incremental sync (optional but useful)
-- ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS sync_batch_id UUID; 

-- 6. Suggested LTHR column for automatic detection
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suggested_lthr INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suggested_lthr_at TIMESTAMP WITH TIME ZONE;
