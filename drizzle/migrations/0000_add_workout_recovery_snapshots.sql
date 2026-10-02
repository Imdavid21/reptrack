CREATE TABLE public.workout_recovery_snapshots (
  user_id uuid PRIMARY KEY,
  save_id text NOT NULL,
  snapshot jsonb NOT NULL,
  saved_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workout_recovery_snapshots TO authenticated;
GRANT ALL ON public.workout_recovery_snapshots TO service_role;
ALTER TABLE public.workout_recovery_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own workout recovery" ON public.workout_recovery_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.save_workout_recovery(p_save_id text, p_snapshot jsonb, p_saved_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR length(p_save_id) < 8 OR p_saved_at IS NULL OR p_saved_at > now() + interval '5 minutes' OR p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'Invalid workout recovery';
  END IF;
  INSERT INTO public.workout_recovery_snapshots(user_id,save_id,snapshot,saved_at,status)
  VALUES (auth.uid(),p_save_id,p_snapshot,p_saved_at,'active')
  ON CONFLICT (user_id) DO UPDATE SET save_id = EXCLUDED.save_id, snapshot = EXCLUDED.snapshot, saved_at = EXCLUDED.saved_at, status = 'active', updated_at = now()
  WHERE public.workout_recovery_snapshots.status = 'active' AND public.workout_recovery_snapshots.saved_at <= EXCLUDED.saved_at
     OR public.workout_recovery_snapshots.status = 'closed' AND public.workout_recovery_snapshots.save_id <> EXCLUDED.save_id AND public.workout_recovery_snapshots.saved_at <= EXCLUDED.saved_at;
END;
$$;
GRANT INSERT, UPDATE ON public.workout_recovery_snapshots TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_workout_recovery(text,jsonb,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.close_workout_recovery(p_save_id text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.workout_recovery_snapshots SET status = 'closed', updated_at = now(), saved_at = now()
  WHERE user_id = auth.uid() AND save_id = p_save_id AND status = 'active';
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_workout_recovery(text) TO authenticated;
CREATE POLICY "Users insert their own workout recovery" ON public.workout_recovery_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own workout recovery" ON public.workout_recovery_snapshots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);