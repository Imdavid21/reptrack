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

// Expanded list of tracked exercises for PR display
const TRACKED_EXERCISES = [
  // Chest
  'Incline DB Press',
  'Flat Barbell Bench',
  'Flat DB Press',
  'Incline Barbell Bench Press',
  'Incline Barbell Bench',
  'Flat Dumbbell Bench Press',
  'Dumbbell Bench Press',
  'Cable Flyes',
  'Incline Dumbbell Flyes',
  'Incline Dumbbell Press',
  'Cable Crossover',
  // Shoulders
  'Overhead Press',
  'Barbell Overhead Press',
  'Dumbbell Shoulder Press',
  'Seated Dumbbell Shoulder Press',
  'Lateral Raises',
  'Dumbbell Lateral Raises',
  'Bent Over Rear Delt Flyes',
  'Face Pulls',
  // Back
  'Barbell Row',
  'Barbell Rows',
  'Conventional Deadlift',
  'Romanian Deadlift',
  'Romanian Deadlifts',
  'Lat Pulldown',
  'Seated Cable Row',
  'Cable Seated Row',
  'T-Bar Row',
  'Single Arm Dumbbell Rows',
  'Straight Arm Pulldowns',
  'Pull-ups',
  'Weighted Pull-ups',
  // Legs
  'Barbell Squat',
  'Leg Press',
  'Hack Squat',
  'Bulgarian Split Squats',
  'Goblet Squats',
  'Leg Extensions',
  'Leg Curls',
  'Hip Thrusts',
  'Walking Lunges',
  'Standing Calf Raises',
  'Seated Calf Raises',
  // Arms
  'Dumbbell Curl',
  'Barbell Curl',
  'Barbell Curls',
  'Hammer Curls',
  'EZ Bar Preacher Curls',
  'Concentration Curls',
  'Incline Dumbbell Curls',
  'Cable Curls',
  'Tricep Pushdown',
  'Cable Tricep Pushdowns',
  'Skull Crushers',
  'Overhead Cable Tricep Extension',
  'Cable Rope Overhead Tricep Extension',
  'Close Grip Bench Press',
  'Dips',
  // Bodyweight exercises (PR = max reps)
  'Push-ups',
  'Incline Push-ups',
  'Decline Push-ups',
  'Chin-ups',
  'Body Rows',
  'Hanging Leg Raises',
  'Ab Crunches',
  'Mountain Climbers',
  'Burpees',
  'Lunges',
  'Bodyweight Squats',
  'Glute Bridges',
  'Calf Raises',
  // Weighted bodyweight (PR = max added weight)
  'Weighted Pull-ups',
  'Weighted Dips',
  // Timed exercises (PR = max duration)
  'Wall Sit',
  'Dead Hang',
  'Plank',
];

// Canonical name mapping for exercise variants
const EXERCISE_ALIASES: Record<string, string> = {
  'Barbell OHP': 'Barbell Overhead Press',
  'DB Press': 'Flat Dumbbell Bench Press',
  'Dumbbell Bench Press': 'Flat Dumbbell Bench Press',
  'BB Squat': 'Barbell Squat',
  'Back Squat': 'Barbell Squat',
  'Deadlift': 'Conventional Deadlift',
  'RDL': 'Romanian Deadlifts',
  'Romanian Deadlift': 'Romanian Deadlifts',
  'DB Shoulder Press': 'Seated Dumbbell Shoulder Press',
  'DB OHP': 'Seated Dumbbell Shoulder Press',
  'Incline Barbell Bench': 'Incline Barbell Bench Press',
  'Flat Barbell Bench': 'Flat Barbell Bench Press',
  'Barbell Row': 'Barbell Rows',
  'Lateral Raise': 'Lateral Raises',
  'Dumbbell Lateral Raise': 'Dumbbell Lateral Raises',
  'Cable Row': 'Cable Seated Row',
  'Seated Row': 'Cable Seated Row',
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

      // Find PRs per exercise based on exercise type
      const prMap: Record<string, PersonalRecord> = {};

      for (const ex of exercises || []) {
        const canonicalName = getCanonicalName(ex.name);

        if (!TRACKED_EXERCISES.includes(canonicalName)) continue;

        const exType = getExerciseType(canonicalName);
        const workout = ex.workouts as unknown as { date: string };

        if (exType === 'timed') {
          // Timed: PR = longest duration (stored in actual_reps as seconds)
          const duration = parseFloat(ex.actual_reps || '0');
          if (isNaN(duration) || duration === 0) continue;

          if (!prMap[canonicalName] || duration > prMap[canonicalName].maxWeight) {
            prMap[canonicalName] = {
              exerciseName: canonicalName,
              maxWeight: duration, // reuse field: holds seconds for timed
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
              maxWeight: reps, // reuse field: holds reps for bodyweight
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
