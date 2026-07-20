-- Point-in-time goal tracking: every daily/weekly target the user can edit
-- (calorie, protein, carbs, fat, fiber, sugar, sodium, water, sleep, weekly
-- workouts) is versioned here so historical charts can judge a past day
-- against the target that was ACTUALLY active that day, instead of
-- retroactively re-judging all of history against whatever the target
-- happens to be right now. Generic (goal_key, value, effective_from) shape
-- so adding a new goal type in the future needs zero schema changes.
--
-- user_preferences.daily_*_goal columns remain the live/current values (used
-- for "today" widgets and as the value shown when editing) — this table is
-- purely an append-only ledger for historical resolution alongside them.
CREATE TABLE IF NOT EXISTS public.goal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_key text NOT NULL,
  value numeric NOT NULL,
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_key, effective_from)
);

ALTER TABLE public.goal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goal history"
ON public.goal_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goal_history_lookup
ON public.goal_history (user_id, goal_key, effective_from DESC);

-- Backfill one genesis row per existing user per currently-set goal, so every
-- past day has a value to resolve to without inventing false precision about
-- when it changed. effective_from is a fixed far-past sentinel (not each
-- user's actual signup date) — it only needs to sort before every real
-- logged day, and every future edit inserts its own dated row from here on.
INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'daily_calorie_goal', daily_calorie_goal, '2000-01-01'
FROM public.user_preferences WHERE daily_calorie_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'daily_protein_goal', daily_protein_goal, '2000-01-01'
FROM public.user_preferences WHERE daily_protein_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'daily_carbs_goal', daily_carbs_goal, '2000-01-01'
FROM public.user_preferences WHERE daily_carbs_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'daily_fat_goal', daily_fat_goal, '2000-01-01'
FROM public.user_preferences WHERE daily_fat_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'daily_fiber_goal', daily_fiber_goal, '2000-01-01'
FROM public.user_preferences WHERE daily_fiber_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'daily_sugar_goal', daily_sugar_goal, '2000-01-01'
FROM public.user_preferences WHERE daily_sugar_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'daily_sodium_goal', daily_sodium_goal, '2000-01-01'
FROM public.user_preferences WHERE daily_sodium_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'daily_water_goal', daily_water_goal, '2000-01-01'
FROM public.user_preferences WHERE daily_water_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'sleep_goal', sleep_goal, '2000-01-01'
FROM public.user_preferences WHERE sleep_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;

INSERT INTO public.goal_history (user_id, goal_key, value, effective_from)
SELECT user_id, 'weekly_workout_goal', weekly_workout_goal, '2000-01-01'
FROM public.user_preferences WHERE weekly_workout_goal IS NOT NULL
ON CONFLICT (user_id, goal_key, effective_from) DO NOTHING;
