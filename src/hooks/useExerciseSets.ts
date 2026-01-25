import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfWeek, parseISO } from 'date-fns';

export interface ExerciseSet {
  id: string;
  workout_id: string;
  exercise_name: string;
  exercise_category: 'push' | 'pull' | 'legs';
  set_number: number;
  target_weight: number | null;
  target_reps: number | null;
  actual_weight: number | null;
  actual_reps: number | null;
  completed: boolean;
  created_at: string;
  workout_date?: string;
}

export interface VolumeByCategory {
  push: number;
  pull: number;
  legs: number;
  total: number;
}

export interface WeeklyVolume {
  week: string;
  weekStart: string;
  pushVolume: number;
  pullVolume: number;
  legsVolume: number;
  totalVolume: number;
}

export interface ExerciseProgression {
  exerciseName: string;
  data: { week: number; weekLabel: string; weight: number; volume: number }[];
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export function useExerciseSets(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exerciseSets', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!user) {
        return {
          sets: [],
          volumeTotals: { push: 0, pull: 0, legs: 0, total: 0 },
          weeklyVolume: [],
          progressions: [],
        };
      }

      let query = supabase
        .from('exercise_sets')
        .select(`
          *,
          workouts!inner (date, user_id)
        `)
        .eq('workouts.user_id', user.id)
        .eq('completed', true)
        .order('created_at', { ascending: true });

      if (dateRange) {
        query = query
          .gte('workouts.date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('workouts.date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;

      const sets: ExerciseSet[] = (data || []).map((s: any) => ({
        ...s,
        workout_date: s.workouts?.date,
      }));

      // Calculate volume totals
      const volumeTotals: VolumeByCategory = { push: 0, pull: 0, legs: 0, total: 0 };
      sets.forEach(s => {
        const volume = (s.actual_weight || 0) * (s.actual_reps || 0);
        volumeTotals[s.exercise_category] += volume;
        volumeTotals.total += volume;
      });

      // Calculate weekly volume
      const weeklyMap = new Map<string, WeeklyVolume>();
      sets.forEach(s => {
        if (!s.workout_date) return;
        const weekStart = startOfWeek(parseISO(s.workout_date), { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const weekLabel = format(weekStart, 'MMM d');

        const volume = (s.actual_weight || 0) * (s.actual_reps || 0);
        const existing = weeklyMap.get(weekKey);

        if (existing) {
          if (s.exercise_category === 'push') existing.pushVolume += volume;
          else if (s.exercise_category === 'pull') existing.pullVolume += volume;
          else existing.legsVolume += volume;
          existing.totalVolume += volume;
        } else {
          weeklyMap.set(weekKey, {
            week: weekLabel,
            weekStart: weekKey,
            pushVolume: s.exercise_category === 'push' ? volume : 0,
            pullVolume: s.exercise_category === 'pull' ? volume : 0,
            legsVolume: s.exercise_category === 'legs' ? volume : 0,
            totalVolume: volume,
          });
        }
      });

      const weeklyVolume = Array.from(weeklyMap.values())
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

      // Calculate exercise progressions (max weight per week per exercise)
      const progressionMap = new Map<string, Map<string, { weight: number; volume: number }>>();
      sets.forEach(s => {
        if (!s.workout_date || !s.actual_weight) return;
        const weekStart = startOfWeek(parseISO(s.workout_date), { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        if (!progressionMap.has(s.exercise_name)) {
          progressionMap.set(s.exercise_name, new Map());
        }
        const exerciseWeeks = progressionMap.get(s.exercise_name)!;
        const existing = exerciseWeeks.get(weekKey);
        const volume = (s.actual_weight || 0) * (s.actual_reps || 0);

        if (existing) {
          existing.weight = Math.max(existing.weight, s.actual_weight);
          existing.volume += volume;
        } else {
          exerciseWeeks.set(weekKey, { weight: s.actual_weight, volume });
        }
      });

      // Convert to progressions array
      const progressions: ExerciseProgression[] = Array.from(progressionMap.entries())
        .map(([exerciseName, weeks]) => ({
          exerciseName,
          data: Array.from(weeks.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([weekKey, data], idx) => ({
              week: idx + 1,
              weekLabel: format(parseISO(weekKey), 'MMM d'),
              weight: data.weight,
              volume: data.volume,
            })),
        }))
        .filter(p => p.data.length >= 2) // Only exercises with 2+ weeks of data
        .sort((a, b) => {
          const aMax = Math.max(...a.data.map(d => d.weight));
          const bMax = Math.max(...b.data.map(d => d.weight));
          return bMax - aMax;
        });

      return { sets, volumeTotals, weeklyVolume, progressions };
    },
    enabled: !!user,
  });
}
