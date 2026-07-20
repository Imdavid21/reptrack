ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS sugar numeric,
  ADD COLUMN IF NOT EXISTS sodium numeric;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS daily_sugar_goal integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS daily_sodium_goal integer DEFAULT 2300;