import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfWeek, parseISO } from 'date-fns';
import { stripSetSuffix, getBodyPart } from '@/lib/exerciseClassification';

export interface ExerciseSet {
  id: string;
  workout_id: string;
  exercise_name: string;
  exercise_category: 'push' | 'pull' | 'legs';
  /** Raw training-role category from the exercises table ('warmup' | 'primary'
   * | 'accessory'), distinct from exercise_category's push/pull/legs movement
   * pattern above. Consumers that need to weight primary lifts differently or
   * exclude warmups (e.g. strength-progress scoring) should use this instead
   * of re-deriving it. */
  training_category: string;
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

function parseWeight(weight: string | number | null): number {
  if (weight === null || weight === undefined) return 0;
  if (typeof weight === 'number') return weight;
  const match = weight.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseReps(reps: string | number | null): number {
  if (reps === null || reps === undefined) return 0;
  if (typeof reps === 'number') return reps;
  const match = reps.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// Chest/Shoulders/Triceps push weight away from the body; Back/Biceps/
// Forearms pull it toward the body. Core has no clean push/pull/legs home,
// so it's deliberately excluded — see categorizeExercise's fallback.
const BODY_PART_TO_PPL: Record<string, 'push' | 'pull' | 'legs'> = {
  Chest: 'push',
  Shoulders: 'push',
  Triceps: 'push',
  Back: 'pull',
  Biceps: 'pull',
  Forearms: 'pull',
  Quads: 'legs',
  Hamstrings: 'legs',
  Glutes: 'legs',
  Calves: 'legs',
};

export function categorizeByDayName(dayName: string): 'push' | 'pull' | 'legs' | null {
  const lower = dayName.toLowerCase();
  if (lower.includes('push')) return 'push';
  if (lower.includes('pull')) return 'pull';
  // "Lower" (Upper/Lower split) is a leg day but doesn't contain "leg".
  if (lower.includes('leg') || lower.includes('lower')) return 'legs';
  return null; // Upper / Full Body / custom — day name alone says nothing
}

// Bucketing an entire workout into one push/pull/legs category by day name
// alone is wrong for Upper (push+pull combined) and Full Body (everything)
// days — every exercise in the workout used to get silently misattributed
// to the same guess. Classify each exercise individually by the muscle it
// actually trains first; only fall back to the day-level guess (and then
// the historical default of 'legs') for exercises with no clean push/pull/
// legs home, like Core.
export function categorizeExercise(exerciseName: string, dayName: string): 'push' | 'pull' | 'legs' {
  const fromBodyPart = BODY_PART_TO_PPL[getBodyPart(exerciseName)];
  if (fromBodyPart) return fromBodyPart;
  return categorizeByDayName(dayName) || 'legs';
}

export function useExerciseSets(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  const fromKey = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const toKey = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  return useQuery({
    queryKey: ['exerciseSets', user?.id, fromKey, toKey],
    queryFn: async () => {
      if (!user) {
        return {
          sets: [],
          volumeTotals: { push: 0, pull: 0, legs: 0, total: 0 },
          weeklyVolume: [],
          progressions: [],
        };
      }

      // Query from the exercises table (where data actually lives)
      // joined with workouts for date and day_name
      let query = supabase
        .from('exercises')
        .select(`
          id,
          workout_id,
          name,
          category,
          sort_order,
          target_weight,
          target_reps,
          actual_weight,
          actual_reps,
          completed,
          workouts!inner (date, user_id, day_name)
        `)
        .eq('workouts.user_id', user.id)
        .eq('completed', true);

      if (dateRange) {
        query = query
          .gte('workouts.date', fromKey!)
          .lte('workouts.date', toKey!);
      }

      query = query.order('sort_order', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Map exercises to ExerciseSet format, deriving push/pull/legs per exercise
      const sets: ExerciseSet[] = (data || []).map((ex: any, idx: number) => {
        const dayName = ex.workouts?.day_name || '';
        const exerciseName = stripSetSuffix(ex.name);
        return {
          id: ex.id,
          workout_id: ex.workout_id,
          exercise_name: exerciseName,
          exercise_category: categorizeExercise(exerciseName, dayName),
          training_category: ex.category ?? 'accessory',
          set_number: ex.sort_order ?? idx + 1,
          target_weight: parseWeight(ex.target_weight),
          target_reps: parseReps(ex.target_reps),
          actual_weight: parseWeight(ex.actual_weight),
          actual_reps: parseReps(ex.actual_reps),
          completed: ex.completed ?? false,
          created_at: '',
          workout_date: ex.workouts?.date,
        };
      });

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
        .filter(p => p.data.length >= 1) // Show exercises with at least 1 week of data
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
