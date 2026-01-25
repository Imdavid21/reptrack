-- Add is_rest_day to night_checkins table
ALTER TABLE public.night_checkins 
ADD COLUMN IF NOT EXISTS is_rest_day BOOLEAN DEFAULT false;