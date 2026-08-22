-- First-class caffeine intake tracking.
-- Entries are timestamped so the app can preserve intake timing instead of
-- collapsing caffeine into a daily metric or attaching it to meals.

alter table public.user_preferences
  add column if not exists daily_caffeine_limit numeric not null default 400;

alter table public.user_preferences
  drop constraint if exists user_preferences_daily_caffeine_limit_check;

alter table public.user_preferences
  add constraint user_preferences_daily_caffeine_limit_check
  check (daily_caffeine_limit > 0 and daily_caffeine_limit <= 2000);

create table if not exists public.caffeine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_mg numeric not null check (amount_mg > 0 and amount_mg <= 2000),
  source text not null default 'other'
    check (source in ('coffee', 'espresso', 'tea', 'energy_drink', 'pre_workout', 'soda', 'medication', 'other')),
  label text,
  timestamp timestamptz not null default now(),
  method text not null default 'manual'
    check (method in ('manual', 'automation')),
  created_at timestamptz not null default now()
);

create index if not exists caffeine_logs_user_timestamp_idx
  on public.caffeine_logs (user_id, timestamp desc);

alter table public.caffeine_logs enable row level security;

drop policy if exists "Users can view own caffeine logs" on public.caffeine_logs;
create policy "Users can view own caffeine logs"
  on public.caffeine_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own caffeine logs" on public.caffeine_logs;
create policy "Users can create own caffeine logs"
  on public.caffeine_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own caffeine logs" on public.caffeine_logs;
create policy "Users can update own caffeine logs"
  on public.caffeine_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own caffeine logs" on public.caffeine_logs;
create policy "Users can delete own caffeine logs"
  on public.caffeine_logs for delete
  using (auth.uid() = user_id);

-- MCP writes happen outside the browser. Publish this table so an open client
-- receives those inserts/updates immediately through the same realtime path
-- used by the caffeine hook, rather than waiting for a navigation/refetch.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'caffeine_logs'
     ) then
    alter publication supabase_realtime add table public.caffeine_logs;
  end if;
end $$;
