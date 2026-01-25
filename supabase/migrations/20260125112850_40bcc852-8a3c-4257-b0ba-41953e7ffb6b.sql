-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 1. Create daily_metrics table (one row per user per date)
-- ============================================================
CREATE TABLE public.daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  sleep_hours NUMERIC,
  energy_level INTEGER CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 10)),
  bodyweight NUMERIC,
  pullups INTEGER DEFAULT 0,
  notes TEXT,
  supplements JSONB DEFAULT '{"whey": false, "casein": false, "creatine": false, "omega3": false, "vitaminD": false, "magnesium": false, "zinc": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own metrics" ON public.daily_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own metrics" ON public.daily_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.daily_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own metrics" ON public.daily_metrics FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_metrics_updated_at
BEFORE UPDATE ON public.daily_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Create exercise_sets table (normalized sets)
-- ============================================================
CREATE TABLE public.exercise_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_category TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  target_weight NUMERIC,
  target_reps INTEGER,
  actual_weight NUMERIC,
  actual_reps INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own sets" ON public.exercise_sets FOR SELECT 
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = exercise_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can create own sets" ON public.exercise_sets FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = exercise_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can update own sets" ON public.exercise_sets FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = exercise_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can delete own sets" ON public.exercise_sets FOR DELETE 
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = exercise_sets.workout_id AND workouts.user_id = auth.uid()));

-- Indexes for fast lookups
CREATE INDEX idx_exercise_sets_workout ON public.exercise_sets(workout_id);
CREATE INDEX idx_exercise_sets_name ON public.exercise_sets(exercise_name);
CREATE INDEX idx_daily_metrics_user_date ON public.daily_metrics(user_id, date);