import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getExerciseType, type ExerciseType } from '@/lib/exerciseLibrary';
import { getCanonicalName, EXERCISE_ALIASES } from '@/lib/exerciseMatching';

export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  reps: string;
  date: string;
  /** The type of PR: 'weight' (heaviest), 'reps' (most reps, for bodyweight), 'duration' (longest hold, for timed) */
  prType?: 'weight' | 'reps' | 'duration';
}

// Re-exported for usePersonalRecords.test.ts and any other historical
// importer — the canonical name resolution itself now lives in
// exerciseMatching.ts, shared with last-used-weight and workout-logging
// matching so a lift can't unify for one and split into two PR lines for
// the other.
export { getCanonicalName, EXERCISE_ALIASES };

export function usePersonalRecords() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['personalRecords', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all completed exercises (not just those with weight)
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select(`
          name,
          actual_weight,
          actual_reps,
          workouts!inner (
            date,
            user_id
          )
        `)
        .eq('workouts.user_id', user.id);

      if (error) throw error;

      // Find PRs per exercise — NO whitelist, track ALL exercises
      const prMap: Record<string, PersonalRecord> = {};

      for (const ex of exercises || []) {
        const canonicalName = getCanonicalName(ex.name);
        const exType = getExerciseType(canonicalName);
        const workout = ex.workouts as unknown as { date: string };

        if (exType === 'timed') {
          // Timed: PR = longest duration (stored in actual_reps as seconds)
          const duration = parseFloat(ex.actual_reps || '0');
          if (isNaN(duration) || duration === 0) continue;

          if (!prMap[canonicalName] || duration > prMap[canonicalName].maxWeight) {
            prMap[canonicalName] = {
              exerciseName: canonicalName,
              maxWeight: duration,
              reps: `${duration}s`,
              date: workout.date,
              prType: 'duration',
            };
          }
        } else if (exType === 'bodyweight') {
          // Bodyweight: PR = max reps
          const reps = parseFloat(ex.actual_reps || '0');
          if (isNaN(reps) || reps === 0) continue;

          if (!prMap[canonicalName] || reps > prMap[canonicalName].maxWeight) {
            prMap[canonicalName] = {
              exerciseName: canonicalName,
              maxWeight: reps,
              reps: `${reps} reps`,
              date: workout.date,
              prType: 'reps',
            };
          }
        } else {
          // Weighted / weighted_bw: PR = heaviest weight; same weight + more reps also counts
          const weight = parseFloat(ex.actual_weight || '0');
          const reps = parseInt(ex.actual_reps || '0');
          if (isNaN(weight) || weight === 0) continue;

          const existing = prMap[canonicalName];
          const existingReps = existing ? parseInt(existing.reps) || 0 : 0;
          const isNew =
            !existing ||
            weight > existing.maxWeight ||
            (weight === existing.maxWeight && reps > existingReps);

          if (isNew) {
            prMap[canonicalName] = {
              exerciseName: canonicalName,
              maxWeight: weight,
              reps: ex.actual_reps || '',
              date: workout.date,
              prType: 'weight',
            };
          }
        }
      }

      return Object.values(prMap).sort((a, b) => b.maxWeight - a.maxWeight);
    },
    enabled: !!user,
  });

  // Helper to get PR for a specific exercise
  const getPRForExercise = (exerciseName: string): PersonalRecord | undefined => {
    const canonicalName = getCanonicalName(exerciseName);
    return query.data?.find(pr => pr.exerciseName === canonicalName);
  };

  return {
    ...query,
    getPRForExercise,
  };
}
