-- ============================================================================
-- Audit critical fixes (2026-06-12)
-- Safe / additive: uses IF EXISTS, NOT VALID checks, and never drops user data.
-- Addresses: broken signup trigger, cross-user RLS leak, public meal photos,
-- missing WITH CHECK on UPDATE policies, non-negative constraints, rate limiting,
-- and GDPR account deletion.
-- ============================================================================

-- 1. ----------------------------------------------------------------------
-- Remove the orphaned API-key trigger + function. The api_keys table was
-- dropped (CASCADE), but CASCADE does not remove a trigger whose function
-- merely references the table in its body, so every new signup was failing.
-- ------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created_generate_api_key ON auth.users;
DROP FUNCTION IF EXISTS public.generate_api_key_for_user() CASCADE;

-- 2. ----------------------------------------------------------------------
-- Cross-user health-data leak: the policy literally named "Deny anonymous
-- access" was defined as USING (auth.uid() IS NOT NULL). Because Postgres
-- combines permissive policies with OR, it let ANY authenticated user read
-- every other user's morning check-ins. The owner-only SELECT policy already
-- covers the legitimate case, so we simply drop the broken one.
-- ------------------------------------------------------------------------
DROP POLICY IF EXISTS "Deny anonymous access" ON public.morning_checkins;

-- 3. ----------------------------------------------------------------------
-- Meal photos were world-readable (public bucket + blanket SELECT policy).
-- Make the bucket private and remove the public-read policy. The owner-scoped
-- upload / view / delete policies remain; the app now uses signed URLs.
-- ------------------------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'meal-photos';
DROP POLICY IF EXISTS "Meal photos are publicly accessible" ON storage.objects;

-- Make sure an UPDATE policy exists so users can overwrite their own photos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can update own meal photos'
  ) THEN
    CREATE POLICY "Users can update own meal photos" ON storage.objects
      FOR UPDATE USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- 4. ----------------------------------------------------------------------
-- UPDATE policies were missing WITH CHECK, so a crafted update could reassign
-- a row's user_id to another user. Re-create the owner UPDATE policies with a
-- matching WITH CHECK. Done defensively with IF EXISTS drops.
-- ------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  uid_col text;
  tables text[] := ARRAY[
    'workouts','daily_metrics','meals','water_logs','morning_checkins',
    'night_checkins','blood_pressure_readings','blood_sugar_readings',
    'calorie_burns','custom_routines','user_preferences'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- skip any table that isn't present in this database
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;
    -- every one of these tables keys ownership on user_id
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can update own ' || t || ' checked', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      'Users can update own ' || t || ' checked', t
    );
  END LOOP;
END $$;

-- 5. ----------------------------------------------------------------------
-- Non-negative constraints on physical quantities. NOT VALID so any existing
-- rows are untouched; only new / updated rows are validated.
-- ------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER TABLE public.meals          ADD CONSTRAINT meals_calories_nonneg        CHECK (calories IS NULL OR calories >= 0) NOT VALID; EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN NULL; END;
  BEGIN ALTER TABLE public.calorie_burns  ADD CONSTRAINT calorie_burns_calories_nonneg CHECK (calories IS NULL OR calories >= 0) NOT VALID; EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN NULL; END;
  BEGIN ALTER TABLE public.daily_metrics  ADD CONSTRAINT daily_metrics_pullups_nonneg  CHECK (pullups IS NULL OR pullups >= 0) NOT VALID; EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN NULL; END;
  BEGIN ALTER TABLE public.daily_metrics  ADD CONSTRAINT daily_metrics_sleep_nonneg    CHECK (sleep_hours IS NULL OR sleep_hours >= 0) NOT VALID; EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN NULL; END;
  BEGIN ALTER TABLE public.daily_metrics  ADD CONSTRAINT daily_metrics_weight_nonneg   CHECK (bodyweight IS NULL OR bodyweight >= 0) NOT VALID; EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN NULL; END;
  BEGIN ALTER TABLE public.water_logs     ADD CONSTRAINT water_logs_amount_nonneg      CHECK (amount IS NULL OR amount >= 0) NOT VALID; EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN NULL; END;
  BEGIN ALTER TABLE public.exercise_sets  ADD CONSTRAINT exercise_sets_weight_nonneg   CHECK (actual_weight IS NULL OR actual_weight >= 0) NOT VALID; EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN NULL; END;
  BEGIN ALTER TABLE public.exercise_sets  ADD CONSTRAINT exercise_sets_reps_nonneg     CHECK (actual_reps IS NULL OR actual_reps >= 0) NOT VALID; EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN NULL; END;
END $$;

-- Helpful indexes for the hot user_id/date lookups that previously had none.
CREATE INDEX IF NOT EXISTS idx_calorie_burns_user_date ON public.calorie_burns (user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals (user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_ts ON public.water_logs (user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts (user_id, date);

-- 6. ----------------------------------------------------------------------
-- Per-user rate limiting for the AI edge functions (cost-abuse protection).
-- A SECURITY DEFINER function records + counts calls in a sliding window and
-- returns whether the call is allowed. Edge functions call it with the user's
-- JWT so auth.uid() resolves.
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limits_lookup_idx ON public.rate_limits (user_id, bucket, created_at);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER function below ever touches this table.

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_bucket text, p_max int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count int;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  -- Opportunistic cleanup of old rows for this user/bucket.
  DELETE FROM public.rate_limits
   WHERE user_id = v_user AND bucket = p_bucket
     AND created_at < now() - make_interval(secs => p_window_seconds * 5);

  SELECT count(*) INTO v_count
    FROM public.rate_limits
   WHERE user_id = v_user AND bucket = p_bucket
     AND created_at > now() - make_interval(secs => p_window_seconds);

  IF v_count >= p_max THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limits (user_id, bucket) VALUES (v_user, p_bucket);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO authenticated, anon;

-- 7. ----------------------------------------------------------------------
-- GDPR "right to erasure": let a user delete their own account + all data.
-- The Privacy Policy promises this; it previously did not exist. Explicitly
-- deletes every user-scoped table (not all have FK cascade) then the auth row.
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.calorie_burns           WHERE user_id = v_user;
  DELETE FROM public.water_logs              WHERE user_id = v_user;
  DELETE FROM public.meals                   WHERE user_id = v_user;
  DELETE FROM public.daily_metrics           WHERE user_id = v_user;
  DELETE FROM public.morning_checkins        WHERE user_id = v_user;
  DELETE FROM public.night_checkins          WHERE user_id = v_user;
  DELETE FROM public.blood_pressure_readings WHERE user_id = v_user;
  DELETE FROM public.blood_sugar_readings    WHERE user_id = v_user;
  DELETE FROM public.custom_routines         WHERE user_id = v_user;
  DELETE FROM public.user_preferences        WHERE user_id = v_user;
  DELETE FROM public.rate_limits             WHERE user_id = v_user;
  -- workouts cascades to exercises / exercise_sets / habits
  DELETE FROM public.workouts                WHERE user_id = v_user;
  DELETE FROM public.profiles                WHERE id = v_user;

  -- Finally remove the auth identity itself.
  DELETE FROM auth.users WHERE id = v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
