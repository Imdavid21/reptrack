-- Caffeine is part of food and drink logging rather than a parallel intake log.
-- Existing meals stay unknown (NULL); new food-analysis/manual flows can store an
-- explicit estimate, including 0 mg when the item is known to be caffeine-free.
-- `created_at` remains the database audit timestamp; `consumed_at` records when the
-- food/drink was actually consumed. Historical rows are deliberately not backfilled
-- from `created_at`, because that would create false precision for backdated logs.

alter table public.user_preferences
  add column if not exists daily_caffeine_limit numeric not null default 400;

alter table public.user_preferences
  drop constraint if exists user_preferences_daily_caffeine_limit_check;

alter table public.user_preferences
  add constraint user_preferences_daily_caffeine_limit_check
  check (daily_caffeine_limit > 0 and daily_caffeine_limit <= 2000);

alter table public.meals
  add column if not exists caffeine_mg numeric;

alter table public.meals
  add column if not exists consumed_at timestamptz;

alter table public.meals
  drop constraint if exists meals_caffeine_mg_check;

alter table public.meals
  add constraint meals_caffeine_mg_check
  check (caffeine_mg is null or (caffeine_mg >= 0 and caffeine_mg <= 2000));

create index if not exists meals_user_consumed_at_idx
  on public.meals (user_id, consumed_at desc)
  where consumed_at is not null;

comment on column public.meals.caffeine_mg is
  'Estimated caffeine in milligrams for this food/drink log. NULL means caffeine was not assessed; 0 means assessed as caffeine-free.';

comment on column public.meals.consumed_at is
  'Timestamp when the food or drink was consumed. NULL means the occurrence time is unknown; created_at remains the row creation/audit timestamp.';
