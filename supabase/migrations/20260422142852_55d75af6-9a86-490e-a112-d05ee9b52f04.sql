
-- Add hashed storage for API keys
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_hash text,
  ADD COLUMN IF NOT EXISTS key_prefix text;

-- Backfill existing rows: hash the existing plaintext keys, set prefix
UPDATE public.api_keys
SET 
  key_hash = encode(extensions.digest(api_key, 'sha256'), 'hex'),
  key_prefix = substring(api_key from 1 for 12)
WHERE key_hash IS NULL;

-- Make new columns required + unique on hash + index on prefix for lookups
ALTER TABLE public.api_keys
  ALTER COLUMN key_hash SET NOT NULL,
  ALTER COLUMN key_prefix SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_unique ON public.api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_key_prefix_idx ON public.api_keys (key_prefix);

-- Drop the plaintext column entirely
ALTER TABLE public.api_keys DROP COLUMN api_key;

-- Tighten RLS: users may SEE metadata (prefix, timestamps) but never the hash.
-- The hash column is still queryable only by service_role (which bypasses RLS).
-- We add a column-level revoke so even if a SELECT policy returns rows, key_hash
-- isn't exposed to authenticated/anon clients.
REVOKE SELECT (key_hash) ON public.api_keys FROM anon, authenticated;

-- Update the auto-generation trigger function to store hash + prefix instead of plaintext.
-- The plaintext key is intentionally NOT persisted; users will need to regenerate via the
-- edge function to obtain a usable key going forward.
CREATE OR REPLACE FUNCTION public.generate_api_key_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_key text;
BEGIN
  new_key := 'ftrk_' || substring(regexp_replace(encode(extensions.gen_random_bytes(24), 'base64'), '[^a-zA-Z0-9]', '', 'g') from 1 for 32);

  INSERT INTO public.api_keys (user_id, key_hash, key_prefix)
  VALUES (
    NEW.id,
    encode(extensions.digest(new_key, 'sha256'), 'hex'),
    substring(new_key from 1 for 12)
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Add the missing DELETE policy on user_preferences (separate finding flagged the same view)
CREATE POLICY "Users can delete own preferences"
ON public.user_preferences
FOR DELETE
USING (auth.uid() = user_id);
