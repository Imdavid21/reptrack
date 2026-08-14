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

interface CalorieDataPoint {
  date: string;
  intake: number;
  burned: number;
  /** Portion of `burned` from workouts (persisted or computed-fallback). */
  workoutBurned: number;
  /** Portion of `burned` from manually-logged activity (walk/run/cycle/box). */
  manualBurned: number;
  /** Normal day expenditure before deliberate exercise. */
  baseline: number;
  /** Baseline plus deliberate exercise/activity. */
  expenditure: number;
  /** Food minus total expenditure. Negative is a predicted deficit. */
  net: number;
}

export function useCalorieHistory(dateRange: DateRange) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();

  // Fetch a wider bodyweight history for per-date lookup (with fallback)
  const { data: metricsData } = useDailyMetrics({
    from: subDays(dateRange.from, 30),
    to: dateRange.to,
  });
  const avgBodyweight = metricsData?.totals?.avgBodyweight;
  const fallbackWeight = resolveBodyweightKg(avgBodyweight, preferences?.initial_weight_kg);

  const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calorie-history', user?.id, startDateStr, endDateStr, fallbackWeight, preferences?.height_cm, preferences?.gender, preferences?.date_of_birth, preferences?.nonexercise_lifestyle],
    queryFn: async (): Promise<CalorieDataPoint[]> => {
      if (!user) return [];

      // Fetch meals (intake), manual burns, workouts, and bodyweight history in parallel
      const [mealsRes, burnsRes, workoutsRes, weightsRes, statesRes] = await Promise.all([
        supabase
          .from('meals')
          .select('date, calories')
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase
          .from('calorie_burns')
          .select('date, calories, source, activity_type, duration_minutes, distance_km')
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
            explicit_pause_seconds,
            is_skipped,
            exercises ( category, completed )
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
        (supabase.from('energy_model_states' as any) as any)
          .select('effective_date,personal_baseline')
          .eq('user_id', user.id)
          .gte('effective_date', format(subDays(dateRange.from, 365), 'yyyy-MM-dd'))
          .lte('effective_date', endDateStr)
          .order('effective_date', { ascending: true }),
      ]);
      if (statesRes.error && !/schema cache|does not exist/i.test(statesRes.error.message || '')) throw statesRes.error;

      // Build a historical, recency-weighted bodyweight map. Goal weight is
      // never used as if it were measured physiology.
      const weightByDate: Record<string, number> = {};
      const sortedWeights = (weightsRes.data || []) as { date: string; bodyweight: number }[];
      const observations = sortedWeights.map(w => ({ date: w.date, kg: Number(w.bodyweight) }));
      const allRangeDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      allRangeDays.forEach(d => {
        const ds = format(d, 'yyyy-MM-dd');
        weightByDate[ds] = effectiveWeightAt(observations, ds, preferences?.initial_weight_kg).kg;
      });

      // Group intake by date
      const intakeByDate: Record<string, number> = {};
      (mealsRes.data || []).forEach((meal: any) => {
        intakeByDate[meal.date] = (intakeByDate[meal.date] || 0) + (meal.calories || 0);
      });

      // Recompute every day's deliberate activity with the same V3 engine the
      // dashboard uses. Stored `calories` is deliberately not trusted here:
      // pre-V3 rows hold gross MET figures that include resting expenditure,
      // which made History read 35-40% higher than Home for the same day.
      const activityHistory = (burnsRes.data || [])
        .filter((burn: any) => burn.source === 'manual')
        .map((burn: any) => ({ date: burn.date, activityType: burn.activity_type, distanceKm: burn.distance_km, durationMinutes: burn.duration_minutes }));

      const burnsGrouped: Record<string, any[]> = {};
      (burnsRes.data || []).forEach((burn: any) => {
        (burnsGrouped[burn.date] ||= []).push(burn);
      });
      const workoutsGrouped: Record<string, any[]> = {};
      (workoutsRes.data || []).forEach((workout: any) => {
        (workoutsGrouped[workout.date] ||= []).push(workout);
      });

      const burnsByDate: Record<string, number> = {};
      const workoutBurnByDate: Record<string, number> = {};
      const manualBurnByDate: Record<string, number> = {};
      eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).forEach(day => {
        const ds = format(day, 'yyyy-MM-dd');
        const { categories, total } = estimateDayActivity({
          date: ds,
          workouts: workoutsGrouped[ds] || [],
          burns: burnsGrouped[ds] || [],
          weight: weightByDate[ds] || fallbackWeight,
          history: activityHistory,
        });
        burnsByDate[ds] = Math.round(total);
        workoutBurnByDate[ds] = Math.round(categories.workout);
        manualBurnByDate[ds] = Math.round(total - categories.workout);
      });


      // Generate array for all days in range
      const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const modelStates = statesRes.error ? [] : (statesRes.data || []);
      
      return allDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const intake = intakeByDate[dateStr] || 0;
        const burned = burnsByDate[dateStr] || 0;
        const latestState = modelStates.filter((state: any) => state.effective_date <= dateStr).slice(-1)[0];
        const formulaBaseline = Math.round(
          calculateRee(
            weightByDate[dateStr] || fallbackWeight,
            Number(preferences?.height_cm) || 170,
            ageOnDate(preferences?.date_of_birth, dateStr, preferences?.age),
            preferences?.gender,
          ) * nonexerciseBaselineFactor(preferences?.nonexercise_lifestyle),
        );
        const baseline = Math.round(Number(latestState?.personal_baseline) || formulaBaseline);
        const expenditure = baseline + burned;
        return {
          date: dateStr,
          intake,
          burned,
          workoutBurned: workoutBurnByDate[dateStr] || 0,
          manualBurned: manualBurnByDate[dateStr] || 0,
          baseline,
          expenditure,
          net: intake - expenditure,
        };
      });
    },
    enabled: !!user,
  });
}
