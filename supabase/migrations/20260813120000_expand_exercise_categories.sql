-- Adaptive sessions persist preparation, training, and cooldown phases.
-- This only widens the accepted values; no existing workout data is changed.
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_category_check;

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_category_check CHECK (category IN (
    'warmup', 'mobility', 'activation', 'primary', 'compound',
    'specialization', 'accessory', 'core', 'cooldown'
  ));
