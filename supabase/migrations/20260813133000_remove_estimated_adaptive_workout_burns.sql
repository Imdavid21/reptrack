-- Adaptive workouts previously stored the programme's planned duration as if
-- it were the user's elapsed duration. Those derived calorie-burn rows are
-- invalid (for example, one logged rep could be credited as a 105-minute
-- session). Keep the workout/set history, but remove only the invalid
-- generated estimate. Future sessions persist their real start/end times.
DELETE FROM public.calorie_burns AS burn
USING public.workouts AS workout
WHERE burn.source = 'workout'
  AND burn.activity_type = 'workout:' || workout.id::text
  AND workout.session_key IS NOT NULL
  AND workout.started_at IS NULL;

UPDATE public.workouts
SET workout_duration_minutes = NULL
WHERE session_key IS NOT NULL
  AND started_at IS NULL;
