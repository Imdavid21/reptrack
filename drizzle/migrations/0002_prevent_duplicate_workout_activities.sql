CREATE UNIQUE INDEX IF NOT EXISTS calorie_burns_one_activity_per_workout
ON public.calorie_burns (user_id, activity_type)
WHERE source = 'workout' AND activity_type LIKE 'workout:%';

CREATE OR REPLACE FUNCTION public.validate_workout_activity_duration()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.source = 'workout' AND NEW.duration_minutes IS NOT NULL
     AND (NEW.duration_minutes <= 0 OR NEW.duration_minutes > 600) THEN
    RAISE EXCEPTION 'Workout activity duration must be between 1 and 600 minutes';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_workout_activity_duration ON public.calorie_burns;
CREATE TRIGGER validate_workout_activity_duration
BEFORE INSERT OR UPDATE ON public.calorie_burns
FOR EACH ROW EXECUTE FUNCTION public.validate_workout_activity_duration();

CREATE OR REPLACE FUNCTION public.validate_workout_duration()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.workout_duration_minutes IS NOT NULL
     AND (NEW.workout_duration_minutes < 0 OR NEW.workout_duration_minutes > 600) THEN
    RAISE EXCEPTION 'Workout duration must be between 0 and 600 minutes';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_workout_duration ON public.workouts;
CREATE TRIGGER validate_workout_duration
BEFORE INSERT OR UPDATE OF workout_duration_minutes ON public.workouts
FOR EACH ROW EXECUTE FUNCTION public.validate_workout_duration();