-- Morning check-ins table
CREATE TABLE public.morning_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_time TIME,
  wake_time TIME,
  sleep_hours NUMERIC,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  heart_rate INTEGER,
  oxygen_level INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Night check-ins table
CREATE TABLE public.night_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  performance_score INTEGER CHECK (performance_score >= 1 AND performance_score <= 10),
  energy_score INTEGER CHECK (energy_score >= 1 AND energy_score <= 10),
  steps INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Blood pressure readings (weekly)
CREATE TABLE public.blood_pressure_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  systolic INTEGER NOT NULL,
  diastolic INTEGER NOT NULL,
  pulse INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Blood sugar readings (monthly)
CREATE TABLE public.blood_sugar_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  glucose_level NUMERIC NOT NULL,
  reading_type TEXT DEFAULT 'fasting' CHECK (reading_type IN ('fasting', 'post_meal', 'random')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Meals with calorie tracking
CREATE TABLE public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT,
  calories INTEGER,
  photo_url TEXT,
  ai_detected_food TEXT,
  ai_confidence NUMERIC,
  is_confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.morning_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.night_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_pressure_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_sugar_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- RLS policies for morning_checkins
CREATE POLICY "Users can view own morning checkins" ON public.morning_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own morning checkins" ON public.morning_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own morning checkins" ON public.morning_checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own morning checkins" ON public.morning_checkins FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for night_checkins
CREATE POLICY "Users can view own night checkins" ON public.night_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own night checkins" ON public.night_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own night checkins" ON public.night_checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own night checkins" ON public.night_checkins FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for blood_pressure_readings
CREATE POLICY "Users can view own bp readings" ON public.blood_pressure_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bp readings" ON public.blood_pressure_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bp readings" ON public.blood_pressure_readings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bp readings" ON public.blood_pressure_readings FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for blood_sugar_readings
CREATE POLICY "Users can view own sugar readings" ON public.blood_sugar_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sugar readings" ON public.blood_sugar_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sugar readings" ON public.blood_sugar_readings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sugar readings" ON public.blood_sugar_readings FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for meals
CREATE POLICY "Users can view own meals" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meals" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for meal photos
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', true);

-- Storage policies for meal photos
CREATE POLICY "Users can upload own meal photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own meal photos" ON storage.objects FOR SELECT USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own meal photos" ON storage.objects FOR DELETE USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Meal photos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'meal-photos');

-- Triggers for updated_at
CREATE TRIGGER update_morning_checkins_updated_at BEFORE UPDATE ON public.morning_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_night_checkins_updated_at BEFORE UPDATE ON public.night_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();