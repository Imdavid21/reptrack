import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useDailyMetrics } from './useDailyMetrics';
import { format, eachDayOfInterval, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { DateRange } from '@/contexts/DateRangeContext';
import { calculateWorkoutCalories, resolveBodyweightKg } from '@/lib/workoutCalories';
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

      // Group persisted burns by date; track per-workout rows so fallback calculations do not double-count.
      // Also split by source so the UI can show workout vs manual-activity attribution, not just a combined total.
      const persistedWorkoutBurnIds = new Set<string>();
      const burnsByDate: Record<string, number> = {};
      const workoutBurnByDate: Record<string, number> = {};
      const manualBurnByDate: Record<string, number> = {};
      (burnsRes.data || []).forEach((burn: any) => {
        burnsByDate[burn.date] = (burnsByDate[burn.date] || 0) + (burn.calories || 0);
        if (burn.source === 'workout') {
          workoutBurnByDate[burn.date] = (workoutBurnByDate[burn.date] || 0) + (burn.calories || 0);
          if (burn.activity_type?.startsWith('workout:')) {
            persistedWorkoutBurnIds.add(burn.activity_type.replace('workout:', ''));
          }
        } else if (burn.source === 'manual') {
          manualBurnByDate[burn.date] = (manualBurnByDate[burn.date] || 0) + (burn.calories || 0);
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
          // MET category derivation and the MET table itself live in
          // lib/workoutCalories.ts (single source of truth).
          const dayWeight = weightByDate[date] || fallbackWeight;
          const calories = calculateWorkoutCalories(
            { day_name: workout.day_name, exercises },
            dayWeight,
            durationMinutes
          );
          burnsByDate[date] = (burnsByDate[date] || 0) + calories;
          workoutBurnByDate[date] = (workoutBurnByDate[date] || 0) + calories;
        }
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
