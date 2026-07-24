-- Adaptive Mode (Infinite Progression method): opt-in per-user toggle plus the
-- two tables that back it. Movement patterns and exercise-variation strength
-- curves are static content (see src/lib/adaptiveRoster.ts) — no table needed
-- for those since they don't vary per user and ship with the app.
--
-- adaptive_lifecycles: one row per variation's run in a movement pattern.
-- Closed lifecycles (end_date set) are the source of truth for carryover —
-- carryover_total per pattern is SUM(carryover_out) over closed lifecycles,
-- computed client-side rather than duplicated in a ledger column so it can
-- never drift out of sync with the rows that produced it.
--
-- adaptive_session_logs: one row per logged session against a lifecycle's
-- key movement — leading set + back-off set logged separately per spec
-- Section 5, plus an optional weak-point zone tag per spec Section 4. This
-- is what both the end-trigger detector and the weak-point detector read.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS adaptive_mode_enabled boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.adaptive_lifecycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_pattern text NOT NULL,
  variation_name text NOT NULL,
  phase_modifier text,
  rep_range_low integer NOT NULL,
  rep_range_high integer NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  starting_load numeric,
  ending_load numeric,
  carryover_in numeric NOT NULL DEFAULT 0,
  carryover_out numeric,
  end_trigger text,
  weak_points_targeted text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adaptive_lifecycles_user_pattern
  ON public.adaptive_lifecycles(user_id, movement_pattern);

ALTER TABLE public.adaptive_lifecycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own adaptive lifecycles"
  ON public.adaptive_lifecycles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.adaptive_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lifecycle_id uuid NOT NULL REFERENCES public.adaptive_lifecycles(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  leading_load numeric NOT NULL,
  leading_reps integer NOT NULL,
  backoff_load numeric,
  backoff_reps integer,
  weak_point_zone text CHECK (weak_point_zone IN ('lock-out', 'mid-range', 'bottom-range', 'stability')),
  form_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adaptive_session_logs_lifecycle
  ON public.adaptive_session_logs(lifecycle_id, session_date);

ALTER TABLE public.adaptive_session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own adaptive session logs"
  ON public.adaptive_session_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
