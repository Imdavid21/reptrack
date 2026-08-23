CREATE TABLE public.live_workout_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  draft_id text,
  date date NOT NULL DEFAULT (now()::date),
  day text,
  day_name text,
  week_number integer,
  status text NOT NULL DEFAULT 'active',
  current_exercise text,
  current_exercise_index integer NOT NULL DEFAULT 0,
  current_set_index integer NOT NULL DEFAULT 0,
  completed_sets integer NOT NULL DEFAULT 0,
  total_sets integer NOT NULL DEFAULT 0,
  total_volume numeric NOT NULL DEFAULT 0,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  coach_note text,
  coach_note_at timestamp with time zone,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT live_workout_sessions_user_unique UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_workout_sessions TO authenticated;
GRANT ALL ON public.live_workout_sessions TO service_role;
ALTER TABLE public.live_workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own live session" ON public.live_workout_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_live_workout_sessions_updated_at BEFORE UPDATE ON public.live_workout_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workout_triggers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'mcp',
  condition_type text NOT NULL,
  exercise_name text,
  threshold numeric,
  comparator text NOT NULL DEFAULT 'gte',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  repeat_mode text NOT NULL DEFAULT 'once',
  fired_at timestamp with time zone,
  fired_count integer NOT NULL DEFAULT 0,
  acknowledged_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_triggers TO authenticated;
GRANT ALL ON public.workout_triggers TO service_role;
ALTER TABLE public.workout_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own workout triggers" ON public.workout_triggers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX workout_triggers_user_status_idx ON public.workout_triggers (user_id, status);
CREATE TRIGGER update_workout_triggers_updated_at BEFORE UPDATE ON public.workout_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();