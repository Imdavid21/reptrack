import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useDailyMetrics } from './useDailyMetrics';
import { format, eachDayOfInterval, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { DateRange } from '@/contexts/DateRangeContext';

interface CalorieDataPoint {
  date: string;
  intake: number;
  burned: number;
  net: number;
}

// MET values for calorie calculation
const MET_VALUES: Record<string, number> = {
  'push': 5.0,
  'pull': 5.0,
  'legs': 6.0,
  'accessory': 4.0,
  'strength': 5.0,
};

export function useCalorieHistory(dateRange: DateRange) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();

  // Fetch a wider bodyweight history for per-date lookup (with fallback)
  const { data: metricsData } = useDailyMetrics({
    from: subDays(dateRange.from, 30),
    to: dateRange.to,
  });
  const avgBodyweight = metricsData?.totals?.avgBodyweight;
  const fallbackWeight = avgBodyweight || preferences?.weight_goal || 70;

  const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calorie-history', user?.id, startDateStr, endDateStr, fallbackWeight],
    queryFn: async (): Promise<CalorieDataPoint[]> => {
      if (!user) return [];

      // Fetch meals (intake), manual burns, workouts, and bodyweight history in parallel
      const [mealsRes, burnsRes, workoutsRes, weightsRes] = await Promise.all([
        supabase
          .from('meals')
          .select('date, calories')
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase
          .from('calorie_burns')
          .select('date, calories, source, activity_type')
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase
          .from('workouts')
          .select(`
            id,
            date,
            day_name,
            started_at,
            completed_at,
            workout_duration_minutes,
            exercises ( category )
          `)
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase
          .from('daily_metrics')
          .select('date, bodyweight')
          .eq('user_id', user.id)
          .not('bodyweight', 'is', null)
          .order('date', { ascending: true }),
      ]);

      // Build per-date bodyweight map with carry-forward fallback
      const weightByDate: Record<string, number> = {};
      let lastWeight = fallbackWeight;
      const sortedWeights = (weightsRes.data || []) as { date: string; bodyweight: number }[];
      const weightIdx: Record<string, number> = {};
      sortedWeights.forEach(w => { weightIdx[w.date] = Number(w.bodyweight); });
      const allRangeDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      // Seed lastWeight from any earlier-dated weigh-in
      const firstRangeDateStr = format(dateRange.from, 'yyyy-MM-dd');
      const earliestSeed = sortedWeights.filter(w => w.date <= firstRangeDateStr).slice(-1)[0];
      if (earliestSeed) lastWeight = Number(earliestSeed.bodyweight);
      allRangeDays.forEach(d => {
        const ds = format(d, 'yyyy-MM-dd');
        if (weightIdx[ds]) lastWeight = weightIdx[ds];
        weightByDate[ds] = lastWeight;
      });

      // Group intake by date
      const intakeByDate: Record<string, number> = {};
      (mealsRes.data || []).forEach((meal: any) => {
        intakeByDate[meal.date] = (intakeByDate[meal.date] || 0) + (meal.calories || 0);
      });

      // Group persisted burns by date; track per-workout rows so fallback calculations do not double-count
      const persistedWorkoutBurnIds = new Set<string>();
      const burnsByDate: Record<string, number> = {};
      (burnsRes.data || []).forEach((burn: any) => {
        burnsByDate[burn.date] = (burnsByDate[burn.date] || 0) + (burn.calories || 0);
        if (burn.source === 'workout' && burn.activity_type?.startsWith('workout:')) {
          persistedWorkoutBurnIds.add(burn.activity_type.replace('workout:', ''));
        }
      });

      // Calculate workout calories from workout data
      (workoutsRes.data || []).forEach((workout: any) => {
        const date = workout.date;

        // Only skip the exact workout if its burn has already been persisted
        if (persistedWorkoutBurnIds.has(workout.id)) return;

        const exercises = workout.exercises || [];

        // Calculate duration - prioritize stored duration, then started_at/completed_at
        let durationMinutes = workout.workout_duration_minutes;

        if (!durationMinutes && workout.started_at && workout.completed_at) {
          durationMinutes = Math.max(
            differenceInMinutes(parseISO(workout.completed_at), parseISO(workout.started_at)),
            0
          );
        }

        if (durationMinutes && durationMinutes > 0) {
          let primaryCategory = 'strength';

          if (exercises.length > 0) {
            const categoryCounts: Record<string, number> = {};
            exercises.forEach((ex: any) => {
              const cat = ex.category.toLowerCase();
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            primaryCategory = Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])[0]?.[0] || 'strength';
          } else if (workout.day_name) {
            const dayNameLower = workout.day_name.toLowerCase();
            if (dayNameLower.includes('push')) primaryCategory = 'push';
            else if (dayNameLower.includes('pull')) primaryCategory = 'pull';
            else if (dayNameLower.includes('leg')) primaryCategory = 'legs';
          }

          const met = MET_VALUES[primaryCategory] || 5.0;
          const dayWeight = weightByDate[date] || fallbackWeight;
          const calories = Math.round(met * dayWeight * (durationMinutes / 60));
          burnsByDate[date] = (burnsByDate[date] || 0) + calories;
        }
      });

      // Generate array for all days in range
      const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      
      return allDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const intake = intakeByDate[dateStr] || 0;
        const burned = burnsByDate[dateStr] || 0;
        return {
          date: dateStr,
          intake,
          burned,
          net: intake - burned,
        };
      });
    },
    enabled: !!user,
  });
}
