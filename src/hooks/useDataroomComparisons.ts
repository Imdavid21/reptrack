import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';
import { useAuth } from './useAuth';
import { useDailyMetrics } from './useDailyMetrics';
import { useExerciseSets } from './useExerciseSets';
import { useWorkouts } from './useWorkouts';
import { useUserPreferences } from './useUserPreferences';
import { buildTemporalAnalysis } from '@/lib/dataroom/temporal';
import { fetchMealRows } from '@/lib/fetchMealRows';
import type { MealDay } from '@/lib/dataroom/types';
import type { DateRange } from '@/contexts/DateRangeContext';

export function useDataroomComparisons(dateRange: DateRange) {
  const { user } = useAuth();
  const endDate = format(dateRange.to, 'yyyy-MM-dd');
  const selectedDays = Math.max(1, differenceInCalendarDays(dateRange.to, dateRange.from) + 1);
  const comparisonRange = useMemo(() => {
    const baselineStart = startOfDay(subDays(dateRange.to, 55));
    return {
      from: dateRange.from < baselineStart ? dateRange.from : baselineStart,
      to: dateRange.to,
    };
  }, [dateRange.from, dateRange.to]);
  const startDate = format(comparisonRange.from, 'yyyy-MM-dd');

  const metrics = useDailyMetrics(comparisonRange);
  const exerciseSets = useExerciseSets(comparisonRange);
  const workouts = useWorkouts();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();

  const meals = useQuery({
    queryKey: ['dataroom-temporal-meals', user?.id, startDate, endDate],
    enabled: !!user,
    queryFn: async (): Promise<MealDay[]> => {
      if (!user) return [];
      const rows = await fetchMealRows(user.id, startDate, endDate);
      const byDay = new Map<string, MealDay>();
      for (const row of rows) {
        const day = byDay.get(row.date) ?? { date: row.date, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, potassium: 0 };
        day.calories += Number(row.calories) || 0;
        day.protein += Number(row.protein) || 0;
        day.carbs += Number(row.carbs) || 0;
        day.fat += Number(row.fat) || 0;
        day.fiber += Number(row.fiber) || 0;
        day.sugar += Number(row.sugar) || 0;
        day.sodium += Number(row.sodium) || 0;
        day.potassium += Number(row.potassium) || 0;
        byDay.set(row.date, day);
      }
      return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  const comparisonWorkouts = useMemo(
    () => workouts.workouts.filter(workout => workout.date >= startDate && workout.date <= endDate),
    [workouts.workouts, startDate, endDate],
  );

  const analysis = useMemo(() => {
    if (!metrics.data || !exerciseSets.data || !meals.data) return null;
    return buildTemporalAnalysis({
      metrics: metrics.data.dataPoints.map(day => ({ date: day.date, bodyweight: day.bodyweight, sleep: day.sleep_hours })),
      meals: meals.data,
      sets: exerciseSets.data.sets.map(set => ({ exercise: set.exercise_name, date: set.workout_date || '', weight: set.actual_weight || 0, reps: set.actual_reps || 0 })),
      workouts: comparisonWorkouts.map(workout => ({ date: workout.date, duration: workout.workout_duration_minutes })),
      proteinGoal: preferences?.daily_protein_goal || 165,
      sleepGoal: preferences?.sleep_goal || 8,
      endDate,
    }, selectedDays);
  }, [metrics.data, exerciseSets.data, meals.data, comparisonWorkouts, preferences, endDate, selectedDays]);

  return {
    analysis,
    selectedDays,
    isLoading: metrics.isLoading || exerciseSets.isLoading || meals.isLoading || workouts.isLoading || preferencesLoading,
    error: metrics.error || exerciseSets.error || meals.error || workouts.error,
  };
}
