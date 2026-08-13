-- Additive data model for the deterministic adaptive PPLx2 prescription engine.
CREATE TABLE IF NOT EXISTS public.training_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  next_session text NOT NULL DEFAULT 'push_a' CHECK (next_session IN ('push_a','pull_a','legs_a','push_b','pull_b','legs_b','recovery')),
  block_name text NOT NULL DEFAULT 'Durga Puja physique block',
  deload_active boolean NOT NULL DEFAULT false,
  deload_started_on date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.readiness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL, checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours numeric(4,2) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 24), soreness jsonb NOT NULL DEFAULT '{}',
  joint_discomfort jsonb NOT NULL DEFAULT '{}', fatigue smallint NOT NULL CHECK (fatigue BETWEEN 0 AND 10),
  motivation smallint NOT NULL CHECK (motivation BETWEEN 0 AND 10), resting_hr smallint,
  illness boolean NOT NULL DEFAULT false, sharp_pain boolean NOT NULL DEFAULT false,
  readiness text NOT NULL CHECK (readiness IN ('green','yellow','red')), recommendation jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.post_workout_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE CASCADE, workout_difficulty smallint CHECK (workout_difficulty BETWEEN 1 AND 10),
  pump smallint CHECK (pump BETWEEN 1 AND 10), target_stimulus smallint CHECK (target_stimulus BETWEEN 1 AND 10),
  joint_discomfort smallint CHECK (joint_discomfort BETWEEN 0 AND 10), energy smallint CHECK (energy BETWEEN 1 AND 10),
  exercise_felt_wrong boolean NOT NULL DEFAULT false, completion_percent smallint CHECK (completion_percent BETWEEN 0 AND 100), notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.mobility_assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, assessment_date date NOT NULL DEFAULT CURRENT_DATE,
 deep_squat_depth text, heels_down boolean, discomfort smallint CHECK(discomfort BETWEEN 0 AND 10), knee_to_wall_left_cm numeric(5,2), knee_to_wall_right_cm numeric(5,2),
 hip_90_90_left smallint CHECK(hip_90_90_left BETWEEN 0 AND 10), hip_90_90_right smallint CHECK(hip_90_90_right BETWEEN 0 AND 10), hip_flexion_restriction smallint CHECK(hip_flexion_restriction BETWEEN 0 AND 10), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.physique_checkins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, checkin_date date NOT NULL DEFAULT CURRENT_DATE,
 bodyweight numeric(6,2), waist_cm numeric(6,2), photo_paths jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS actual_rir numeric(3,1), ADD COLUMN IF NOT EXISTS rom_quality smallint CHECK(rom_quality BETWEEN 1 AND 5), ADD COLUMN IF NOT EXISTS pain_score smallint CHECK(pain_score BETWEEN 0 AND 10), ADD COLUMN IF NOT EXISTS set_kind text NOT NULL DEFAULT 'working' CHECK(set_kind IN ('warmup','working','mobility','cooldown')), ADD COLUMN IF NOT EXISTS prescription jsonb;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS readiness_id uuid REFERENCES public.readiness_checkins(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS session_key text, ADD COLUMN IF NOT EXISTS readiness_band text CHECK(readiness_band IN ('green','yellow','red')), ADD COLUMN IF NOT EXISTS completion_percent smallint CHECK(completion_percent BETWEEN 0 AND 100);
CREATE INDEX IF NOT EXISTS readiness_user_date_idx ON public.readiness_checkins(user_id,checkin_date DESC);
CREATE INDEX IF NOT EXISTS post_workout_user_created_idx ON public.post_workout_checkins(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS mobility_user_date_idx ON public.mobility_assessments(user_id,assessment_date DESC);
CREATE INDEX IF NOT EXISTS physique_user_date_idx ON public.physique_checkins(user_id,checkin_date DESC);
ALTER TABLE public.training_state ENABLE ROW LEVEL SECURITY; ALTER TABLE public.readiness_checkins ENABLE ROW LEVEL SECURITY; ALTER TABLE public.post_workout_checkins ENABLE ROW LEVEL SECURITY; ALTER TABLE public.mobility_assessments ENABLE ROW LEVEL SECURITY; ALTER TABLE public.physique_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training state" ON public.training_state FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY "Users manage own readiness" ON public.readiness_checkins FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY "Users manage own post workout" ON public.post_workout_checkins FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY "Users manage own mobility" ON public.mobility_assessments FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY "Users manage own physique" ON public.physique_checkins FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.training_state,public.readiness_checkins,public.post_workout_checkins,public.mobility_assessments,public.physique_checkins TO authenticated;
