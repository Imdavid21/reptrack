-- Optional circumference measurements for the weekly physique trend.
-- Existing check-ins remain valid and untouched.
ALTER TABLE public.physique_checkins
  ADD COLUMN IF NOT EXISTS upper_arm_left_cm numeric(6,2),
  ADD COLUMN IF NOT EXISTS upper_arm_right_cm numeric(6,2),
  ADD COLUMN IF NOT EXISTS chest_cm numeric(6,2),
  ADD COLUMN IF NOT EXISTS calf_left_cm numeric(6,2),
  ADD COLUMN IF NOT EXISTS calf_right_cm numeric(6,2);
