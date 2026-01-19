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

// Key exercises to track for progression - map variations to canonical names
const EXERCISE_NAME_MAP: Record<string, string> = {
  'Incline DB Press': 'Incline DB Press',
  'Incline Dumbbell Press': 'Incline DB Press',
  'Incline BB Bench': 'Incline Barbell Bench',
  'Incline Barbell Bench': 'Incline Barbell Bench',
  'Flat DB Bench': 'Flat DB Bench',
  'Flat DB Bench Press': 'Flat DB Bench',
  'Flat Dumbbell Bench Press': 'Flat DB Bench',
  'Flat Barbell Bench': 'Flat Barbell Bench',
  'Barbell Squat': 'Barbell Squat',
  'Goblet Squat': 'Goblet Squat',
  'Leg Press': 'Leg Press',
  'Deadlift': 'Deadlift',
  'Conventional Deadlift': 'Deadlift',
  'Barbell Row': 'Barbell Row',
  'Overhead Press': 'Overhead Press',
  'Barbell OHP': 'Overhead Press',
  'DB Shoulder Press': 'DB Shoulder Press',
  'Seated DB Shoulder Press': 'DB Shoulder Press',
  'Dumbbell Shoulder Press': 'DB Shoulder Press',
};

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
        const rawBaseName = ex.name.replace(/\s*\(Set \d+\)$/, '').trim();
        
        // Map to canonical name, skip if not tracked
        const baseName = EXERCISE_NAME_MAP[rawBaseName];
        if (!baseName) continue;

        const workout = ex.workouts as unknown as { date: string; week_number: number };
        
        // Parse weight from various formats: "15kg", "30kg plates", "60kg total", "Level 6", etc.
        const weightStr = ex.actual_weight || '';
        const weightMatch = weightStr.match(/(\d+(?:\.\d+)?)/);
        const weight = weightMatch ? parseFloat(weightMatch[1]) : 0;
        
        // Skip entries with no valid weight or machine levels
        if (weight === 0 || weightStr.toLowerCase().includes('level') || weightStr.toLowerCase() === 'bw') continue;

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

