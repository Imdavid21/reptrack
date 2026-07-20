-- Sugar and sodium tracking, alongside the existing protein/carbs/fat/fiber.
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS sugar numeric,
  ADD COLUMN IF NOT EXISTS sodium numeric;

-- Daily targets, same pattern as daily_protein_goal/daily_carbs_goal/etc.
-- Sodium default (2300mg) matches the common general upper-limit guidance;
-- sugar default (50g) matches the ~10%-of-calories general guidance. Both are
-- plain defaults, fully editable per-user via the same UI as the other macros.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS daily_sugar_goal integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS daily_sodium_goal integer DEFAULT 2300;
