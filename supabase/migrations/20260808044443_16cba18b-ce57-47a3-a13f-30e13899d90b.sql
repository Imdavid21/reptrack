DROP TRIGGER IF EXISTS on_auth_user_created_generate_api_key ON auth.users;
DROP FUNCTION IF EXISTS public.generate_api_key_for_user();