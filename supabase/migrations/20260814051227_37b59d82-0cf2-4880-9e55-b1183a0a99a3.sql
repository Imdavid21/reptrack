ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS potassium numeric;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS daily_potassium_goal integer DEFAULT 3400;