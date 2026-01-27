-- Drop the old constraint that's too strict
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_key_format;

-- Add a more flexible constraint
ALTER TABLE public.api_keys ADD CONSTRAINT api_key_format CHECK (api_key ~ '^ftrk_[a-zA-Z0-9]{28,36}$');