-- Add bodyweight to morning and night check-ins
ALTER TABLE public.morning_checkins 
ADD COLUMN IF NOT EXISTS bodyweight NUMERIC;

ALTER TABLE public.night_checkins 
ADD COLUMN IF NOT EXISTS bodyweight NUMERIC;

-- Add rest_day column to daily_metrics to mark no-workout days
ALTER TABLE public.daily_metrics 
ADD COLUMN IF NOT EXISTS is_rest_day BOOLEAN DEFAULT false;