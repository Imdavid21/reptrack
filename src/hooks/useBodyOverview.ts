import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useGoalHistory } from './useGoalHistory';
import { useNextWorkout } from './useNextWorkout';
import { localDateKey } from '@/lib/dateKey';
import {
  computeBodyOverview,
  computeScoreSeries,
  normalizeWaterGoalLiters,
  BodyOverview,
  BodyOverviewInput,
  ScorePoint,
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
  const { resolveGoal } = useGoalHistory();
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

  // Resolves what each goal was on a given day via goal_history, falling back
  // to the live preference (or a hardcoded default) when there's no history —
  // e.g. a goal never edited since point-in-time tracking shipped. Point-in-
  // time only for the numeric daily/weekly targets; weightGoalType is a
  // direction flag judged by trend, not a per-day number, so it always uses
  // the live preference.
  const resolveGoals = useCallback((dateKey: string): BodyOverviewInput['goals'] => ({
    weeklyWorkouts: resolveGoal('weekly_workout_goal', dateKey, preferences?.weekly_workout_goal || 4),
    dailyCalories: preferences?.daily_calorie_goal != null
      ? resolveGoal('daily_calorie_goal', dateKey, preferences.daily_calorie_goal)
      : null,
    dailyProtein: preferences?.daily_protein_goal != null
      ? resolveGoal('daily_protein_goal', dateKey, preferences.daily_protein_goal)
      : null,
    dailyWaterLiters: resolveGoal('daily_water_goal', dateKey, normalizeWaterGoalLiters(preferences?.daily_water_goal)),
    sleepHours: resolveGoal('sleep_goal', dateKey, preferences?.sleep_goal || 8),
    weightGoalType: preferences?.weight_goal_type ?? null,
  }), [preferences, resolveGoal]);

  const data = query.data;

  const overview: BodyOverview | null = useMemo(() => {
    if (!data) return null;
    const inMain = (d?: string) => !!d && d >= fromKey && d <= toKey;
    return computeBodyOverview({
      rangeDays,
      goals: resolveGoals(toKey),
      // The fetch is widened for the trend; the headline overview uses only the range.
      workoutDates: data.workoutDates.filter(inMain),
      meals: data.meals.filter(m => inMain(m.date)),
      waterByDay: Object.fromEntries(Object.entries(data.waterByDay).filter(([d]) => inMain(d))),
      metrics: data.metrics.filter(m => inMain(m.date)),
      nextDayName: nextWorkout?.dayName,
      nextDayKey: nextWorkout?.dayKey,
    });
  }, [data, resolveGoals, rangeDays, fromKey, toKey, nextWorkout?.dayName, nextWorkout?.dayKey]);

  const trend: ScorePoint[] = useMemo(() => {
    if (!data) return [];
    const windows = eachDayOfInterval({ start: from, end: to }).map((d) => {
      const dateKey = localDateKey(d);
      return { date: dateKey, fromKey: localDateKey(subDays(d, TRAILING_DAYS - 1)), toKey: dateKey };
    });
    return computeScoreSeries(windows, data, resolveGoals, TRAILING_DAYS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, resolveGoals, fromKey, toKey]);

  return {
    overview,
    trend,
    isLoading: query.isLoading,
    error: query.error,
  };
}
