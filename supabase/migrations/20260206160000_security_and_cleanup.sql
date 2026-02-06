-- Drop deprecated columns from morning_checkins
ALTER TABLE public.morning_checkins
DROP COLUMN IF EXISTS oxygen_level,
DROP COLUMN IF EXISTS heart_rate;

-- Explicitly deny anonymous access to morning_checkins
CREATE POLICY "Deny anonymous access"
ON public.morning_checkins
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Explicitly deny anonymous access to api_keys
CREATE POLICY "Deny anonymous access"
ON public.api_keys
FOR SELECT
USING (auth.uid() IS NOT NULL);
