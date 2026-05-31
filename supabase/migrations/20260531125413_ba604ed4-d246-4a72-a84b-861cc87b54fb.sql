ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS deficit_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_deficit_target integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS maintenance_calories integer;