-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Workouts table
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  day TEXT NOT NULL,
  day_name TEXT NOT NULL,
  week_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workouts" ON public.workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workouts" ON public.workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts" ON public.workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Exercises table
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('warmup', 'primary', 'accessory')),
  target_weight TEXT,
  target_reps TEXT,
  actual_weight TEXT,
  actual_reps TEXT,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercises" ON public.exercises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create own exercises" ON public.exercises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own exercises" ON public.exercises
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own exercises" ON public.exercises
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid())
  );

-- Habits table
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE UNIQUE,
  pullups INTEGER DEFAULT 0,
  water_intake DECIMAL(4,2) DEFAULT 0,
  sleep_hours DECIMAL(4,2) DEFAULT 0,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  bodyweight DECIMAL(5,2),
  notes TEXT,
  supplements JSONB DEFAULT '{
    "whey": false,
    "casein": false,
    "creatine": false,
    "omega3": false,
    "vitaminD": false,
    "magnesium": false,
    "zinc": false
  }'::jsonb
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits" ON public.habits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create own habits" ON public.habits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own habits" ON public.habits
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid())
  );

-- Water logs table for automation
CREATE TABLE public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount DECIMAL(4,2) DEFAULT 0.25,
  method TEXT DEFAULT 'manual' CHECK (method IN ('manual', 'automation'))
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water logs" ON public.water_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own water logs" ON public.water_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own water logs" ON public.water_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Custom routines table for AI-generated or manual routines
CREATE TABLE public.custom_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_name TEXT NOT NULL,
  routine_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.custom_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routines" ON public.custom_routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own routines" ON public.custom_routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines" ON public.custom_routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines" ON public.custom_routines
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure only one active routine per user
CREATE OR REPLACE FUNCTION public.ensure_single_active_routine()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE public.custom_routines
    SET is_active = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_active_routine_trigger
  BEFORE INSERT OR UPDATE ON public.custom_routines
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_routine();

-- Create indexes for performance
CREATE INDEX idx_workouts_user_date ON public.workouts(user_id, date);
CREATE INDEX idx_exercises_workout ON public.exercises(workout_id);
CREATE INDEX idx_water_logs_user_timestamp ON public.water_logs(user_id, timestamp);
CREATE INDEX idx_custom_routines_user_active ON public.custom_routines(user_id, is_active);