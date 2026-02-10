import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useDailyMetrics } from './useDailyMetrics';
import { format, eachDayOfInterval, parseISO, differenceInMinutes } from 'date-fns';
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

  // Get actual bodyweight from daily metrics, fall back to weight_goal, then 70kg
  const { data: metricsData } = useDailyMetrics({ from: new Date(Date.now() - 30 * 86400000), to: new Date() });
  const latestBodyweight = metricsData?.totals?.avgBodyweight;
  const weightKg = latestBodyweight || preferences?.weight_goal || 70;

  const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calorie-history', user?.id, startDateStr, endDateStr, weightKg],
    queryFn: async (): Promise<CalorieDataPoint[]> => {
      if (!user) return [];

      // Fetch meals (intake) and calorie burns in parallel
      const [mealsRes, burnsRes, workoutsRes] = await Promise.all([
        supabase
          .from('meals')
          .select('date, calories')
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase
          .from('calorie_burns')
          .select('date, calories')
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase
          .from('workouts')
          .select(`
            date,
            day_name,
            started_at,
            completed_at,
            workout_duration_minutes,
            exercises (
              category
            )
          `)
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
      ]);

      // Group intake by date
      const intakeByDate: Record<string, number> = {};
      (mealsRes.data || []).forEach((meal: any) => {
        intakeByDate[meal.date] = (intakeByDate[meal.date] || 0) + (meal.calories || 0);
      });

      // Group manual burns by date (from calorie_burns table only)
      const manualBurnDates = new Set<string>();
      const burnsByDate: Record<string, number> = {};
      (burnsRes.data || []).forEach((burn: any) => {
        burnsByDate[burn.date] = (burnsByDate[burn.date] || 0) + (burn.calories || 0);
        manualBurnDates.add(burn.date);
      });

      // Calculate workout calories from workout data
      (workoutsRes.data || []).forEach((workout: any) => {
        const date = workout.date;
        
        // Skip only if we have MANUAL burns for this date (from calorie_burns table)
        if (manualBurnDates.has(date)) return;

        const exercises = workout.exercises || [];
        
        // Calculate duration - prioritize stored duration, then started_at/completed_at
        let durationMinutes = workout.workout_duration_minutes;
        
        if (!durationMinutes && workout.started_at && workout.completed_at) {
          durationMinutes = Math.max(
            differenceInMinutes(parseISO(workout.completed_at), parseISO(workout.started_at)),
            0
          );
        }

        // If we have duration, calculate calories
        if (durationMinutes && durationMinutes > 0) {
          // Get primary category from exercises, or infer from day_name
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
          const calories = Math.round(met * weightKg * (durationMinutes / 60));
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
