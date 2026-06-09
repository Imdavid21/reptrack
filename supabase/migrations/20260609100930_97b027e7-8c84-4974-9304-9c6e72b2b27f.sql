ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS daily_carbs_goal integer DEFAULT 250,
  ADD COLUMN IF NOT EXISTS daily_fat_goal integer DEFAULT 70,
  ADD COLUMN IF NOT EXISTS daily_fiber_goal integer DEFAULT 30;