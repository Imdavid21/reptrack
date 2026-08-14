ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_category_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_category_check CHECK (category IN ('warmup','mobility','activation','primary','compound','specialization','accessory','core','cooldown'));

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS actual_rir numeric(3,1),
  ADD COLUMN IF NOT EXISTS rom_quality smallint CHECK(rom_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS pain_score smallint CHECK(pain_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS set_kind text NOT NULL DEFAULT 'working' CHECK(set_kind IN ('warmup','working','mobility','cooldown')),
  ADD COLUMN IF NOT EXISTS prescription jsonb;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS readiness_id uuid REFERENCES public.readiness_checkins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_key text,
  ADD COLUMN IF NOT EXISTS readiness_band text CHECK(readiness_band IN ('green','yellow','red')),
  ADD COLUMN IF NOT EXISTS completion_percent smallint CHECK(completion_percent BETWEEN 0 AND 100);

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS show_bmr_on_dashboard boolean DEFAULT true;