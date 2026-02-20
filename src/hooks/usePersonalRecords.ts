import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getExerciseType, type ExerciseType } from '@/lib/exerciseLibrary';

export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  reps: string;
  date: string;
  /** The type of PR: 'weight' (heaviest), 'reps' (most reps, for bodyweight), 'duration' (longest hold, for timed) */
  prType?: 'weight' | 'reps' | 'duration';
}

// Canonical name mapping for exercise variants
const EXERCISE_ALIASES: Record<string, string> = {
  'Barbell OHP': 'Overhead Press',
  'Barbell Overhead Press': 'Overhead Press',
  'DB Press': 'Dumbbell Bench Press',
  'Flat Dumbbell Bench Press': 'Dumbbell Bench Press',
  'BB Squat': 'Barbell Squat',
  'Back Squat': 'Barbell Squat',
  'Deadlift': 'Conventional Deadlift',
  'RDL': 'Romanian Deadlift',
  'Romanian Deadlifts': 'Romanian Deadlift',
  'DB Shoulder Press': 'Dumbbell Shoulder Press',
  'DB OHP': 'Dumbbell Shoulder Press',
  'Seated Dumbbell Shoulder Press': 'Dumbbell Shoulder Press',
  'Incline Barbell Bench': 'Incline Barbell Bench Press',
  'Barbell Rows': 'Barbell Row',
  'Lateral Raise': 'Lateral Raises',
  'Dumbbell Lateral Raise': 'Lateral Raises',
  'Dumbbell Lateral Raises': 'Lateral Raises',
  'Cable Row': 'Seated Cable Row',
  'Seated Row': 'Seated Cable Row',
  'Cable Seated Row': 'Seated Cable Row',
  'Cable Tricep Pushdowns': 'Tricep Pushdown',
  'Single Arm Dumbbell Rows': 'Single Arm Dumbbell Row',
  'Straight Arm Pulldowns': 'Straight Arm Pulldown',
  'Barbell Curls': 'Barbell Curl',
  'Incline Dumbbell Curls': 'Incline Dumbbell Curl',
  'Cable Curls': 'Cable Curl',
  'Bulgarian Split Squats': 'Bulgarian Split Squat',
  'Leg Extensions': 'Leg Extension',
  'Leg Curls': 'Leg Curl',
  'Hip Thrusts': 'Hip Thrust',
  'Glute Bridges': 'Glute Bridge',
  'Standing Calf Raises': 'Standing Calf Raise',
  'Seated Calf Raises': 'Seated Calf Raise',
};

function getCanonicalName(name: string): string {
  const baseName = name.replace(/\s*\(Set \d+\)$/, '').trim();
  return EXERCISE_ALIASES[baseName] || baseName;
}

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
          // Weighted / weighted_bw: PR = heaviest weight
          const weight = parseFloat(ex.actual_weight || '0');
          if (isNaN(weight) || weight === 0) continue;

          if (!prMap[canonicalName] || weight > prMap[canonicalName].maxWeight) {
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
