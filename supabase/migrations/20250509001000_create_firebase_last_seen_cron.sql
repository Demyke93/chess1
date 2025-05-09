
-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to update last seen values every 2 minutes
SELECT cron.schedule(
  'update-last-seen-from-firebase',
  '*/2 * * * *',  -- Run every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://hzqnccsmejplilhmisgu.supabase.co/functions/v1/firebase-last-seen',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6cW5jY3NtZWpwbGlsaG1pc2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0NjA4MzEsImV4cCI6MjA2MDAzNjgzMX0.ou3o4WiB7NDmU7Mj0kiwXYuf1OjFK_WxmwBGy2d_Dhs"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Log function for debugging
CREATE TABLE IF NOT EXISTS public.background_job_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  run_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL,
  details JSONB
);

-- Create a function to log the job execution
CREATE OR REPLACE FUNCTION public.log_background_job(job_name TEXT, status TEXT, details JSONB DEFAULT '{}'::jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.background_job_logs (job_name, status, details)
  VALUES (job_name, status, details);
END;
$$ LANGUAGE plpgsql;

-- Add a logging wrapper to the cron job
DO $$
BEGIN
  PERFORM log_background_job('firebase-last-seen-cron', 'initialized', jsonb_build_object('timestamp', now()));
END $$;
