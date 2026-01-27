import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays, format } from 'date-fns';

// Mapping exercise patterns to muscle groups
const exerciseToMuscles: Record<string, string[]> = {
  // Chest
  'bench press': ['chest', 'front_delt', 'triceps'],
  'incline press': ['chest', 'front_delt', 'triceps'],
  'cable fly': ['chest'],
  'dumbbell fly': ['chest'],
  'push up': ['chest', 'front_delt', 'triceps'],
  'dip': ['chest', 'triceps', 'front_delt'],
  
  // Back
  'pull up': ['lats', 'biceps', 'rear_delt'],
  'chin up': ['lats', 'biceps'],
  'lat pulldown': ['lats', 'biceps'],
  'row': ['lats', 'rhomboids', 'biceps', 'rear_delt'],
  'deadlift': ['lower_back', 'glutes', 'hamstrings', 'traps'],
  'face pull': ['rear_delt', 'rhomboids'],
  
  // Shoulders
  'shoulder press': ['front_delt', 'side_delt', 'triceps'],
  'overhead press': ['front_delt', 'side_delt', 'triceps'],
  'lateral raise': ['side_delt'],
  'front raise': ['front_delt'],
  'reverse fly': ['rear_delt'],
  'shrug': ['traps'],
  
  // Arms
  'curl': ['biceps'],
  'hammer curl': ['biceps', 'forearms'],
  'tricep': ['triceps'],
  'skull crusher': ['triceps'],
  'pushdown': ['triceps'],
  'extension': ['triceps'],
  
  // Legs
  'squat': ['quads', 'glutes', 'hamstrings'],
  'leg press': ['quads', 'glutes'],
  'lunge': ['quads', 'glutes', 'hamstrings'],
  'leg curl': ['hamstrings'],
  'leg extension': ['quads'],
  'calf raise': ['calves'],
  'hip thrust': ['glutes', 'hamstrings'],
  'romanian deadlift': ['hamstrings', 'glutes', 'lower_back'],
  
  // Core
  'crunch': ['abs'],
  'plank': ['abs', 'obliques'],
  'sit up': ['abs'],
  'leg raise': ['abs', 'hip_flexors'],
  'russian twist': ['obliques'],
  'cable crunch': ['abs'],
};

export interface MuscleActivity {
  muscle: string;
  sets: number;
  volume: number;
  lastWorked: string | null;
  daysSinceWorked: number;
}

export type MuscleGroupStatus = 'fresh' | 'worked' | 'recovering' | 'optimal';

export function useMuscleGroups(days: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['muscleGroups', user?.id, days],
    queryFn: async () => {
      if (!user) return { muscles: [], summary: {} };

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Get recent workouts and exercises
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, date')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (!workouts?.length) {
        return { 
          muscles: [], 
          summary: {
            totalMusclesWorked: 0,
            musclesNeedingAttention: getAllMuscles(),
            recentlyWorked: [],
          }
        };
      }

      const workoutIds = workouts.map(w => w.id);
      
      const { data: exercises } = await supabase
        .from('exercises')
        .select('name, actual_weight, actual_reps, workout_id, completed')
        .in('workout_id', workoutIds)
        .eq('completed', true);

      // Calculate muscle activity
      const muscleData: Record<string, MuscleActivity> = {};

      exercises?.forEach(exercise => {
        const workout = workouts.find(w => w.id === exercise.workout_id);
        if (!workout) return;

        const name = exercise.name.toLowerCase();
        let matchedMuscles: string[] = [];

        // Find matching muscles from exercise name
        for (const [pattern, muscles] of Object.entries(exerciseToMuscles)) {
          if (name.includes(pattern)) {
            matchedMuscles = muscles;
            break;
          }
        }

        // If no match, try to infer from categories
        if (matchedMuscles.length === 0) {
          if (name.includes('chest')) matchedMuscles = ['chest'];
          else if (name.includes('back')) matchedMuscles = ['lats'];
          else if (name.includes('leg')) matchedMuscles = ['quads'];
          else if (name.includes('arm')) matchedMuscles = ['biceps', 'triceps'];
          else if (name.includes('shoulder')) matchedMuscles = ['front_delt', 'side_delt'];
          else if (name.includes('core') || name.includes('ab')) matchedMuscles = ['abs'];
        }

        const weight = parseFloat(exercise.actual_weight?.match(/[\d.]+/)?.[0] || '0');
        const reps = parseInt(exercise.actual_reps?.match(/\d+/)?.[0] || '0');
        const volume = weight * reps;

        matchedMuscles.forEach(muscle => {
          if (!muscleData[muscle]) {
            muscleData[muscle] = {
              muscle,
              sets: 0,
              volume: 0,
              lastWorked: null,
              daysSinceWorked: days + 1,
            };
          }

          muscleData[muscle].sets += 1;
          muscleData[muscle].volume += volume;

          const workoutDate = workout.date;
          if (!muscleData[muscle].lastWorked || workoutDate > muscleData[muscle].lastWorked) {
            muscleData[muscle].lastWorked = workoutDate;
            const daysAgo = Math.floor(
              (new Date().getTime() - new Date(workoutDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            muscleData[muscle].daysSinceWorked = daysAgo;
          }
        });
      });

      const muscles = Object.values(muscleData);
      const allMuscles = getAllMuscles();
      
      const workedMuscleNames = muscles.map(m => m.muscle);
      const musclesNeedingAttention = allMuscles.filter(m => !workedMuscleNames.includes(m));
      const recentlyWorked = muscles.filter(m => m.daysSinceWorked <= 2).map(m => m.muscle);

      return {
        muscles,
        summary: {
          totalMusclesWorked: muscles.length,
          musclesNeedingAttention,
          recentlyWorked,
        }
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

function getAllMuscles(): string[] {
  return [
    'chest', 'lats', 'traps', 'rhomboids', 'lower_back',
    'front_delt', 'side_delt', 'rear_delt',
    'biceps', 'triceps', 'forearms',
    'abs', 'obliques',
    'quads', 'hamstrings', 'glutes', 'calves',
  ];
}

export function getMuscleStatus(muscle: MuscleActivity): MuscleGroupStatus {
  if (muscle.daysSinceWorked <= 1) return 'worked';
  if (muscle.daysSinceWorked <= 3) return 'recovering';
  if (muscle.daysSinceWorked <= 5) return 'optimal';
  return 'fresh';
}

export function getMuscleColor(status: MuscleGroupStatus): string {
  switch (status) {
    case 'worked': return '#95d5b2'; // Bright mint - recently worked
    case 'recovering': return '#d8f3dc'; // Light mint - recovering
    case 'optimal': return '#e9ecef'; // Gray - ready to train
    case 'fresh': return '#adb5bd'; // Darker gray - needs attention
    default: return '#e9ecef';
  }
}
