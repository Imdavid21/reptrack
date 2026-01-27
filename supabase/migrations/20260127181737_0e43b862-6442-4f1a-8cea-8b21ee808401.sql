-- Create API keys table for user authentication
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  CONSTRAINT api_key_format CHECK (api_key ~ '^ftrk_[a-zA-Z0-9]{32}$')
);

-- Create unique index on user_id (one key per user)
CREATE UNIQUE INDEX idx_api_keys_user_id ON public.api_keys(user_id);

-- Create index on api_key for fast lookups
CREATE INDEX idx_api_keys_key ON public.api_keys(api_key);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own API key
CREATE POLICY "Users can view own API key"
ON public.api_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own API key
CREATE POLICY "Users can create own API key"
ON public.api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own API key (for regeneration)
CREATE POLICY "Users can delete own API key"
ON public.api_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Function to generate API key on user signup
CREATE OR REPLACE FUNCTION public.generate_api_key_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_key text;
BEGIN
  -- Generate a random 32-character key with prefix
  new_key := 'ftrk_' || encode(gen_random_bytes(24), 'base64');
  -- Clean up base64 to alphanumeric only and truncate
  new_key := 'ftrk_' || substring(regexp_replace(encode(gen_random_bytes(24), 'base64'), '[^a-zA-Z0-9]', '', 'g') from 1 for 32);
  
  INSERT INTO public.api_keys (user_id, api_key)
  VALUES (NEW.id, new_key)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate API key for new users
CREATE TRIGGER on_auth_user_created_generate_api_key
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.generate_api_key_for_user();