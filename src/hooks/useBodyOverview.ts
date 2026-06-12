import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useNextWorkout } from './useNextWorkout';
import { localDateKey } from '@/lib/dateKey';
import {
  computeBodyOverview,
  normalizeWaterGoalLiters,
  BodyOverview,
} from '@/lib/bodyScore';

export interface BodyOverviewRange {
  from: Date;
  to: Date;
}

/**
 * Fetches the raw logs for the window and runs the body-score engine.
 * Defaults to the last 14 days when no range is given (Dashboard usage);
 * the Insights page passes its global date range.
 */
export function useBodyOverview(range?: BodyOverviewRange) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const nextWorkout = useNextWorkout();

  const from = range?.from ?? startOfDay(subDays(new Date(), 13));
  const to = range?.to ?? endOfDay(new Date());
  const fromKey = localDateKey(from);
  const toKey = localDateKey(to);
  const rangeDays = Math.max(
    1,
    Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000) + 1,
  );

  const query = useQuery({
    queryKey: ['bodyOverview', user?.id, fromKey, toKey],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user) return null;

      const [workoutsRes, mealsRes, waterRes, metricsRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('date')
          .eq('user_id', user.id)
          .gte('date', fromKey)
          .lte('date', toKey),
        supabase
          .from('meals')
          .select('date, calories, protein')
          .eq('user_id', user.id)
          .gte('date', fromKey)
          .lte('date', toKey),
        supabase
          .from('water_logs')
          .select('timestamp, amount')
          .eq('user_id', user.id)
          .gte('timestamp', from.toISOString())
          .lte('timestamp', to.toISOString()),
        supabase
          .from('daily_metrics')
          .select('date, sleep_hours, bodyweight')
          .eq('user_id', user.id)
          .gte('date', fromKey)
          .lte('date', toKey),
      ]);

      const firstError =
        workoutsRes.error || mealsRes.error || waterRes.error || metricsRes.error;
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

  const overview: BodyOverview | null = query.data
    ? computeBodyOverview({
        rangeDays,
        goals: {
          weeklyWorkouts: preferences?.weekly_workout_goal || 4,
          dailyCalories: preferences?.daily_calorie_goal ?? null,
          dailyProtein: preferences?.daily_protein_goal ?? null,
          dailyWaterLiters: normalizeWaterGoalLiters(preferences?.daily_water_goal),
          sleepHours: preferences?.sleep_goal || 8,
          weightGoalType: preferences?.weight_goal_type ?? null,
        },
        workoutDates: query.data.workoutDates,
        meals: query.data.meals,
        waterByDay: query.data.waterByDay,
        metrics: query.data.metrics,
        nextDayName: nextWorkout?.dayName,
        nextDayKey: nextWorkout?.dayKey,
      })
    : null;

  return {
    overview,
    isLoading: query.isLoading,
    error: query.error,
  };
}
