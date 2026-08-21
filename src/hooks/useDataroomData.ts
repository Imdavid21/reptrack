import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDailyMetrics } from './useDailyMetrics';
import { useExerciseSets } from './useExerciseSets';
import { useCalorieHistory } from './useCalorieHistory';
import { useHydrationData } from './useHydrationData';
import { useWorkouts } from './useWorkouts';
import { useUserPreferences } from './useUserPreferences';
import { buildDataroomAnalysis, DATAROOM_WINDOWS } from '@/lib/dataroom/analysis';
import type { EnergyDay, MealDay } from '@/lib/dataroom/types';

export function useDataroomData() {
  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);
  const endDate = format(now, 'yyyy-MM-dd');
  const metricsRange = useMemo(() => ({ from: startOfDay(subDays(now, 89)), to: endOfDay(now) }), [now]);
  const trainingRange = useMemo(() => ({ from: startOfDay(subDays(now, DATAROOM_WINDOWS.resistanceVolumeDays - 1)), to: endOfDay(now) }), [now]);
  const nutritionRange = useMemo(() => ({ from: startOfDay(subDays(now, DATAROOM_WINDOWS.nutritionDays - 1)), to: endOfDay(now) }), [now]);

  const metrics = useDailyMetrics(metricsRange);
  const exerciseSets = useExerciseSets(trainingRange);
  const calorieHistory = useCalorieHistory(nutritionRange);
  const hydration = useHydrationData({ from: startOfDay(subDays(now, 13)), to: endOfDay(now) });
  const workouts = useWorkouts();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();

  const meals = useQuery({
    queryKey: ['dataroom-meals', user?.id, format(nutritionRange.from, 'yyyy-MM-dd'), endDate],
    enabled: !!user,
    queryFn: async (): Promise<MealDay[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('meals')
        .select('date,calories,protein,carbs,fat,fiber,sugar,sodium,potassium')
        .eq('user_id', user.id)
        .gte('date', format(nutritionRange.from, 'yyyy-MM-dd'))
        .lte('date', endDate);
      if (error) throw error;
      const byDay = new Map<string, MealDay>();
      for (const row of data ?? []) {
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

  const analysis = useMemo(() => {
    if (!metrics.data || !exerciseSets.data || !calorieHistory.data || !meals.data || !workouts.data || !preferences) return null;
    const loggedDates = new Set(meals.data.map(day => day.date));
    const energy: EnergyDay[] = calorieHistory.data.map(day => ({
      date: day.date,
      baseline: day.baseline,
      workout: day.workoutBurned,
      activity: day.manualBurned,
      expenditure: day.expenditure,
      intake: loggedDates.has(day.date) ? day.intake : undefined,
    }));
    return buildDataroomAnalysis({
      metrics: metrics.data.dataPoints.map(day => ({ date: day.date, bodyweight: day.bodyweight, sleep: day.sleep_hours })),
      meals: meals.data,
      sets: exerciseSets.data.sets.map(set => ({ exercise: set.exercise_name, date: set.workout_date || '', weight: set.actual_weight || 0, reps: set.actual_reps || 0 })),
      workouts: workouts.data.map(workout => ({ date: workout.date, duration: workout.workout_duration_minutes })),
      energy,
      goal: preferences.weight_goal_type,
      sleepGoal: preferences.sleep_goal || 8,
      proteinGoal: preferences.daily_protein_goal || 165,
      endDate,
    });
  }, [metrics.data, exerciseSets.data, calorieHistory.data, meals.data, workouts.data, preferences, endDate]);

  return {
    analysis,
    meals: meals.data ?? [],
    energy: calorieHistory.data ?? [],
    hydration: hydration.data,
    preferences,
    isLoading: metrics.isLoading || exerciseSets.isLoading || calorieHistory.isLoading || meals.isLoading || workouts.isLoading || hydration.isLoading || preferencesLoading,
    error: metrics.error || exerciseSets.error || calorieHistory.error || meals.error || workouts.error || hydration.error,
  };
}

