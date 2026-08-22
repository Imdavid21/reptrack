ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS caffeine numeric;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS daily_caffeine_goal integer DEFAULT 400;