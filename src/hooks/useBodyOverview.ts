import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useNextWorkout } from './useNextWorkout';
import { useExerciseSets } from './useExerciseSets';
import { localDateKey } from '@/lib/dateKey';
import {
  computeBodyOverview,
  computeScoreSeries,
  normalizeWaterGoalLiters,
  BodyOverview,
  BodyOverviewInput,
  ScorePoint,
  StrengthSetInput,
  STRENGTH_LOOKBACK_DAYS,
} from '@/lib/bodyScore';

export interface BodyOverviewRange {
  from: Date;
  to: Date;
}

// Trailing window used for each point on the body-score trend line.
const TRAILING_DAYS = 7;

/**
 * Fetches the raw logs for the window and runs the body-score engine, returning
 * both the headline overview and a rolling daily trend of the overall score
 * (each point = the same score computed over its trailing 7 days). One widened
 * fetch powers both. Defaults to the last 14 days (Dashboard); Insights passes
 * its global date range.
 */
export function useBodyOverview(range?: BodyOverviewRange) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const nextWorkout = useNextWorkout();

  const from = range?.from ?? startOfDay(subDays(new Date(), 13));
  const to = range?.to ?? endOfDay(new Date());
  // Widen the lower bound so the first day of the range has a full trailing week.
  const widenedFrom = startOfDay(subDays(from, TRAILING_DAYS - 1));
  const fromKey = localDateKey(from);
  const toKey = localDateKey(to);
  const widenedFromKey = localDateKey(widenedFrom);
  const rangeDays = Math.max(
    1,
    Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000) + 1,
  );

  // Strength progress needs more history than the other pillars — a primary
  // lift on a 6-day split recurs about once a week, so judging a trend needs
  // multiple weeks even when the display range itself is short. Always look
  // back at least STRENGTH_LOOKBACK_DAYS, wider still if the range already is.
  const strengthFrom = startOfDay(subDays(to, Math.max(STRENGTH_LOOKBACK_DAYS, rangeDays) - 1));
  const { data: exerciseSetsData } = useExerciseSets({ from: strengthFrom, to });
  const strengthSets: StrengthSetInput[] = useMemo(() => (
    (exerciseSetsData?.sets ?? [])
      .filter(s => !!s.workout_date)
      .map(s => ({
        date: s.workout_date as string,
        exercise_name: s.exercise_name,
        category: s.training_category,
        actual_weight: s.actual_weight,
        actual_reps: s.actual_reps,
      }))
  ), [exerciseSetsData]);

  const query = useQuery({
    queryKey: ['bodyOverview', user?.id, widenedFromKey, toKey],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user) return null;

      const [workoutsRes, mealsRes, waterRes, metricsRes] = await Promise.all([
        supabase.from('workouts').select('date').eq('user_id', user.id).gte('date', widenedFromKey).lte('date', toKey),
        supabase.from('meals').select('date, calories, protein').eq('user_id', user.id).gte('date', widenedFromKey).lte('date', toKey),
        supabase.from('water_logs').select('timestamp, amount').eq('user_id', user.id).gte('timestamp', widenedFrom.toISOString()).lte('timestamp', to.toISOString()),
        supabase.from('daily_metrics').select('date, sleep_hours, bodyweight').eq('user_id', user.id).gte('date', widenedFromKey).lte('date', toKey),
      ]);

      const firstError = workoutsRes.error || mealsRes.error || waterRes.error || metricsRes.error;
      if (firstError) throw firstError;

      // Water logs come as timestamped entries (liters); bucket by local day.
      const waterByDay: Record<string, number> = {};
      for (const log of waterRes.data ?? []) {
        const day = localDateKey(new Date(log.timestamp as string));
        waterByDay[day] = (waterByDay[day] ?? 0) + (Number(log.amount) || 0);
      }

      return {
        workoutDates: (workoutsRes.data ?? []).map(w => w.date as string),
        meals: (mealsRes.data ?? []).map(m => ({
          date: m.date as string,
          calories: m.calories as number | null,
          protein: (m as { protein?: number | null }).protein ?? null,
        })),
        waterByDay,
        metrics: (metricsRes.data ?? []).map(m => ({
          date: m.date as string,
          sleep_hours: m.sleep_hours as number | null,
          bodyweight: m.bodyweight as number | null,
        })),
      };
    },
  });

  const goals: BodyOverviewInput['goals'] = useMemo(() => ({
    weeklyWorkouts: preferences?.weekly_workout_goal || 4,
    dailyCalories: preferences?.daily_calorie_goal ?? null,
    dailyProtein: preferences?.daily_protein_goal ?? null,
    dailyWaterLiters: normalizeWaterGoalLiters(preferences?.daily_water_goal),
    sleepHours: preferences?.sleep_goal || 8,
    weightGoalType: preferences?.weight_goal_type ?? null,
  }), [preferences]);

  const data = query.data;

  const overview: BodyOverview | null = useMemo(() => {
    if (!data) return null;
    const inMain = (d?: string) => !!d && d >= fromKey && d <= toKey;
    return computeBodyOverview({
      rangeDays,
      goals,
      // The fetch is widened for the trend; the headline overview uses only the range.
      workoutDates: data.workoutDates.filter(inMain),
      meals: data.meals.filter(m => inMain(m.date)),
      waterByDay: Object.fromEntries(Object.entries(data.waterByDay).filter(([d]) => inMain(d))),
      metrics: data.metrics.filter(m => inMain(m.date)),
      // NOT filtered by inMain — strength deliberately uses its own wider
      // lookback (strengthFrom..to) computed above, independent of the
      // display range.
      strengthSets,
      nextDayName: nextWorkout?.dayName,
      nextDayKey: nextWorkout?.dayKey,
    });
  }, [data, goals, rangeDays, fromKey, toKey, strengthSets, nextWorkout?.dayName, nextWorkout?.dayKey]);

  const trend: ScorePoint[] = useMemo(() => {
    if (!data) return [];
    const windows = eachDayOfInterval({ start: from, end: to }).map((d) => {
      const dateKey = localDateKey(d);
      return { date: dateKey, fromKey: localDateKey(subDays(d, TRAILING_DAYS - 1)), toKey: dateKey };
    });
    return computeScoreSeries(windows, { ...data, strengthSets }, goals, TRAILING_DAYS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, goals, fromKey, toKey, strengthSets]);

  return {
    overview,
    trend,
    isLoading: query.isLoading,
    error: query.error,
  };
}
