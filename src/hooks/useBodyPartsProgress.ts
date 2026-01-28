import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfWeek, parseISO } from 'date-fns';

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

// Map exercises to body parts
const exerciseToBodyPart: Record<string, string> = {
  // Push
  'Bench Press': 'Chest',
  'Incline Press': 'Chest',
  'Shoulder Press': 'Shoulders',
  'Overhead Press': 'Shoulders',
  'Tricep Pushdown': 'Triceps',
  'Dips': 'Chest',
  'Lateral Raises': 'Shoulders',
  'Cable Fly': 'Chest',
  
  // Pull
  'Pull-ups': 'Back',
  'Lat Pulldown': 'Back',
  'Rows': 'Back',
  'Barbell Row': 'Back',
  'Cable Row': 'Back',
  'Face Pulls': 'Rear Delts',
  'Bicep Curls': 'Biceps',
  'Hammer Curls': 'Biceps',
  
  // Legs
  'Squats': 'Quads',
  'Leg Press': 'Quads',
  'Romanian Deadlift': 'Hamstrings',
  'Deadlift': 'Glutes',
  'Leg Curl': 'Hamstrings',
  'Leg Extension': 'Quads',
  'Calf Raises': 'Calves',
  'Hip Thrust': 'Glutes',
  'Lunges': 'Quads',
};

// Guess body part from exercise name
function guessBodyPart(exerciseName: string, category: string): string {
  // Check direct match first
  for (const [pattern, bodyPart] of Object.entries(exerciseToBodyPart)) {
    if (exerciseName.toLowerCase().includes(pattern.toLowerCase())) {
      return bodyPart;
    }
  }
  
  // Fallback by category
  switch (category) {
    case 'push':
      if (exerciseName.toLowerCase().includes('shoulder') || exerciseName.toLowerCase().includes('lateral')) {
        return 'Shoulders';
      }
      if (exerciseName.toLowerCase().includes('tricep')) {
        return 'Triceps';
      }
      return 'Chest';
    case 'pull':
      if (exerciseName.toLowerCase().includes('curl') || exerciseName.toLowerCase().includes('bicep')) {
        return 'Biceps';
      }
      return 'Back';
    case 'legs':
      if (exerciseName.toLowerCase().includes('calf')) {
        return 'Calves';
      }
      if (exerciseName.toLowerCase().includes('curl') || exerciseName.toLowerCase().includes('hamstring')) {
        return 'Hamstrings';
      }
      if (exerciseName.toLowerCase().includes('glute') || exerciseName.toLowerCase().includes('hip')) {
        return 'Glutes';
      }
      return 'Quads';
    default:
      return 'Other';
  }
}

export interface BodyPartProgress {
  bodyPart: string;
  weeks: {
    weekLabel: string;
    volume: number;
    maxWeight: number;
  }[];
  totalVolume: number;
  growth: number; // percentage growth from first to last week
}

export function useBodyPartsProgress(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bodyPartsProgress', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<BodyPartProgress[]> => {
      if (!user) return [];

      const startDate = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : '1900-01-01';
      const endDate = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : '2100-01-01';

      // Fetch exercise sets with workout dates
      const { data: sets, error } = await supabase
        .from('exercise_sets')
        .select(`
          exercise_name,
          exercise_category,
          actual_weight,
          actual_reps,
          completed,
          workouts!inner(date, user_id)
        `)
        .eq('workouts.user_id', user.id)
        .gte('workouts.date', startDate)
        .lte('workouts.date', endDate)
        .eq('completed', true);

      if (error || !sets) return [];

      // Group by body part and week
      const bodyPartData = new Map<string, Map<string, { volume: number; maxWeight: number }>>();

      sets.forEach((set: any) => {
        const bodyPart = guessBodyPart(set.exercise_name, set.exercise_category);
        const workoutDate = set.workouts?.date;
        if (!workoutDate) return;

        const weekStart = startOfWeek(parseISO(workoutDate), { weekStartsOn: 1 });
        const weekLabel = format(weekStart, 'MMM d');
        const volume = (set.actual_weight || 0) * (set.actual_reps || 0);

        if (!bodyPartData.has(bodyPart)) {
          bodyPartData.set(bodyPart, new Map());
        }

        const weeks = bodyPartData.get(bodyPart)!;
        const existing = weeks.get(weekLabel) || { volume: 0, maxWeight: 0 };
        existing.volume += volume;
        existing.maxWeight = Math.max(existing.maxWeight, set.actual_weight || 0);
        weeks.set(weekLabel, existing);
      });

      // Convert to array format
      const result: BodyPartProgress[] = [];

      bodyPartData.forEach((weeks, bodyPart) => {
        const weeksArray = Array.from(weeks.entries())
          .map(([weekLabel, data]) => ({
            weekLabel,
            volume: data.volume,
            maxWeight: data.maxWeight,
          }))
          .sort((a, b) => {
            // Sort by date
            const dateA = new Date(a.weekLabel);
            const dateB = new Date(b.weekLabel);
            return dateA.getTime() - dateB.getTime();
          });

        const totalVolume = weeksArray.reduce((sum, w) => sum + w.volume, 0);
        
        // Calculate growth percentage
        let growth = 0;
        if (weeksArray.length >= 2) {
          const firstVolume = weeksArray[0].volume;
          const lastVolume = weeksArray[weeksArray.length - 1].volume;
          growth = firstVolume > 0 ? Math.round(((lastVolume - firstVolume) / firstVolume) * 100) : 0;
        }

        result.push({
          bodyPart,
          weeks: weeksArray,
          totalVolume,
          growth,
        });
      });

      // Sort by total volume
      return result.sort((a, b) => b.totalVolume - a.totalVolume);
    },
    enabled: !!user,
  });
}
