import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  workouts: number;
  totalVolume: number;
  avgSleep: number | null;
  caloriesIn: number;
  priorWeekWorkouts?: number;
  priorWeekVolume?: number;
}

export interface MonthlySummary {
  month: string;
  workouts: number;
  totalVolume: number;
  avgSleep: number | null;
  priorMonthWorkouts?: number;
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export function useCorrelationAnalysis(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['correlationAnalysis', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!user) return { weeklySummaries: [], monthlySummary: null };

      const now = new Date();
      const endDate = dateRange?.to ?? now;
      const startDate = dateRange?.from ?? subDays(now, 60);

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const priorStart = format(subDays(startDate, 60), 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const [workoutsRes, dailyMetricsRes, mealsRes, exercisesRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('id, date, workout_duration_minutes, completed_at')
          .eq('user_id', user.id)
          .gte('date', priorStart)
          .order('date', { ascending: true }),
        supabase
          .from('daily_metrics')
          .select('date, sleep_hours, bodyweight')
          .eq('user_id', user.id)
          .gte('date', priorStart)
          .order('date', { ascending: true }),
        supabase
          .from('meals')
          .select('date, calories')
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .order('date', { ascending: true }),
        supabase
          .from('exercises')
          .select('workout_id, name, actual_weight, actual_reps, completed')
          .in('workout_id', (await supabase
            .from('workouts')
            .select('id')
            .eq('user_id', user.id)
            .gte('date', startDateStr)).data?.map(w => w.id) || []),
      ]);

      const workouts = workoutsRes.data || [];
      const dailyMetrics = dailyMetricsRes.data || [];
      const meals = mealsRes.data || [];
      const exercises = exercisesRes.data || [];

      // Calculate weekly summaries (last 4 weeks)
      const weeklySummaries: WeeklySummary[] = [];

      for (let i = 0; i < 4; i++) {
        const weekEnd = subDays(now, i * 7);
        const weekStart = subDays(weekEnd, 6);
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        const weekWorkouts = workouts.filter(w => w.date >= weekStartStr && w.date <= weekEndStr);
        const weekMetrics = dailyMetrics.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);
        const weekMeals = meals.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);

        const weekExercises = exercises.filter(e =>
          weekWorkouts.some(w => w.id === e.workout_id) && e.completed
        );

        const totalVolume = weekExercises.reduce((sum, e) => {
          const weight = parseFloat(e.actual_weight?.match(/[\d.]+/)?.[0] || '0');
          const reps = parseInt(e.actual_reps?.match(/\d+/)?.[0] || '0');
          return sum + weight * reps;
        }, 0);

        const sleepData = weekMetrics.filter(m => m.sleep_hours && m.sleep_hours > 0).map(m => m.sleep_hours!);

        weeklySummaries.push({
          weekStart: format(weekStart, 'MMM d'),
          weekEnd: format(weekEnd, 'MMM d'),
          workouts: weekWorkouts.length,
          totalVolume: Math.round(totalVolume),
          avgSleep: sleepData.length ? sleepData.reduce((a, b) => a + b, 0) / sleepData.length : null,
          caloriesIn: weekMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
        });
      }

      // Add week-over-week comparisons
      for (let i = 0; i < weeklySummaries.length - 1; i++) {
        weeklySummaries[i].priorWeekWorkouts = weeklySummaries[i + 1].workouts;
        weeklySummaries[i].priorWeekVolume = weeklySummaries[i + 1].totalVolume;
      }

      // Calculate monthly summary
      const currentMonthStart = format(startOfMonth(endDate), 'yyyy-MM-dd');
      const currentMonthEnd = format(endOfMonth(endDate), 'yyyy-MM-dd');
      const monthWorkouts = workouts.filter(w => w.date >= currentMonthStart && w.date <= currentMonthEnd);

      const priorMonthStartDate = subDays(startOfMonth(endDate), 1);
      const priorMonthStart = format(startOfMonth(priorMonthStartDate), 'yyyy-MM-dd');
      const priorMonthEnd = format(endOfMonth(priorMonthStartDate), 'yyyy-MM-dd');
      const priorMonthWorkouts = workouts.filter(w => w.date >= priorMonthStart && w.date <= priorMonthEnd);

      const monthMetrics = dailyMetrics.filter(m => m.date >= currentMonthStart && m.date <= currentMonthEnd);
      const monthExercises = exercises.filter(e =>
        monthWorkouts.some(w => w.id === e.workout_id) && e.completed
      );

      const monthVolume = monthExercises.reduce((sum, e) => {
        const weight = parseFloat(e.actual_weight?.match(/[\d.]+/)?.[0] || '0');
        const reps = parseInt(e.actual_reps?.match(/\d+/)?.[0] || '0');
        return sum + weight * reps;
      }, 0);

      const monthSleep = monthMetrics.filter(m => m.sleep_hours && m.sleep_hours > 0).map(m => m.sleep_hours!);

      const monthlySummary: MonthlySummary = {
        month: format(endDate, 'MMMM yyyy'),
        workouts: monthWorkouts.length,
        totalVolume: Math.round(monthVolume),
        avgSleep: monthSleep.length ? monthSleep.reduce((a, b) => a + b, 0) / monthSleep.length : null,
        priorMonthWorkouts: priorMonthWorkouts.length,
      };

      return { weeklySummaries, monthlySummary };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
