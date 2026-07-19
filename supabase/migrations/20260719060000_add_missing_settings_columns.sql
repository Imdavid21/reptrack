-- Settings.tsx has read/written these three user_preferences fields via
-- (preferences as any) since it was built, but none were ever added to the
-- schema. PostgREST rejects unknown columns in an UPDATE payload, so the
-- "Default Rest Timer" and "Auto-start Rest Timer" controls could never
-- persist — and because handleSaveProfile bundles `name` into the same
-- update() call as the real age/height_cm/gender columns, profile saves
-- have likely been silently failing on every attempt.
--
-- Not adding a `weight_unit` column: the schema already has an equivalent,
-- equally-unused `units_system` ('metric' | 'imperial') column, so the
-- Settings UI is being rewired to use that instead of creating a duplicate.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS default_rest_seconds integer DEFAULT 90,
  ADD COLUMN IF NOT EXISTS auto_rest_timer boolean DEFAULT true;
