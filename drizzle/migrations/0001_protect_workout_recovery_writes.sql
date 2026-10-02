REVOKE INSERT, UPDATE ON public.workout_recovery_snapshots FROM authenticated;
ALTER FUNCTION public.save_workout_recovery(text,jsonb,timestamptz) SECURITY DEFINER;
ALTER FUNCTION public.close_workout_recovery(text) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.save_workout_recovery(text,jsonb,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_workout_recovery(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_workout_recovery(text,jsonb,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_workout_recovery(text) TO authenticated;