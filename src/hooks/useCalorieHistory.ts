import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useDailyMetrics } from './useDailyMetrics';
import { format, eachDayOfInterval, subDays } from 'date-fns';
import { DateRange } from '@/contexts/DateRangeContext';
import { resolveBodyweightKg } from '@/lib/workoutCalories';
import { estimateDayActivity } from '@/lib/dayActivity';
import { ageOnDate, calculateRee, effectiveWeightAt, nonexerciseBaselineFactor } from '@/lib/energyEngineV3';

interface CalorieDataPoint { date: string; intake: number; burned: number; workoutBurned: number; manualBurned: number; baseline: number; expenditure: number; net: number; }

export function useCalorieHistory(dateRange: DateRange) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { data: metricsData } = useDailyMetrics({ from: subDays(dateRange.from, 30), to: dateRange.to });
  const avgBodyweight = metricsData?.totals?.avgBodyweight;
  const fallbackWeight = resolveBodyweightKg(avgBodyweight, preferences?.initial_weight_kg);
  const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calorie-history', user?.id, startDateStr, endDateStr, fallbackWeight, preferences?.height_cm, preferences?.gender, preferences?.date_of_birth, preferences?.nonexercise_lifestyle],
    queryFn: async (): Promise<CalorieDataPoint[]> => {
      if (!user) return [];
      const [mealsRes, burnsRes, workoutsRes, weightsRes, statesRes] = await Promise.all([
        supabase.from('meals').select('date, calories').eq('user_id', user.id).gte('date', startDateStr).lte('date', endDateStr),
        supabase.from('calorie_burns').select('date, calories, source, activity_type, duration_minutes, distance_km').eq('user_id', user.id).gte('date', startDateStr).lte('date', endDateStr),
        supabase.from('workouts').select(`id,date,day_name,started_at,completed_at,workout_duration_minutes,explicit_pause_seconds,is_skipped,exercises ( category, completed )`).eq('user_id', user.id).gte('date', startDateStr).lte('date', endDateStr),
        supabase.from('daily_metrics').select('date, bodyweight').eq('user_id', user.id).not('bodyweight', 'is', null).order('date', { ascending: true }),
        (supabase.from('energy_model_states' as any) as any).select('effective_date,personal_baseline').eq('user_id', user.id).gte('effective_date', format(subDays(dateRange.from, 365), 'yyyy-MM-dd')).lte('effective_date', endDateStr).order('effective_date', { ascending: true }),
      ]);

      // Core energy inputs must fail loudly. Treating a failed read as an empty
      // array produces believable but wrong zero-intake/zero-burn days.
      for (const response of [mealsRes, burnsRes, workoutsRes, weightsRes]) {
        if (response.error) throw response.error;
      }
      // The personalized-baseline table is optional for older deployments; only
      // that known absence is allowed to fall back to the formula baseline.
      if (statesRes.error && !/schema cache|does not exist/i.test(statesRes.error.message || '')) throw statesRes.error;

      const weightByDate: Record<string, number> = {};
      const observations = ((weightsRes.data || []) as { date: string; bodyweight: number }[]).map(w => ({ date: w.date, kg: Number(w.bodyweight) }));
      const allRangeDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      allRangeDays.forEach(d => { const ds = format(d, 'yyyy-MM-dd'); weightByDate[ds] = effectiveWeightAt(observations, ds, preferences?.initial_weight_kg).kg; });

      const intakeByDate: Record<string, number> = {};
      (mealsRes.data || []).forEach((meal: any) => { intakeByDate[meal.date] = (intakeByDate[meal.date] || 0) + (meal.calories || 0); });
      const activityHistory = (burnsRes.data || []).filter((burn: any) => burn.source === 'manual').map((burn: any) => ({ date: burn.date, activityType: burn.activity_type, distanceKm: burn.distance_km, durationMinutes: burn.duration_minutes }));
      const burnsGrouped: Record<string, any[]> = {};
      (burnsRes.data || []).forEach((burn: any) => { (burnsGrouped[burn.date] ||= []).push(burn); });
      const workoutsGrouped: Record<string, any[]> = {};
      (workoutsRes.data || []).forEach((workout: any) => { (workoutsGrouped[workout.date] ||= []).push(workout); });
      const burnsByDate: Record<string, number> = {};
      const workoutBurnByDate: Record<string, number> = {};
      const manualBurnByDate: Record<string, number> = {};
      allRangeDays.forEach(day => {
        const ds = format(day, 'yyyy-MM-dd');
        const { categories, total } = estimateDayActivity({ date: ds, workouts: workoutsGrouped[ds] || [], burns: burnsGrouped[ds] || [], weight: weightByDate[ds] || fallbackWeight, history: activityHistory });
        burnsByDate[ds] = Math.round(total); workoutBurnByDate[ds] = Math.round(categories.workout); manualBurnByDate[ds] = Math.round(total - categories.workout);
      });

      const modelStates = statesRes.error ? [] : (statesRes.data || []);
      return allRangeDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const intake = intakeByDate[dateStr] || 0;
        const burned = burnsByDate[dateStr] || 0;
        const latestState = modelStates.filter((state: any) => state.effective_date <= dateStr).slice(-1)[0];
        const formulaBaseline = Math.round(calculateRee(weightByDate[dateStr] || fallbackWeight, Number(preferences?.height_cm) || 170, ageOnDate(preferences?.date_of_birth, dateStr, preferences?.age), preferences?.gender) * nonexerciseBaselineFactor(preferences?.nonexercise_lifestyle));
        const baseline = Math.round(Number(latestState?.personal_baseline) || formulaBaseline);
        const expenditure = baseline + burned;
        return { date: dateStr, intake, burned, workoutBurned: workoutBurnByDate[dateStr] || 0, manualBurned: manualBurnByDate[dateStr] || 0, baseline, expenditure, net: intake - expenditure };
      });
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
  });
}
