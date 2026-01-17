import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  reps: string;
  date: string;
}

const TRACKED_EXERCISES = [
  'Incline DB Press',
  'Flat Barbell Bench',
  'Barbell Squat',
  'Conventional Deadlift',
  'Barbell Row',
  'Overhead Press',
];

export function usePersonalRecords() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['personalRecords', user?.id],
    queryFn: async () => {
      if (!user) return [];

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
        .eq('workouts.user_id', user.id)
        .not('actual_weight', 'is', null);

      if (error) throw error;

      // Find max weight per exercise
      const prMap: Record<string, PersonalRecord> = {};

      for (const ex of exercises || []) {
        const baseName = ex.name.replace(/\s*\(Set \d+\)$/, '');
        
        if (!TRACKED_EXERCISES.includes(baseName)) continue;

        const weight = parseFloat(ex.actual_weight || '0');
        if (isNaN(weight) || weight === 0) continue;

        const workout = ex.workouts as unknown as { date: string };

        if (!prMap[baseName] || weight > prMap[baseName].maxWeight) {
          prMap[baseName] = {
            exerciseName: baseName,
            maxWeight: weight,
            reps: ex.actual_reps || '',
            date: workout.date,
          };
        }
      }

      return Object.values(prMap).sort((a, b) => b.maxWeight - a.maxWeight);
    },
    enabled: !!user,
  });
}
