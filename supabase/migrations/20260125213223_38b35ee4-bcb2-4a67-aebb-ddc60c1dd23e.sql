-- =====================================================
-- V1 ARCHITECTURE OVERHAUL: Exercise Taxonomy + Recovery Tracking
-- =====================================================

-- 1. EXERCISE TEMPLATES TABLE (versioned exercise definitions)
-- This preserves historical context when users modify exercises
CREATE TABLE IF NOT EXISTS public.exercise_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  canonical_name text NOT NULL,
  category text NOT NULL, -- Push, Pull, Legs
  primary_muscles text[] NOT NULL DEFAULT '{}',
  secondary_muscles text[] DEFAULT '{}',
  equipment text NOT NULL DEFAULT 'barbell',
  movement_pattern text NOT NULL DEFAULT 'push', -- push, pull, hinge, squat, carry, isolation
  default_weight text,
  default_reps text,
  version integer NOT NULL DEFAULT 1,
  deprecated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on exercise_templates
ALTER TABLE public.exercise_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.exercise_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates" ON public.exercise_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.exercise_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.exercise_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 2. RECOVERY METRICS TABLE (fatigue tracking)
CREATE TABLE IF NOT EXISTS public.recovery_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  recovery_score integer, -- 0-100 calculated score
  hrv_ms integer, -- Heart Rate Variability (if available)
  resting_hr integer, -- Morning resting heart rate
  sleep_quality integer, -- 1-10
  muscle_soreness integer, -- 1-10 (1 = no soreness, 10 = very sore)
  fatigue_level integer, -- 1-10 (1 = fresh, 10 = exhausted)
  stress_level integer, -- 1-10
  workout_readiness integer, -- 0-100 AI-calculated
  deload_recommended boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on recovery_metrics
ALTER TABLE public.recovery_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recovery" ON public.recovery_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recovery" ON public.recovery_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery" ON public.recovery_metrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recovery" ON public.recovery_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- 3. DELOAD WEEKS TABLE (programmed recovery weeks)
CREATE TABLE IF NOT EXISTS public.deload_weeks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  trigger_reason text NOT NULL, -- 'scheduled', 'ai_recommended', 'manual', 'overtraining'
  volume_reduction_percent integer DEFAULT 40,
  intensity_reduction_percent integer DEFAULT 20,
  fatigue_indicators jsonb, -- snapshot of metrics that triggered deload
  completed boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS on deload_weeks
ALTER TABLE public.deload_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deloads" ON public.deload_weeks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deloads" ON public.deload_weeks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deloads" ON public.deload_weeks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deloads" ON public.deload_weeks
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Add template reference to exercise_sets
ALTER TABLE public.exercise_sets 
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.exercise_templates(id),
  ADD COLUMN IF NOT EXISTS template_snapshot jsonb; -- preserves exercise config at time of workout

-- 5. Add primary_muscles and movement_pattern to exercise_sets for analytics
ALTER TABLE public.exercise_sets
  ADD COLUMN IF NOT EXISTS primary_muscles text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS movement_pattern text;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_templates_user ON public.exercise_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_templates_canonical ON public.exercise_templates(canonical_name);
CREATE INDEX IF NOT EXISTS idx_recovery_metrics_user_date ON public.recovery_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_deload_weeks_user ON public.deload_weeks(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_muscles ON public.exercise_sets USING GIN(primary_muscles);