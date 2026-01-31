import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { format, subDays, eachDayOfInterval, parseISO, differenceInMinutes } from 'date-fns';

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

export function useCalorieHistory(days: number = 7) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const weightKg = preferences?.weight_goal || 70;

  return useQuery({
    queryKey: ['calorie-history', user?.id, days, weightKg],
    queryFn: async (): Promise<CalorieDataPoint[]> => {
      if (!user) return [];

      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

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
            completed_at,
            workout_duration_minutes,
            exercise_sets (
              created_at,
              exercise_category
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

      // Group burns by date
      const burnsByDate: Record<string, number> = {};
      (burnsRes.data || []).forEach((burn: any) => {
        burnsByDate[burn.date] = (burnsByDate[burn.date] || 0) + (burn.calories || 0);
      });

      // Calculate workout calories from workout data
      (workoutsRes.data || []).forEach((workout: any) => {
        const date = workout.date;
        
        // Skip if we already have manual burns for this date
        if (burnsByDate[date]) return;

        const sets = workout.exercise_sets || [];
        
        // Calculate duration - prioritize stored duration, then calculate from sets
        let durationMinutes = workout.workout_duration_minutes;
        
        if (!durationMinutes && sets.length > 0) {
          const sortedSets = [...sets].sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          const firstSetTime = parseISO(sortedSets[0].created_at);
          const endTime = workout.completed_at 
            ? parseISO(workout.completed_at) 
            : parseISO(sortedSets[sortedSets.length - 1].created_at);
          
          durationMinutes = Math.max(differenceInMinutes(endTime, firstSetTime), 0);
        }

        // If we have duration, calculate calories
        if (durationMinutes && durationMinutes > 0) {
          // Get primary category from sets, or infer from day_name
          let primaryCategory = 'strength';
          
          if (sets.length > 0) {
            const categoryCounts: Record<string, number> = {};
            sets.forEach((set: any) => {
              const cat = set.exercise_category.toLowerCase();
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            primaryCategory = Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])[0]?.[0] || 'strength';
          } else if (workout.day_name) {
            // Infer category from day name (e.g., "Push Day" -> "push")
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
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      
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
