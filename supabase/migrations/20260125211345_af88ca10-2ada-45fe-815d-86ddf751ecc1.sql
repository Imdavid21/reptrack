-- Add user profile fields for personalization
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS height_cm numeric,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS activity_level text,
ADD COLUMN IF NOT EXISTS fitness_goal text,
ADD COLUMN IF NOT EXISTS dietary_preferences text[];

-- Add nutrition tracking fields to meals
ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS protein numeric,
ADD COLUMN IF NOT EXISTS carbs numeric,
ADD COLUMN IF NOT EXISTS fat numeric,
ADD COLUMN IF NOT EXISTS fiber numeric,
ADD COLUMN IF NOT EXISTS food_quality text;

-- Create table to store workout calorie burns
CREATE TABLE IF NOT EXISTS public.calorie_burns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  source text NOT NULL, -- 'workout', 'steps', 'manual'
  calories integer NOT NULL,
  duration_minutes integer,
  activity_type text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date, source, activity_type)
);

ALTER TABLE public.calorie_burns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calorie burns"
ON public.calorie_burns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);