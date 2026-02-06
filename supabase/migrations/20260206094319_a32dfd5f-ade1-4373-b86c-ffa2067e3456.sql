-- Add routine configuration columns to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS training_split text DEFAULT 'ppl6',
ADD COLUMN IF NOT EXISTS rest_days jsonb DEFAULT '[0]',
ADD COLUMN IF NOT EXISTS routine_setup_completed boolean DEFAULT false;

-- Add skip tracking to workouts
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS is_skipped boolean DEFAULT false;