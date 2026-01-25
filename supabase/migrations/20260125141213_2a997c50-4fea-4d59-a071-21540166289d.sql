-- Add user_preferences table for onboarding data and goals
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  daily_water_goal NUMERIC DEFAULT 3,
  daily_calorie_goal INTEGER DEFAULT 2000,
  weekly_workout_goal INTEGER DEFAULT 4,
  sleep_goal NUMERIC DEFAULT 8,
  weight_goal NUMERIC,
  weight_goal_type TEXT CHECK (weight_goal_type IN ('lose', 'gain', 'maintain')),
  units_system TEXT DEFAULT 'metric' CHECK (units_system IN ('metric', 'imperial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();