CREATE TABLE IF NOT EXISTS public.goal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_key text NOT NULL,
  value numeric NOT NULL,
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_key, effective_from)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_history TO authenticated;
GRANT ALL ON public.goal_history TO service_role;

ALTER TABLE public.goal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goal history" ON public.goal_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goal_history_lookup
  ON public.goal_history (user_id, goal_key, effective_from DESC);