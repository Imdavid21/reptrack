-- Add pre-workout and post-workout check-in fields to workouts table
ALTER TABLE public.workouts
ADD COLUMN pre_energy integer CHECK (pre_energy >= 1 AND pre_energy <= 10),
ADD COLUMN pre_motivation integer CHECK (pre_motivation >= 1 AND pre_motivation <= 10),
ADD COLUMN pre_soreness integer CHECK (pre_soreness >= 1 AND pre_soreness <= 10),
ADD COLUMN post_difficulty integer CHECK (post_difficulty >= 1 AND post_difficulty <= 10),
ADD COLUMN post_satisfaction integer CHECK (post_satisfaction >= 1 AND post_satisfaction <= 10),
ADD COLUMN workout_duration_minutes integer,
ADD COLUMN started_at timestamp with time zone,
ADD COLUMN completed_at timestamp with time zone;