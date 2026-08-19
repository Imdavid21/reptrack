import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getExerciseType, type ExerciseType } from '@/lib/exerciseLibrary';
import { getCanonicalName, resolveCanonicalName, EXERCISE_ALIASES } from '@/lib/exerciseMatching';
import { fetchAllRows } from '@/lib/supabasePaging';
import { getExerciseFamily, getFamilyKey } from '@/lib/exerciseFamilies';

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
  /** Human label for the family, e.g. "Deadlift". */
  familyLabel: string;
}

// Re-exported for usePersonalRecords.test.ts and any other historical
// importer — the canonical name resolution itself now lives in
// exerciseMatching.ts, shared with last-used-weight and workout-logging
// matching so a lift can't unify for one and split into two PR lines for
// the other.
export { getCanonicalName, EXERCISE_ALIASES };

export function usePersonalRecords() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['personalRecords', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // PostgREST caps a single response at 1000 rows. This account already
      // holds thousands of set rows, so an unpaged select silently dropped the
      // most recent history — which is exactly why new PRs stopped appearing.
      // Page through the whole table instead.
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

      // Find PRs per exercise — NO whitelist, track ALL exercises.
      //
      // Bucketed by resolveCanonicalName (lowercased), NOT getCanonicalName
      // (case-preserved): getCanonicalName only rewrites *known* aliases and
      // otherwise returns the input exactly as typed, so two loggings of the
      // same lift that differ only in casing/whitespace (e.g. logged once via
      // a split template as "Conventional Deadlift" and once via a swap/AI
      // parse as "conventional deadlift") would silently form two separate
      // object keys — splitting a lifter's real max across two buckets and
      // showing a lower PR than they've actually hit. The display name still
      // uses the nicely-cased getCanonicalName of whichever entry is winning.
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
          // Timed: PR = longest duration (stored in actual_reps as seconds)
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
          // Bodyweight: PR = max reps
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
          // Weighted / weighted_bw: PR = heaviest weight; same weight + more reps also counts
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

      // Update the exact source set. The row ID is authoritative; the workout
      // timestamp is retained on the PR for deterministic tie-breaking when
      // identical performances exist on different days.
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

  // Helper to get PR for a specific exercise — same case-insensitive
  // resolution as the aggregation above, so a differently-cased lookup name
  // still finds the bucket its sets were actually grouped into.
  const getPRForExercise = (exerciseName: string): PersonalRecord | undefined => {
    const target = resolveCanonicalName(exerciseName);
    return query.data?.find(pr => resolveCanonicalName(pr.exerciseName) === target);
  };

  /**
   * Best relevant performance anywhere in the movement family, used purely as
   * progression *context* when a variation has little or no history of its
   * own. It never replaces or overwrites the exact-variation PR: pulling
   * 140 kg conventional informs a Romanian deadlift session without becoming
   * the Romanian deadlift record.
   */
  const getFamilyPRForExercise = (exerciseName: string): FamilyRecord | undefined => {
    const family = getExerciseFamily(exerciseName);
    if (!family) return undefined;
    const target = resolveCanonicalName(exerciseName);
    const siblings = (query.data || []).filter(pr =>
      pr.familyKey === family.id &&
      resolveCanonicalName(pr.exerciseName) !== target &&
      // Only comparable record types belong in the same context line.
      pr.prType === 'weight');
    const best = siblings.sort((a, b) => b.maxWeight - a.maxWeight)[0];
    return best ? { ...best, familyLabel: family.label } : undefined;
  };

  return {
    ...query,
    getPRForExercise,
    getFamilyPRForExercise,
    updateRecord: updateRecordMutation.mutateAsync,
    isUpdatingRecord: updateRecordMutation.isPending,
  };
}
