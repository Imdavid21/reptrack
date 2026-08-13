-- RepTrack Personal Energy Engine V3
-- Raw logs remain authoritative. These additions preserve the inputs and
-- provenance needed to reproduce derived estimates without rewriting history.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS initial_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS nonexercise_lifestyle text NOT NULL DEFAULT 'mostly_seated',
  ADD COLUMN IF NOT EXISTS calorie_target_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS protein_target_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS nutrition_source text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.meals
SET nutrition_source = CASE
  WHEN photo_url IS NOT NULL THEN 'ai_photo'
  WHEN ai_detected_food IS NOT NULL THEN 'ai_text'
  ELSE 'manual'
END
WHERE nutrition_source = 'legacy';

ALTER TABLE public.calorie_burns
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS intensity_band text,
  ADD COLUMN IF NOT EXISTS intensity_source text,
  ADD COLUMN IF NOT EXISTS met_estimate numeric,
  ADD COLUMN IF NOT EXISTS effective_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS energy_model_version integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS calculation_inputs jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS explicit_pause_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energy_model_version integer,
  ADD COLUMN IF NOT EXISTS estimated_net_kcal numeric,
  ADD COLUMN IF NOT EXISTS energy_confidence text,
  ADD COLUMN IF NOT EXISTS energy_inputs jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.workout_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE CASCADE,
  draft_id text,
  paused_at timestamptz NOT NULL,
  resumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (workout_id IS NOT NULL OR draft_id IS NOT NULL)
);

ALTER TABLE public.workout_pauses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own workout pauses" ON public.workout_pauses;
CREATE POLICY "Users manage own workout pauses" ON public.workout_pauses
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.energy_model_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  energy_model_version integer NOT NULL DEFAULT 3,
  effective_weight_kg numeric,
  weight_source text,
  formula_ree numeric,
  nonexercise_factor numeric,
  formula_baseline numeric,
  calibration_adjustment numeric NOT NULL DEFAULT 0,
  personal_baseline numeric,
  predicted_tdee numeric,
  calibrated_tdee numeric,
  likely_low numeric,
  likely_high numeric,
  data_quality text,
  calibration_confidence text,
  calibration_eligible boolean NOT NULL DEFAULT false,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, effective_date, energy_model_version)
);

ALTER TABLE public.energy_model_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own energy states" ON public.energy_model_states;
CREATE POLICY "Users manage own energy states" ON public.energy_model_states
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.energy_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  calorie_target integer NOT NULL,
  protein_target integer NOT NULL,
  estimated_maintenance integer NOT NULL,
  target_adjustment integer NOT NULL DEFAULT 0,
  basis text NOT NULL,
  reason text NOT NULL,
  energy_model_version integer NOT NULL DEFAULT 3,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, effective_from, energy_model_version)
);

ALTER TABLE public.energy_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own energy targets" ON public.energy_targets;
CREATE POLICY "Users manage own energy targets" ON public.energy_targets
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_energy_states_user_date
  ON public.energy_model_states(user_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_energy_targets_user_date
  ON public.energy_targets(user_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_workout_pauses_user_time
  ON public.workout_pauses(user_id, paused_at DESC);

-- Seed an initial physiological fallback from the earliest real measurement.
-- This is a fallback only; daily calculations continue to use time-series data.
UPDATE public.user_preferences AS preferences
SET initial_weight_kg = (
  SELECT metrics.bodyweight
  FROM public.daily_metrics AS metrics
  WHERE metrics.user_id = preferences.user_id
    AND metrics.bodyweight IS NOT NULL
    AND metrics.bodyweight BETWEEN 25 AND 350
  ORDER BY metrics.date ASC
  LIMIT 1
)
WHERE preferences.initial_weight_kg IS NULL
  AND EXISTS (
    SELECT 1 FROM public.daily_metrics AS metrics
    WHERE metrics.user_id = preferences.user_id
      AND metrics.bodyweight IS NOT NULL
      AND metrics.bodyweight BETWEEN 25 AND 350
  );

-- Keep account deletion complete after adding V3-owned tables.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.workout_pauses WHERE user_id = v_user;
  DELETE FROM public.energy_targets WHERE user_id = v_user;
  DELETE FROM public.energy_model_states WHERE user_id = v_user;
  DELETE FROM public.goal_history WHERE user_id = v_user;
  DELETE FROM public.calorie_burns WHERE user_id = v_user;
  DELETE FROM public.water_logs WHERE user_id = v_user;
  DELETE FROM public.meals WHERE user_id = v_user;
  DELETE FROM public.daily_metrics WHERE user_id = v_user;
  DELETE FROM public.custom_routines WHERE user_id = v_user;
  DELETE FROM public.user_preferences WHERE user_id = v_user;
  DELETE FROM public.api_rate_limits WHERE user_id = v_user;
  DELETE FROM public.workouts WHERE user_id = v_user;
  DELETE FROM public.profiles WHERE id = v_user;
  DELETE FROM auth.users WHERE id = v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
