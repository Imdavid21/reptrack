import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfWeek, parseISO } from 'date-fns';

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

// Explicit overrides for ambiguous exercises
const BODY_PART_OVERRIDES: Record<string, string> = {
  'overhead tricep extension': 'Triceps',
  'dumbbell overhead extension': 'Triceps',
  'cable rope overhead tricep extension': 'Triceps',
  'close grip bench press': 'Triceps',
  'close grip push-ups': 'Chest',
  'rear delt fly + lat raise': 'Shoulders',
  'rear delt fly': 'Rear Delts',
  'bent over rear delt flyes': 'Rear Delts',
  'face pull': 'Rear Delts',
  'face pulls': 'Rear Delts',
  'negative pull-ups': 'Lats',
  'close grip chest press': 'Chest',
  'skull crushers': 'Triceps',
  'cable pushdown': 'Triceps',
};

// Map exercises to body parts via pattern matching
const exerciseToBodyPart: [string, string][] = [
  // Chest
  ['bench press', 'Chest'],
  ['bench', 'Chest'],
  ['chest', 'Chest'],
  ['fly', 'Chest'],
  ['flye', 'Chest'],
  ['dip', 'Chest'],
  ['push-up', 'Chest'],
  ['pushup', 'Chest'],
  ['incline db press', 'Chest'],
  ['db press', 'Chest'],
  ['db bench', 'Chest'],
  // Back
  ['pull-up', 'Lats'],
  ['pullup', 'Lats'],
  ['lat pulldown', 'Lats'],
  ['pulldown', 'Lats'],
  ['row', 'Back'],
  ['deadlift', 'Posterior Chain'],
  ['chin', 'Back'],
  // Shoulders
  ['shoulder', 'Shoulders'],
  ['overhead press', 'Shoulders'],
  ['ohp', 'Shoulders'],
  ['lateral', 'Side Delts'],
  ['raise', 'Side Delts'],
  ['delt', 'Rear Delts'],
  ['arnold', 'Shoulders'],
  // Arms
  ['curl', 'Biceps'],
  ['bicep', 'Biceps'],
  ['hammer', 'Biceps'],
  ['tricep', 'Triceps'],
  ['pushdown', 'Triceps'],
  ['extension', 'Triceps'],
  ['skull', 'Triceps'],
  // Legs
  ['squat', 'Quads'],
  ['leg press', 'Quads'],
  ['leg extension', 'Quads'],
  ['leg curl', 'Hamstrings'],
  ['leg', 'Quads'],
  ['lunge', 'Quads'],
  ['calf', 'Calves'],
  ['thrust', 'Glutes'],
  ['glute', 'Glutes'],
  ['romanian', 'Hamstrings'],
  ['hamstring', 'Hamstrings'],
  ['hip', 'Glutes'],
  ['goblet', 'Quads'],
];

// Guess body part from exercise name
function guessBodyPart(exerciseName: string, category: string): string {
  const lower = exerciseName.toLowerCase();
  
  // Check explicit overrides first
  if (BODY_PART_OVERRIDES[lower]) {
    return BODY_PART_OVERRIDES[lower];
  }
  
  // Priority check: "overhead extension" → Triceps (not Shoulders)
  if ((lower.includes('overhead') || lower.includes('cable')) && (lower.includes('extension') || lower.includes('tricep'))) {
    return 'Triceps';
  }
  
  // Pattern matching
  for (const [pattern, bodyPart] of exerciseToBodyPart) {
    if (lower.includes(pattern)) {
      return bodyPart;
    }
  }
  
  // Fallback by category
  switch (category) {
    case 'push':
      if (lower.includes('shoulder') || lower.includes('lateral')) return 'Shoulders';
      if (lower.includes('tricep')) return 'Triceps';
      return 'Chest';
    case 'pull':
      if (lower.includes('curl') || lower.includes('bicep')) return 'Biceps';
      return 'Back';
    case 'legs':
      if (lower.includes('calf')) return 'Calves';
      if (lower.includes('curl') || lower.includes('hamstring')) return 'Hamstrings';
      if (lower.includes('glute') || lower.includes('hip')) return 'Glutes';
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
