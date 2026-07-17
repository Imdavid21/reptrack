-- Training focus drives how sets/reps/rest are programmed for every exercise:
-- 'strength' (low reps, more rest), 'volume' (high reps, more sets, shorter
-- rest), or 'mix' (default — alternates per each day's own heavy/volume bias,
-- the original per-split behavior). See src/lib/programmingEngine.ts.
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS training_focus text DEFAULT 'mix';
