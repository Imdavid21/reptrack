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
  // Chest
  'Barbell Bench': 'Barbell Bench Press',
  'Flat Barbell Bench': 'Barbell Bench Press',
  'BB Bench Press': 'Barbell Bench Press',
  'DB Press': 'Dumbbell Bench Press',
  'Flat Dumbbell Bench Press': 'Dumbbell Bench Press',
  'Flat DB Press': 'Dumbbell Bench Press',
  'DB Flat Bench': 'Dumbbell Bench Press',
  'Incline Barbell Bench': 'Incline Barbell Bench Press',
  'Incline BB Bench': 'Incline Barbell Bench Press',
  'Incline DB Press': 'Incline Dumbbell Press',
  'Incline DB Bench Press': 'Incline Dumbbell Press',
  'Chest Fly': 'Cable Flyes',
  'Chest Flyes': 'Cable Flyes',
  'Machine Chest Fly': 'Cable Flyes',
  'Pec Fly': 'Cable Flyes',
  'Pec Deck': 'Cable Flyes',
  'Cable Fly': 'Cable Flyes',
  // Shoulders
  'Barbell OHP': 'Overhead Press',
  'Barbell Overhead Press': 'Overhead Press',
  'OHP': 'Overhead Press',
  'Military Press': 'Overhead Press',
  'DB Shoulder Press': 'Dumbbell Shoulder Press',
  'DB OHP': 'Dumbbell Shoulder Press',
  'Seated Dumbbell Shoulder Press': 'Dumbbell Shoulder Press',
  'Seated DB Shoulder Press': 'Dumbbell Shoulder Press',
  'Lateral Raise': 'Lateral Raises',
  'Dumbbell Lateral Raise': 'Lateral Raises',
  'Dumbbell Lateral Raises': 'Lateral Raises',
  'Lateral Raise Machine': 'Lateral Raises',
  'Machine Lateral Raise': 'Lateral Raises',
  'Face Pull': 'Face Pulls',
  'Bent Over Rear Delt Fly': 'Bent Over Rear Delt Flyes',
  'Rear Delt Fly': 'Bent Over Rear Delt Flyes',
  'Rear Delt Flyes': 'Bent Over Rear Delt Flyes',
  'Reverse Fly': 'Reverse Flyes',
  // Back
  'Barbell Rows': 'Barbell Row',
  'BB Row': 'Barbell Row',
  'Bent Over Row': 'Barbell Row',
  'Bent Over Barbell Row': 'Barbell Row',
  'Pendlay Row': 'Barbell Row',
  'Cable Row': 'Seated Cable Row',
  'Seated Row': 'Seated Cable Row',
  'Cable Seated Row': 'Seated Cable Row',
  'Single Arm Dumbbell Rows': 'Single Arm Dumbbell Row',
  'Single Arm DB Row': 'Single Arm Dumbbell Row',
  'DB Row': 'Single Arm Dumbbell Row',
  'One Arm Dumbbell Row': 'Single Arm Dumbbell Row',
  'Straight Arm Pulldowns': 'Straight Arm Pulldown',
  'Lat Pulldowns': 'Lat Pulldown',
  'Wide Grip Lat Pulldown': 'Lat Pulldown',
  'Close Grip Lat Pulldown': 'Lat Pulldown',
  'Reverse Grip Lat Pulldown': 'Lat Pulldown',
  'Negative Pull-ups': 'Pull-ups',
  // Deadlifts
  'Deadlift': 'Conventional Deadlift',
  'Deadlifts': 'Conventional Deadlift',
  'Sumo Deadlift': 'Conventional Deadlift',
  'Deadlift Technique': 'Deadlift Technique Work',
  'RDL': 'Romanian Deadlift',
  'Romanian Deadlifts': 'Romanian Deadlift',
  'DB RDL': 'Romanian Deadlift',
  'Dumbbell RDL': 'Romanian Deadlift',
  'Single Leg Romanian Deadlifts': 'Romanian Deadlift',
  // Triceps
  'Cable Tricep Pushdowns': 'Tricep Pushdown',
  'Tricep Pushdowns': 'Tricep Pushdown',
  'Cable Pushdown': 'Tricep Pushdown',
  'Rope Pushdown': 'Tricep Pushdown',
  'Dumbbell Overhead Extension': 'Overhead Tricep Extension',
  'DB Overhead Extension': 'Overhead Tricep Extension',
  'Overhead Extension': 'Overhead Tricep Extension',
  'Dumbbell Skull Crushers': 'Skull Crushers',
  // Biceps
  'Barbell Curls': 'Barbell Curl',
  'BB Curl': 'Barbell Curl',
  'BB Curls': 'Barbell Curl',
  'EZ Bar Curl': 'Barbell Curl',
  'EZ Bar Curls': 'Barbell Curl',
  'EZ Curl': 'Barbell Curl',
  'Dumbbell Bicep Curls': 'Dumbbell Curl',
  'Dumbbell Curls': 'Dumbbell Curl',
  'DB Curl': 'Dumbbell Curl',
  'DB Curls': 'Dumbbell Curl',
  'Bicep Curl': 'Dumbbell Curl',
  'Bicep Curls': 'Dumbbell Curl',
  'Incline Dumbbell Curls': 'Incline Dumbbell Curl',
  'Incline DB Curl': 'Incline Dumbbell Curl',
  'Cable Curls': 'Cable Curl',
  'Rope Cable Curl': 'Cable Curl',
  'Rope Curl': 'Cable Curl',
  'Preacher Curls': 'EZ Bar Preacher Curls',
  'Preacher Curl': 'EZ Bar Preacher Curls',
  // Legs - Squats
  'BB Squat': 'Barbell Squat',
  'Back Squat': 'Barbell Squat',
  'Squat': 'Barbell Squat',
  'Squats': 'Barbell Squat',
  'Goblet Squat': 'Goblet Squats',
  'Bulgarian Split Squats': 'Bulgarian Split Squat',
  'Leg Extensions': 'Leg Extension',
  'Leg Curls': 'Leg Curl',
  'Lying Leg Curl': 'Leg Curl',
  'Seated Leg Curl': 'Leg Curl',
  'Hip Thrusts': 'Hip Thrust',
  'Barbell Hip Thrust': 'Hip Thrust',
  'Glute Bridges': 'Glute Bridge',
  'Standing Calf Raises': 'Standing Calf Raise',
  'Calf Raise': 'Standing Calf Raise',
  'Calf Raises': 'Standing Calf Raise',
  'Seated Calf Raises': 'Seated Calf Raise',
  'Walking Lunge': 'Walking Lunges',
  'Lunges': 'Walking Lunges',
  // Timed
  'Dead Hangs': 'Dead Hang',
  'Planks': 'Plank',
  'Wall Sits': 'Wall Sit',
  // Bodyweight
  'Close Grip Push-ups': 'Push-ups',
  'Diamond Push-ups': 'Push-ups',
  'Wide Push-ups': 'Push-ups',
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
