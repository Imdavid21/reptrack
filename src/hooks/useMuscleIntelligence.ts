import { useMemo } from 'react';
import { useExerciseSets } from './useExerciseSets';
import { useManualActivitiesInRange } from './useCalorieBurn';
import { useDateRange } from '@/contexts/DateRangeContext';
import { analyzeMuscles, InsightActivity, InsightSet, MuscleIntelligence } from '@/lib/muscleInsights';

/**
 * Runs the muscle-intelligence engine over the global date range's sets plus
 * logged activity (walk/run/cycle/box also load muscles — see
 * ACTIVITY_MUSCLE_LOAD in muscleInsights.ts). Returns balance / plateaus /
 * PRs / growth-room insights for the UI.
 */
export function useMuscleIntelligence(): { data: MuscleIntelligence | null; isLoading: boolean } {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const { data: activityData } = useManualActivitiesInRange(dateRange.from, dateRange.to);

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
    const activities: InsightActivity[] = (activityData ?? []).map(a => ({
      activity_type: a.activity_type,
      duration_minutes: a.duration_minutes,
    }));
    return analyzeMuscles(sets, rangeDays, activities);
  }, [data?.sets, rangeDays, activityData]);

  return { data: intelligence, isLoading };
}
