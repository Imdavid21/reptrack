import { useMemo } from 'react';
import { useExerciseSets } from './useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { analyzeMuscles, InsightSet, MuscleIntelligence } from '@/lib/muscleInsights';

/**
 * Runs the muscle-intelligence engine over the global date range's sets.
 * Returns balance / plateaus / PRs / growth-room insights for the UI.
 */
export function useMuscleIntelligence(): { data: MuscleIntelligence | null; isLoading: boolean } {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);

  const rangeDays = Math.max(
    1,
    Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / 86_400_000) + 1,
  );

  const intelligence = useMemo(() => {
    if (!data?.sets) return null;
    const sets: InsightSet[] = data.sets.map(s => ({
      exercise_name: s.exercise_name,
      actual_weight: s.actual_weight,
      actual_reps: s.actual_reps,
      workout_date: s.workout_date,
    }));
    return analyzeMuscles(sets, rangeDays);
  }, [data?.sets, rangeDays]);

  return { data: intelligence, isLoading };
}
