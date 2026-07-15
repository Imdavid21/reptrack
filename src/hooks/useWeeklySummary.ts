import { useMemo } from 'react';
import { startOfWeek } from 'date-fns';
import { useWorkouts } from './useWorkouts';
import { useExerciseSets } from './useExerciseSets';
import { useUserPreferences } from './useUserPreferences';
import { getSplitDays } from '@/lib/splitTemplates';
import { computeWeeklySummary, WeeklySummary } from '@/lib/weeklySummary';
import { localDateKey } from '@/lib/dateKey';

/**
 * This-week training review. `stalledCount` is passed in (the caller already has
 * the muscle-intelligence data) so this hook stays free of the date-range context.
 */
export function useWeeklySummary(stalledCount: number): WeeklySummary {
  const { workouts } = useWorkouts();
  const { preferences } = useUserPreferences();

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekStartKey = localDateKey(weekStart);
  const { data: setsData } = useExerciseSets({ from: weekStart, to: new Date() });

  const deficitMode = preferences?.deficit_mode_enabled ?? false;
  const sessionGoal = deficitMode ? 5 : (preferences?.weekly_workout_goal || 5);

  const mandatoryNames = useMemo(() => {
    const split = preferences?.training_split || 'ppl6';
    const days = getSplitDays(split);
    const names = new Set<string>();
    for (const day of Object.values(days)) {
      for (const ex of day.exercises) if ((ex as { mandatory?: boolean }).mandatory) names.add(ex.name);
    }
    return [...names];
  }, [preferences?.training_split]);

  return useMemo(() => {
    const weekDayNames = workouts.filter(w => w.date >= weekStartKey).map(w => w.day_name);
    const loggedExerciseNames = [...new Set((setsData?.sets ?? []).map(s => s.exercise_name))];
    return computeWeeklySummary({ weekDayNames, loggedExerciseNames, mandatoryNames, sessionGoal, stalledCount });
  }, [workouts, weekStartKey, setsData, mandatoryNames, sessionGoal, stalledCount]);
}
