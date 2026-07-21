-- Persist the raw distance behind a manually-logged activity, alongside the
-- already-stored duration_minutes and calories. Previously only the computed
-- outputs were saved, so a burn logged with both distance and time couldn't
-- be re-derived or corrected later — the original distance was lost the
-- moment it was saved.
ALTER TABLE public.calorie_burns
  ADD COLUMN IF NOT EXISTS distance_km numeric;
