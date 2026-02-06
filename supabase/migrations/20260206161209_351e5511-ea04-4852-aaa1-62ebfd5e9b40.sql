CREATE OR REPLACE FUNCTION public.generate_api_key_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_key text;
BEGIN
  -- Generate a random 32-character key with prefix
  new_key := 'ftrk_' || substring(regexp_replace(encode(extensions.gen_random_bytes(24), 'base64'), '[^a-zA-Z0-9]', '', 'g') from 1 for 32);
  
  INSERT INTO public.api_keys (user_id, api_key)
  VALUES (NEW.id, new_key)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;