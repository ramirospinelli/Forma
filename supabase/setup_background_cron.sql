-- SQL for Supabase HTTP Cron (pg_net extension)
-- This sets up the actual scheduled job inside Supabase.

-- 1. Enable pg_net if not enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the cron job
-- This will run every 30 minutes
SELECT
  cron.schedule(
    'background-sync-athletes', -- name of the job
    '*/30 * * * *',              -- every 30 mins
    $$
    SELECT
      net.http_post(
        url:='https://<PROJECT_ID>.supabase.co/functions/v1/sync-athletes',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- Documentation:
-- Replace <PROJECT_ID> with your Supabase project ID.
-- Replace <SERVICE_ROLE_KEY> with your service_role key (keep it secret!).
-- You can monitor the job in the 'cron' schema or Supabase Dashboard logs.
