import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { findBestMatch } from '@/lib/exerciseMatching';
import { fetchAllRows } from '@/lib/supabasePaging';

export interface LastUsedSetData {
  weight: number;
  reps: number;
}

export interface LastUsedData {
  weight: number;
  reps: number;
  sets: number;
  date: string;
  /** Per-set data from the most recent workout, ordered by set number */
  perSet: LastUsedSetData[];
}

/**
 * Hook to get last used weight/reps for each exercise.
 * This helps pre-fill values when logging sets.
 *
 * Reads from the `exercises` table — the table every workout write actually
 * populates (one row per completed set, named "<Exercise> (Set N)", with
 * `actual_weight`/`actual_reps` stored as strings). An earlier version queried a
 * separate `exercise_sets` table that nothing ever writes to, so this hook
 * always returned {} — silently disabling every "last: …" prefill and starving
 * the progression engine (useNextWorkout) of history.
 *
 * For each exercise we find the most recent workout that included it and store
 * every completed set from that workout so the UI can show per-set "last:" hints
 * (e.g. Set 1 today shows Set 1 from last time).
 */
export function useLastUsedWeights() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['lastUsedWeights', user?.id],
    queryFn: async () => {
      if (!user) return {};

      // Every completed set row, joined to its workout for the date.
      // `exercises` has no created_at column, so we order recency by the
      // workout date (and set number within a workout).
      // Paged — an unpaged select stops at PostgREST's 1000-row ceiling, so on
      // a long history the newest sets (the ones we actually want to prefill
      // from) were the first to be dropped.
      const data = await fetchAllRows<any>((from, to) =>
        supabase
          .from('exercises')
          .select(`
            name,
            actual_weight,
            actual_reps,
            sort_order,
            workout_id,
            workouts!inner (user_id, date)
          `)
          .eq('workouts.user_id', user.id)
          .eq('completed', true)
          .order('id', { ascending: true })
          .range(from, to),
      );

      // Flatten rows, stripping the " (Set N)" suffix to get the exercise name
      // and parsing the string weight/reps columns to numbers.
      const rows = (data || []).map((r) => {
        const rawName = r.name || '';
        const baseName = rawName.replace(/\s*\(Set \d+\)$/, '').trim();
        const setMatch = rawName.match(/\(Set (\d+)\)$/);
        const setNumber = setMatch ? parseInt(setMatch[1], 10) : 1;
        const workout = r.workouts as unknown as { date: string };
        return {
          baseName,
          setNumber,
          weight: parseFloat(r.actual_weight || '0') || 0,
          reps: parseFloat(r.actual_reps || '0') || 0,
          workoutId: r.workout_id as string,
          date: workout?.date ?? '',
        };
      });

      // Most recent workout per exercise = the one with the greatest date.
      // Date keys are 'yyyy-MM-dd', so string comparison orders them correctly.
      const mostRecent: Record<string, { workoutId: string; date: string }> = {};
      for (const row of rows) {
        if (!row.baseName) continue;
        const cur = mostRecent[row.baseName];
        if (!cur || row.date > cur.date) {
          mostRecent[row.baseName] = { workoutId: row.workoutId, date: row.date };
        }
      }

      // Collect every set from that most-recent workout, ordered by set number.
      const collected: Record<string, Array<{ setNumber: number; weight: number; reps: number }>> = {};
      const dateByName: Record<string, string> = {};
      for (const row of rows) {
        const best = mostRecent[row.baseName];
        if (!best || row.workoutId !== best.workoutId) continue;
        (collected[row.baseName] ??= []).push({ setNumber: row.setNumber, weight: row.weight, reps: row.reps });
        dateByName[row.baseName] = best.date;
      }

      const lastUsedMap: Record<string, LastUsedData> = {};
      for (const [name, sets] of Object.entries(collected)) {
        sets.sort((a, b) => a.setNumber - b.setNumber);
        const perSet: LastUsedSetData[] = sets.map((s) => ({ weight: s.weight, reps: s.reps }));
        lastUsedMap[name] = {
          weight: perSet[0]?.weight ?? 0,
          reps: perSet[0]?.reps ?? 0,
          sets: perSet.length,
          date: dateByName[name],
          perSet,
        };
      }

      return lastUsedMap;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getLastUsed = (exerciseName: string): LastUsedData | undefined => {
    return findBestMatch(exerciseName, query.data);
  };

  return {
    lastUsedMap: query.data || {},
    getLastUsed,
    isLoading: query.isLoading,
  };
}
