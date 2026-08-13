CREATE TABLE IF NOT EXISTS public.training_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  next_session text,
  block_name text,
  deload_active boolean NOT NULL DEFAULT false,
  deload_started_on date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_state TO authenticated;
GRANT ALL ON public.training_state TO service_role;
ALTER TABLE public.training_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training state" ON public.training_state
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.readiness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text,
  checkin_date date NOT NULL DEFAULT current_date,
  sleep_hours numeric,
  soreness integer,
  joint_discomfort integer,
  fatigue integer,
  motivation integer,
  resting_hr integer,
  illness boolean,
  sharp_pain boolean,
  readiness integer,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.readiness_checkins TO authenticated;
GRANT ALL ON public.readiness_checkins TO service_role;
ALTER TABLE public.readiness_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own readiness checkins" ON public.readiness_checkins
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.post_workout_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE CASCADE,
  workout_difficulty integer,
  pump integer,
  target_stimulus integer,
  joint_discomfort integer,
  energy integer,
  exercise_felt_wrong text,
  completion_percent integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_workout_checkins TO authenticated;
GRANT ALL ON public.post_workout_checkins TO service_role;
ALTER TABLE public.post_workout_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own post workout checkins" ON public.post_workout_checkins
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.mobility_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_date date NOT NULL DEFAULT current_date,
  deep_squat_depth text,
  heels_down boolean,
  discomfort text,
  knee_to_wall_left_cm numeric,
  knee_to_wall_right_cm numeric,
  hip_90_90_left numeric,
  hip_90_90_right numeric,
  hip_flexion_restriction numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobility_assessments TO authenticated;
GRANT ALL ON public.mobility_assessments TO service_role;
ALTER TABLE public.mobility_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mobility assessments" ON public.mobility_assessments
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.physique_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT current_date,
  bodyweight numeric,
  waist_cm numeric,
  upper_arm_left_cm numeric,
  upper_arm_right_cm numeric,
  chest_cm numeric,
  calf_left_cm numeric,
  calf_right_cm numeric,
  photo_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.physique_checkins TO authenticated;
GRANT ALL ON public.physique_checkins TO service_role;
ALTER TABLE public.physique_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own physique checkins" ON public.physique_checkins
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_readiness_user_date ON public.readiness_checkins(user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_mobility_user_date ON public.mobility_assessments(user_id, assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_physique_user_date ON public.physique_checkins(user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_post_workout_user ON public.post_workout_checkins(user_id, created_at DESC);