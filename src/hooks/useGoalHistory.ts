import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { localDateKey } from '@/lib/dateKey';

/**
 * Every user-editable daily/weekly target that gets judged against logged
 * history over a date range (and therefore needs point-in-time resolution,
 * not "whatever the goal is right now"). Deliberately excludes weight_goal —
 * that's a one-time destination compared by trend direction, not a per-day
 * target — and settings-shaped fields (deficit target, maintenance calories,
 * rest timer, etc.) that aren't judged against a date range at all.
 */
export const GOAL_KEYS = [
  'daily_calorie_goal',
  'daily_protein_goal',
  'daily_carbs_goal',
  'daily_fat_goal',
  'daily_fiber_goal',
  'daily_sugar_goal',
  'daily_sodium_goal',
  'daily_potassium_goal',
  'daily_water_goal',
  'sleep_goal',
  'weekly_workout_goal',
] as const;

export type GoalKey = typeof GOAL_KEYS[number];

interface GoalHistoryEntry {
  goal_key: string;
  value: number;
  effective_from: string;
}

// Matches the migration's backfill sentinel — only needs to sort before every
// real logged day, not represent an actual date.
const GENESIS_DATE = '2000-01-01';

/**
 * Point-in-time goal resolution. `user_preferences.daily_*_goal` stays the
 * live/current value (still what "today" widgets and the edit UI read/show);
 * this hook layers an append-only ledger on top so historical charts can ask
 * "what was this goal on date X" instead of applying today's value to every
 * day in a range.
 */
export function useGoalHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { updatePreferences } = useUserPreferences();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['goal-history', user?.id],
    queryFn: async (): Promise<GoalHistoryEntry[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('goal_history')
        .select('goal_key, value, effective_from')
        .eq('user_id', user.id)
        .order('effective_from', { ascending: true });
      if (error) throw error;
      return data as GoalHistoryEntry[];
    },
    enabled: !!user,
  });

  // Grouped per goal, ascending by effective_from, so resolving a date is a
  // short backward walk rather than a query per lookup.
  const byKey = useMemo(() => {
    const map = new Map<string, GoalHistoryEntry[]>();
    for (const e of entries) {
      const list = map.get(e.goal_key);
      if (list) list.push(e);
      else map.set(e.goal_key, [e]);
    }
    return map;
  }, [entries]);

  /** What was `goalKey` set to on `dateKey` (yyyy-MM-dd)? Falls back to the
   *  given value (typically the live preference, or a hardcoded default) when
   *  there's no history yet — e.g. a goal never edited since this shipped. */
  const resolveGoal = useCallback((goalKey: GoalKey, dateKey: string, fallback: number): number => {
    const list = byKey.get(goalKey);
    if (!list || list.length === 0) return fallback;
    let resolved = fallback;
    for (const e of list) {
      if (e.effective_from <= dateKey) resolved = e.value;
      else break;
    }
    return resolved;
  }, [byKey]);

  const recordChange = useMutation({
    mutationFn: async ({ goalKey, value, effectiveFrom }: { goalKey: GoalKey; value: number; effectiveFrom: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('goal_history')
        .upsert(
          { user_id: user.id, goal_key: goalKey, value, effective_from: effectiveFrom },
          { onConflict: 'user_id,goal_key,effective_from' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-history'] });
    },
  });

  // Most goals have never been explicitly edited — they've been silently
  // running on a hardcoded frontend default (or whatever onboarding set,
  // for the few goals it touches) with zero history rows. If someone's
  // *first-ever* edit only recorded "effective today", every day before it
  // would resolve to the NEW value once there's any history at all — the
  // exact bug this feature exists to fix, just triggered by the first edit
  // instead of by pre-existing history. So: the first time a goal is ever
  // recorded, back-fill a genesis entry (dated before all real history) with
  // whatever was silently true immediately beforehand, so pre-edit days keep
  // resolving to it. A no-op for every edit after the first.
  const backfillGenesisIfNeeded = useCallback(async (goalKey: GoalKey, previousValue: number | null | undefined) => {
    if (previousValue == null || byKey.has(goalKey)) return;
    await recordChange.mutateAsync({ goalKey, value: previousValue, effectiveFrom: GENESIS_DATE });
  }, [byKey, recordChange]);

  /** Edit a single goal: updates the live preference and records today's value
   *  in the history ledger in one action — the only thing a simple inline
   *  editor (MacroChart, WaterTracker, a single calorie-goal field) needs;
   *  callers never touch user_preferences directly for a tracked goal.
   *  Pass `previousValue` (whatever the caller was showing before this edit,
   *  e.g. the live preference or a hardcoded default) so a first-ever edit
   *  can back-fill its genesis entry correctly. */
  const setGoal = useCallback(async (goalKey: GoalKey, value: number, previousValue?: number | null) => {
    await backfillGenesisIfNeeded(goalKey, previousValue);
    const lockField = goalKey === 'daily_calorie_goal'
      ? { calorie_target_locked: true }
      : goalKey === 'daily_protein_goal'
        ? { protein_target_locked: true }
        : {};
    await updatePreferences.mutateAsync({ [goalKey]: value, ...lockField } as any);
    await recordChange.mutateAsync({ goalKey, value, effectiveFrom: localDateKey(new Date()) });
  }, [backfillGenesisIfNeeded, updatePreferences, recordChange]);

  /** History-ledger-only recorder, for editors that save several fields in one
   *  bundled updatePreferences call already (e.g. a goals form) — call this
   *  per tracked field that changed instead of setGoal, so the preference
   *  isn't written twice. Same `previousValue` genesis-backfill as setGoal. */
  const recordGoalHistory = useCallback(async (goalKey: GoalKey, value: number, previousValue?: number | null) => {
    await backfillGenesisIfNeeded(goalKey, previousValue);
    await recordChange.mutateAsync({ goalKey, value, effectiveFrom: localDateKey(new Date()) });
  }, [backfillGenesisIfNeeded, recordChange]);

  return {
    resolveGoal,
    setGoal,
    recordGoalHistory,
    isLoading,
    isSaving: updatePreferences.isPending || recordChange.isPending,
  };
}
