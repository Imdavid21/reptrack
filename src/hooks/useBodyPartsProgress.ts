import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfWeek, parseISO } from 'date-fns';
import { getBodyPart } from '@/lib/exerciseClassification';

export interface DateRangeFilter {
  from: Date;
  to: Date;
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

      // Read the `exercises` table (one row per completed set) — the table
      // workouts actually write to. A prior version queried an `exercise_sets`
      // table nothing populates, so this always returned []. `name` carries a
      // " (Set N)" suffix and weight/reps are stored as strings, so we strip and
      // parse below.
      const { data: sets, error } = await supabase
        .from('exercises')
        .select(`
          name,
          category,
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

      // Group by body part and week. Track weekStart (a real Date) alongside the
      // display label so weeks sort chronologically instead of by parsing the
      // ambiguous "MMM d" label string.
      const bodyPartData = new Map<string, Map<string, { volume: number; maxWeight: number; weekStart: number }>>();

      sets.forEach((set: any) => {
        const exerciseName = (set.name || '').replace(/\s*\(Set \d+\)$/, '').trim();
        const bodyPart = getBodyPart(exerciseName, set.category);
        const workoutDate = set.workouts?.date;
        if (!workoutDate) return;

        const weekStart = startOfWeek(parseISO(workoutDate), { weekStartsOn: 1 });
        const weekLabel = format(weekStart, 'MMM d');
        const weight = parseFloat(set.actual_weight || '0') || 0;
        const reps = parseFloat(set.actual_reps || '0') || 0;
        const volume = weight * reps;

        if (!bodyPartData.has(bodyPart)) {
          bodyPartData.set(bodyPart, new Map());
        }

        const weeks = bodyPartData.get(bodyPart)!;
        const existing = weeks.get(weekLabel) || { volume: 0, maxWeight: 0, weekStart: weekStart.getTime() };
        existing.volume += volume;
        existing.maxWeight = Math.max(existing.maxWeight, weight);
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
            weekStart: data.weekStart,
          }))
          .sort((a, b) => a.weekStart - b.weekStart)
          .map(({ weekStart, ...rest }) => rest);

        const totalVolume = weeksArray.reduce((sum, w) => sum + w.volume, 0);
        
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
