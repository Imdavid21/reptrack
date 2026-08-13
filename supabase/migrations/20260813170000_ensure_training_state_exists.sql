-- Safety migration: production previously missed the adaptive PPL schema
-- migration. Keep the workout rotation functional on both fresh and existing
-- projects without changing any existing user data.
CREATE TABLE IF NOT EXISTS public.training_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  next_session text NOT NULL DEFAULT 'push_a' CHECK (next_session IN ('push_a','pull_a','legs_a','push_b','pull_b','legs_b','recovery')),
  block_name text NOT NULL DEFAULT 'Adaptive PPL',
  deload_active boolean NOT NULL DEFAULT false,
  deload_started_on date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own training state" ON public.training_state;
CREATE POLICY "Users manage own training state"
  ON public.training_state FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_state TO authenticated;
