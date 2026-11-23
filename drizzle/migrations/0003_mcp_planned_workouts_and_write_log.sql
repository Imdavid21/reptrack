CREATE TABLE public.planned_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  duration_minutes integer,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','started','completed','cancelled')),
  workout_id uuid,
  client_key text,
  source text NOT NULL DEFAULT 'mcp',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_workouts TO authenticated;
GRANT ALL ON public.planned_workouts TO service_role;
ALTER TABLE public.planned_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own planned workouts" ON public.planned_workouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX planned_workouts_user_date ON public.planned_workouts(user_id, date);
CREATE UNIQUE INDEX planned_workouts_client_key ON public.planned_workouts(user_id, client_key) WHERE client_key IS NOT NULL;
CREATE TRIGGER planned_workouts_updated BEFORE UPDATE ON public.planned_workouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mcp_write_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool_name text NOT NULL,
  client_key text,
  record_table text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL,
  before_state jsonb,
  result jsonb,
  undone_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mcp_write_log TO authenticated;
GRANT ALL ON public.mcp_write_log TO service_role;
ALTER TABLE public.mcp_write_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own write log" ON public.mcp_write_log FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX mcp_write_log_key ON public.mcp_write_log(user_id, tool_name, client_key) WHERE client_key IS NOT NULL;
CREATE INDEX mcp_write_log_recent ON public.mcp_write_log(user_id, created_at DESC);

ALTER TABLE public.calorie_burns ADD COLUMN IF NOT EXISTS steps integer CHECK (steps IS NULL OR (steps >= 0 AND steps <= 200000));