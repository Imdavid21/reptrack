-- Lets a user hide the BMR/maintenance breakdown tile on the dashboard's
-- deficit card (Settings > Deficit Mode > "Show BMR on dashboard"). Defaults
-- to true so existing users see no change until they opt out — the tile
-- already always showed before this toggle existed.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS show_bmr_on_dashboard boolean DEFAULT true;
