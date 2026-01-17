import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ExerciseDataPoint {
  date: string;
  week: number;
  weight: number;
  reps: string;
}

interface ExerciseProgression {
  exerciseName: string;
  data: ExerciseDataPoint[];
}

// Key exercises to track for progression
const TRACKED_EXERCISES = [
  'Incline DB Press',
  'Flat Barbell Bench',
  'Barbell Squat',
  'Conventional Deadlift',
  'Barbell Row',
  'Overhead Press',
];

export function useExerciseProgression() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exerciseProgression', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all exercises for user's workouts
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select(`
          name,
          actual_weight,
          actual_reps,
          workout_id,
          workouts!inner (
            date,
            week_number,
            user_id
          )
        `)
        .eq('workouts.user_id', user.id)
        .not('actual_weight', 'is', null)
        .order('workouts(date)', { ascending: true });

      if (error) throw error;

      // Group by exercise name and aggregate by week (take max weight per week)
      const progressionMap: Record<string, Map<number, ExerciseDataPoint>> = {};

      for (const ex of exercises || []) {
        // Extract base exercise name (remove "Set X" suffix)
        const baseName = ex.name.replace(/\s*\(Set \d+\)$/, '');
        
        // Only track key exercises
        if (!TRACKED_EXERCISES.includes(baseName)) continue;

        const workout = ex.workouts as unknown as { date: string; week_number: number };
        const weight = parseFloat(ex.actual_weight || '0');
        
        if (isNaN(weight) || weight === 0) continue;

        if (!progressionMap[baseName]) {
          progressionMap[baseName] = new Map();
        }

        const weekMap = progressionMap[baseName];
        const existing = weekMap.get(workout.week_number);

        // Keep the highest weight for the week
        if (!existing || weight > existing.weight) {
          weekMap.set(workout.week_number, {
            date: workout.date,
            week: workout.week_number,
            weight,
            reps: ex.actual_reps || '',
          });
        }
      }

      // Convert to array format
      const progressions: ExerciseProgression[] = Object.entries(progressionMap)
        .map(([exerciseName, weekMap]) => ({
          exerciseName,
          data: Array.from(weekMap.values()).sort((a, b) => a.week - b.week),
        }))
        .filter(p => p.data.length > 0);

      return progressions;
    },
    enabled: !!user,
  });
}

