-- Try enabling pgcrypto in public schema as fallback
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Also make sure extensions schema is in the search path
ALTER DATABASE postgres SET search_path TO public, extensions;