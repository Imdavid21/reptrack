CREATE TABLE IF NOT EXISTS public.advanced_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  enabled boolean not null default false,
  specialization_muscles text[] not null default '{}',
  session_volume_modifier numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advanced_settings TO authenticated;
GRANT ALL ON public.advanced_settings TO service_role;
ALTER TABLE public.advanced_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own advanced settings" ON public.advanced_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_advanced_settings_updated_at BEFORE UPDATE ON public.advanced_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.gym_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bar_weight_kg numeric not null default 20,
  plates_kg numeric[] not null default '{25,20,15,10,5,2.5,1.25}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_profiles TO authenticated;
GRANT ALL ON public.gym_profiles TO service_role;
ALTER TABLE public.gym_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gym profiles" ON public.gym_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_gym_profiles_updated_at BEFORE UPDATE ON public.gym_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  focus text,
  starts_on date not null default current_date,
  ends_on date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_blocks TO authenticated;
GRANT ALL ON public.training_blocks TO service_role;
ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own training blocks" ON public.training_blocks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_training_blocks_updated_at BEFORE UPDATE ON public.training_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.training_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  metric text not null,
  baseline numeric,
  target numeric,
  starts_on date not null default current_date,
  ends_on date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_experiments TO authenticated;
GRANT ALL ON public.training_experiments TO service_role;
ALTER TABLE public.training_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own training experiments" ON public.training_experiments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_training_experiments_updated_at BEFORE UPDATE ON public.training_experiments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.coach_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  event_date date not null default current_date,
  payload jsonb not null default '{}',
  dedupe_key text,
  created_at timestamptz not null default now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coach_events_user_dedupe_idx ON public.coach_events (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_events TO authenticated;
GRANT ALL ON public.coach_events TO service_role;
ALTER TABLE public.coach_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coach events" ON public.coach_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);