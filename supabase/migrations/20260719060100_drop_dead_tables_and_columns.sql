-- Dead-code audit (2026-07-19): tables/columns with zero references anywhere
-- in src/, beyond the generic CSV export/import tool (which mechanically
-- lists every column for round-tripping and doesn't count as real usage).
-- All were scaffolded in the original 2026-01-25 schema migration and never
-- built on — six months with no hook, no UI, no writer.

-- exercise_sets/exercise_templates were superseded by the (misleadingly
-- "Legacy"-labeled) `exercises` table, which is what the app actually uses.
-- deload_weeks/recovery_metrics were scaffolded for features that were
-- never built (no roadmap doc or code comment ties them to planned work).
DROP TABLE IF EXISTS public.exercise_sets;
DROP TABLE IF EXISTS public.exercise_templates;
DROP TABLE IF EXISTS public.deload_weeks;
DROP TABLE IF EXISTS public.recovery_metrics;

-- Unused columns on tables that are otherwise live.
ALTER TABLE public.workouts
  DROP COLUMN IF EXISTS pre_energy,
  DROP COLUMN IF EXISTS pre_motivation,
  DROP COLUMN IF EXISTS pre_soreness,
  DROP COLUMN IF EXISTS post_difficulty,
  DROP COLUMN IF EXISTS post_satisfaction;

ALTER TABLE public.daily_metrics
  DROP COLUMN IF EXISTS energy_level,
  DROP COLUMN IF EXISTS is_rest_day,
  DROP COLUMN IF EXISTS supplements;

ALTER TABLE public.habits
  DROP COLUMN IF EXISTS energy_level,
  DROP COLUMN IF EXISTS supplements;

-- Not dropping units_system here: it's being wired up to back the Settings
-- "Weight Unit" toggle in this same change, so it's no longer dead.
ALTER TABLE public.user_preferences
  DROP COLUMN IF EXISTS activity_level,
  DROP COLUMN IF EXISTS dietary_preferences;

-- delete_my_account() (added 20260612120000) has unconditionally deleted
-- from night_checkins / blood_pressure_readings / blood_sugar_readings
-- since it was created, but all three were already dropped by an earlier
-- migration (20260210183925) — so the function has never been callable
-- without erroring on its very first DELETE. It's unreachable from the UI
-- today (the Delete Account button was intentionally removed elsewhere
-- this session), but it's still GRANTed to `authenticated`, and it's what
-- the Privacy Policy references for account deletion, so fix it rather
-- than leave a known-broken GDPR-erasure function in place.
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

  DELETE FROM public.calorie_burns    WHERE user_id = v_user;
  DELETE FROM public.water_logs       WHERE user_id = v_user;
  DELETE FROM public.meals            WHERE user_id = v_user;
  DELETE FROM public.daily_metrics    WHERE user_id = v_user;
  DELETE FROM public.morning_checkins WHERE user_id = v_user;
  DELETE FROM public.custom_routines  WHERE user_id = v_user;
  DELETE FROM public.user_preferences WHERE user_id = v_user;
  DELETE FROM public.rate_limits      WHERE user_id = v_user;
  -- workouts cascades to exercises / habits
  DELETE FROM public.workouts         WHERE user_id = v_user;
  DELETE FROM public.profiles         WHERE id = v_user;

  -- Finally remove the auth identity itself.
  DELETE FROM auth.users WHERE id = v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
