import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { findBestMatch } from '@/lib/exerciseMatching';

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
 * For each exercise we find the most recent workout that included it
 * and store every completed set from that workout so the UI can show
 * per-set "last:" hints (e.g. Set 1 today shows Set 1 from last time).
 */
export function useLastUsedWeights() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['lastUsedWeights', user?.id],
    queryFn: async () => {
      if (!user) return {};

      // Get most recent completed sets per exercise
      // Note: we don't filter out null actual_weight so bodyweight/timed exercises are included
      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
          exercise_name,
          actual_weight,
          actual_reps,
          set_number,
          workout_id,
          created_at,
          workouts!inner (user_id, date)
        `)
        .eq('workouts.user_id', user.id)
        .eq('completed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Track the most recent workout_id per exercise, and collect all sets from it.
      // Data is ordered created_at DESC, so the first row for an exercise is from
      // its most recent workout.
      const lastUsedMap: Record<string, LastUsedData> = {};
      const seenWorkout: Record<string, string> = {}; // exercise -> workout_id

      for (const set of data || []) {
        const name = set.exercise_name;

        // First time we see this exercise → record which workout it came from
        if (!seenWorkout[name]) {
          seenWorkout[name] = set.workout_id;
          lastUsedMap[name] = {
            weight: set.actual_weight || 0,
            reps: set.actual_reps || 0,
            sets: 0,
            date: (set.workouts as any).date,
            perSet: [],
          };
        }

        // Only collect sets from the same (most recent) workout
        if (set.workout_id !== seenWorkout[name]) continue;

        const entry = lastUsedMap[name];
        entry.sets++;

        if (set.actual_reps) {
          entry.perSet.push({
            weight: set.actual_weight || 0,
            reps: set.actual_reps,
          });
        }
      }

      // perSet is currently newest-first (created_at DESC) → reverse to
      // get Set 1 at index 0, Set 2 at index 1, etc.
      for (const entry of Object.values(lastUsedMap)) {
        entry.perSet.reverse();
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
