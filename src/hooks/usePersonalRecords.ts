import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getExerciseType } from '@/lib/exerciseLibrary';
import { getCanonicalName, resolveCanonicalName, EXERCISE_ALIASES } from '@/lib/exerciseMatching';
import { fetchAllRows } from '@/lib/supabasePaging';
import { getExerciseFamily, getFamilyKey } from '@/lib/exerciseFamilies';
import { getComparablePrGroup } from '@/lib/exerciseRelationships';

export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  reps: string;
  date: string;
  sourceExerciseId: string;
  sourceWorkoutId: string;
  sourceTimestamp: string;
  /** The type of PR: 'weight' (heaviest), 'reps' (most reps, for bodyweight), 'duration' (longest hold, for timed) */
  prType?: 'weight' | 'reps' | 'duration';
  /** Movement family this record belongs to (e.g. 'deadlift'). */
  familyKey?: string;
}

export interface FamilyRecord extends PersonalRecord {
  /** Human label for the family, e.g. "Vertical pull". */
  familyLabel: string;
  /** Family records are only returned when raw loading is deliberately comparable. */
  transferability: 'comparable';
}

// Re-exported for usePersonalRecords.test.ts and historical importers.
export { getCanonicalName, EXERCISE_ALIASES };

export function usePersonalRecords() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['personalRecords', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // PostgREST caps a single response at 1000 rows. Page through the full
      // set history so recent records cannot disappear from PR calculation.
      const exercises = await fetchAllRows<{
        id: string; workout_id: string; name: string;
        actual_weight: string | null; actual_reps: string | null;
        workouts: unknown;
      }>((from, to) =>
        supabase
          .from('exercises')
          .select(`
            id,
            workout_id,
            name,
            actual_weight,
            actual_reps,
            workouts!inner (
              date,
              created_at,
              user_id
            )
          `)
          .eq('workouts.user_id', user.id)
          .order('id', { ascending: true })
          .range(from, to),
      );

      // Exact PRs are bucketed by true exercise identity only. Same-family
      // machine/free-weight alternatives remain separate records.
      const prMap: Record<string, PersonalRecord> = {};

      for (const ex of exercises || []) {
        const groupKey = resolveCanonicalName(ex.name);
        const canonicalName = getCanonicalName(ex.name);
        const exType = getExerciseType(canonicalName);
        const workout = ex.workouts as unknown as { date: string; created_at: string };
        const source = {
          sourceExerciseId: ex.id,
          sourceWorkoutId: ex.workout_id,
          sourceTimestamp: workout.created_at || `${workout.date}T00:00:00`,
        };

        if (exType === 'timed') {
          const duration = parseFloat(ex.actual_reps || '0');
          if (isNaN(duration) || duration === 0) continue;

          if (!prMap[groupKey] || duration > prMap[groupKey].maxWeight ||
              (duration === prMap[groupKey].maxWeight && source.sourceTimestamp > prMap[groupKey].sourceTimestamp)) {
            prMap[groupKey] = {
              exerciseName: canonicalName,
              maxWeight: duration,
              reps: `${duration}s`,
              date: workout.date,
              ...source,
              prType: 'duration',
              familyKey: getFamilyKey(canonicalName),
            };
          }
        } else if (exType === 'bodyweight') {
          const reps = parseFloat(ex.actual_reps || '0');
          if (isNaN(reps) || reps === 0) continue;

          if (!prMap[groupKey] || reps > prMap[groupKey].maxWeight ||
              (reps === prMap[groupKey].maxWeight && source.sourceTimestamp > prMap[groupKey].sourceTimestamp)) {
            prMap[groupKey] = {
              exerciseName: canonicalName,
              maxWeight: reps,
              reps: `${reps} reps`,
              date: workout.date,
              ...source,
              prType: 'reps',
              familyKey: getFamilyKey(canonicalName),
            };
          }
        } else {
          // Weighted / weighted_bw: exact-lift PR = heaviest weight; same
          // weight + more reps also counts. Machine alternatives never enter
          // this bucket unless they are a true alias of the same lift.
          const weight = parseFloat(ex.actual_weight || '0');
          const reps = parseInt(ex.actual_reps || '0');
          if (isNaN(weight) || weight === 0) continue;

          const existing = prMap[groupKey];
          const existingReps = existing ? parseInt(existing.reps) || 0 : 0;
          const isNew =
            !existing ||
            weight > existing.maxWeight ||
            (weight === existing.maxWeight && reps > existingReps);

          const isSamePerformanceMoreRecent = !!existing &&
            weight === existing.maxWeight &&
            reps === existingReps &&
            source.sourceTimestamp > existing.sourceTimestamp;

          if (isNew || isSamePerformanceMoreRecent) {
            prMap[groupKey] = {
              exerciseName: canonicalName,
              maxWeight: weight,
              reps: ex.actual_reps || '',
              date: workout.date,
              ...source,
              prType: 'weight',
              familyKey: getFamilyKey(canonicalName),
            };
          }
        }
      }

      return Object.values(prMap).sort((a, b) => b.maxWeight - a.maxWeight);
    },
    enabled: !!user,
  });

  const updateRecordMutation = useMutation({
    mutationFn: async ({ record, weight, reps }: { record: PersonalRecord; weight?: number; reps: number }) => {
      if (!user) throw new Error('You must be signed in to edit a PR.');
      const update = record.prType === 'weight'
        ? { actual_weight: String(weight ?? record.maxWeight), actual_reps: String(reps), completed: true }
        : { actual_reps: String(reps), completed: true };

      const { error } = await supabase
        .from('exercises')
        .update(update)
        .eq('id', record.sourceExerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalRecords', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
      queryClient.invalidateQueries({ queryKey: ['workout-details'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['lastUsedWeights'] });
    },
  });

  const getPRForExercise = (exerciseName: string): PersonalRecord | undefined => {
    const target = resolveCanonicalName(exerciseName);
    return query.data?.find(pr => resolveCanonicalName(pr.exerciseName) === target);
  };

  /**
   * Return a sibling PR only when the two exercises share a deliberately
   * comparable loading system. This prevents nonsense such as a leg-press PR
   * being presented as a squat "best", or a selectorized chest press load
   * being compared numerically with a barbell bench.
   *
   * Same-family but non-comparable lifts still remain linked through
   * exerciseRelationships for substitutions/progression context; they simply
   * do not masquerade as transferable PRs in the workout logger.
   */
  const getFamilyPRForExercise = (exerciseName: string): FamilyRecord | undefined => {
    const family = getExerciseFamily(exerciseName);
    const comparableGroup = getComparablePrGroup(exerciseName);
    if (!family || !comparableGroup) return undefined;

    const target = resolveCanonicalName(exerciseName);
    const siblings = (query.data || []).filter(pr =>
      pr.familyKey === family.id &&
      resolveCanonicalName(pr.exerciseName) !== target &&
      pr.prType === 'weight' &&
      getComparablePrGroup(pr.exerciseName) === comparableGroup,
    );

    const best = [...siblings].sort((a, b) => {
      if (b.maxWeight !== a.maxWeight) return b.maxWeight - a.maxWeight;
      const aReps = parseInt(a.reps) || 0;
      const bReps = parseInt(b.reps) || 0;
      if (bReps !== aReps) return bReps - aReps;
      return b.sourceTimestamp.localeCompare(a.sourceTimestamp);
    })[0];

    return best ? { ...best, familyLabel: family.label, transferability: 'comparable' } : undefined;
  };

  return {
    ...query,
    getPRForExercise,
    getFamilyPRForExercise,
    updateRecord: updateRecordMutation.mutateAsync,
    isUpdatingRecord: updateRecordMutation.isPending,
  };
}
