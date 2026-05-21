ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS daily_protein_goal integer NOT NULL DEFAULT 180;