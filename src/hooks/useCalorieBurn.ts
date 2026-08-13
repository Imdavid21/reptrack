import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useDailyMetrics } from './useDailyMetrics';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { calculateWorkoutCalories as estimateWorkoutCalories } from '@/lib/workoutCalories';
import { calculateBMR as sharedCalculateBMR } from '@/lib/metabolism';
import { effectiveWeightAt } from '@/lib/energyEngineV3';

interface CalorieBurn {
  id: string;
  user_id: string;
  date: string;
  source: 'workout' | 'steps' | 'manual';
  calories: number;
  duration_minutes?: number;
  distance_km?: number | null;
  activity_type?: string;
  started_at?: string | null;
  ended_at?: string | null;
  intensity_band?: string;
  intensity_source?: string;
  met_estimate?: number;
  effective_weight_kg?: number;
  confidence?: 'low' | 'medium' | 'high';
  energy_model_version?: number;
  calculation_inputs?: Record<string, unknown>;
}

interface WorkoutWithExercises {
  id: string;
  date: string;
  day_name: string;
  started_at?: string;
  completed_at?: string;
  workout_duration_minutes?: number;
  explicit_pause_seconds?: number;
  exercises: {
    category: string;
    completed?: boolean;
  }[];
}

export function useCalorieBurn(date?: Date) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const queryClient = useQueryClient();
  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  const referenceDate = date || new Date();
  const { data: metricsData } = useDailyMetrics({ from: new Date(referenceDate.getTime() - 30 * 86400000), to: referenceDate });
  const weightKg = effectiveWeightAt((metricsData?.dataPoints || []).map(point => ({ date: point.date, kg: Number(point.bodyweight) })), dateStr, preferences?.initial_weight_kg).kg;

  // Fetch today's workouts so manual activity and exercise burn can coexist
  const { data: todayWorkouts = [] } = useQuery({
    queryKey: ['workout-with-exercises', user?.id, dateStr],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          day_name,
          started_at,
          completed_at,
          workout_duration_minutes,
          explicit_pause_seconds,
          exercises (
            category,
            completed
          )
        `)
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('workout_duration_minutes', { ascending: false });

      if (error) throw error;
      return (data || []) as WorkoutWithExercises[];
    },
    enabled: !!user,
  });

  const { data: burns = [], isLoading } = useQuery({
    queryKey: ['calorie-burns', user?.id, dateStr],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await (supabase
        .from('calorie_burns') as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CalorieBurn[];
    },
    enabled: !!user,
  });

  const addBurn = useMutation({
    // An optional `date` lets the user back-date the burn; defaults to today.
    mutationFn: async (burn: Omit<CalorieBurn, 'id' | 'user_id' | 'date'> & { date?: string }) => {
      if (!user) throw new Error('No user');

      const { date: burnDate, ...rest } = burn;
      const { data, error } = await (supabase
        .from('calorie_burns') as any)
        .upsert({
          user_id: user.id,
          date: burnDate ?? dateStr,
          ...rest,
        }, {
          onConflict: 'user_id,date,source,activity_type'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
      queryClient.invalidateQueries({ queryKey: ['manual-burns'] });
      queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
    },
  });

  // Calculate workout duration
  const calculateWorkoutDuration = (workout: WorkoutWithExercises): number => {
    if (workout.workout_duration_minutes) return workout.workout_duration_minutes;

    if (workout.started_at && workout.completed_at) {
      const durationMinutes = differenceInMinutes(
        parseISO(workout.completed_at),
        parseISO(workout.started_at)
      );
      return Math.max(durationMinutes, 0);
    }

    return 0;
  };

  // Calculate calories burned from an already-resolved category (the MET
  // table itself lives in lib/workoutCalories.ts, single source of truth).
  const calculateWorkoutCalories = (durationMinutes: number) =>
    estimateWorkoutCalories({ exercises: [] }, weightKg, durationMinutes);

  // Category derivation also lives in lib/workoutCalories.ts — see that file
  // for why day_name is checked before exercise.category.

  // Calculate calories from steps (rough estimate: 0.04 cal per step per kg)
  const calculateStepCalories = (steps: number) => {
    // Average: ~0.04-0.05 calories per step (adjusted for weight)
    const caloriesPerStep = 0.04 * (weightKg / 70);
    return Math.round(steps * caloriesPerStep);
  };

  // BMR calculation (Mifflin-St Jeor) — see src/lib/metabolism.ts, the shared
  // source of truth (also used by useAutoMaintenanceCalories and onboarding).
  const calculateBMR = (age: number, heightCm: number, gender: 'male' | 'female') =>
    sharedCalculateBMR(weightKg, heightCm, age, gender);

  // Calculate today's workout calories across all workouts on the day
  const workoutSummaries = todayWorkouts.map((workout) => {
    const calculatedDuration = calculateWorkoutDuration(workout);
    const calculatedCalories = calculatedDuration > 0
      ? estimateWorkoutCalories({ day_name: workout.day_name, exercises: workout.exercises, pausedSeconds: workout.explicit_pause_seconds }, weightKg, calculatedDuration)
      : 0;
    return { ...workout, calculatedDuration, calculatedCalories };
  });
  const workoutCaloriesFromDuration = workoutSummaries.reduce((sum, w) => sum + w.calculatedCalories, 0);
  const primaryWorkout = workoutSummaries.reduce<typeof workoutSummaries[number] | null>((longest, workout) => {
    if (!longest) return workout;
    return workout.calculatedDuration > longest.calculatedDuration ? workout : longest;
  }, null);

  const totalBurned = burns.reduce((sum, b) => sum + b.calories, 0);
  const workoutBurned = burns.filter(b => b.source === 'workout').reduce((sum, b) => sum + b.calories, 0);
  const stepBurned = burns.filter(b => b.source === 'steps').reduce((sum, b) => sum + b.calories, 0);

  // Use calculated workout calories if no persisted workout entry exists; keep manual activity too
  const effectiveWorkoutBurned = workoutBurned > 0 ? workoutBurned : workoutCaloriesFromDuration;
  const effectiveTotalBurned = totalBurned + (workoutBurned > 0 ? 0 : workoutCaloriesFromDuration);

  return {
    burns,
    isLoading,
    addBurn,
    totalBurned: effectiveTotalBurned,
    workoutBurned: effectiveWorkoutBurned,
    stepBurned,
    calculateWorkoutCalories,
    calculateStepCalories,
    calculateBMR,
    weightKg,
    // Expose workout details
    todayWorkout: primaryWorkout,
  };
}

export function useDailyBurnTotals(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dailyBurns', user?.id, days],
    queryFn: async () => {
      if (!user) return [] as { date: string; calories: number }[];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('calorie_burns')
        .select('date, calories')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'));

      if (error) throw error;

      const totals = (data as { date: string; calories: number | null }[]).reduce((acc, b) => {
        if (!acc[b.date]) acc[b.date] = 0;
        acc[b.date] += b.calories || 0;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(totals).map(([date, calories]) => ({ date, calories }));
    },
    enabled: !!user,
  });
}

export interface BurnEntry {
  id: string;
  date: string;
  source: string;
  activity_type: string | null;
  calories: number;
  duration_minutes: number | null;
  distance_km: number | null;
}

export function useManualBurns(days: number = 30) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['manual-burns', user?.id, days],
    queryFn: async () => {
      if (!user) return [] as BurnEntry[];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('calorie_burns')
        .select('id, date, source, activity_type, calories, duration_minutes, distance_km')
        .eq('user_id', user.id)
        .eq('source', 'manual')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as BurnEntry[];
    },
    enabled: !!user,
  });

  const deleteBurn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calorie_burns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-burns'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
      queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
    },
  });

  // Updates a specific row by id rather than upserting on (user_id, date,
  // source, activity_type) — the edit dialog lets the activity_type itself
  // change, and re-targeting the natural key mid-edit would leave the old
  // row behind instead of replacing it.
  const updateBurn = useMutation({
    mutationFn: async (input: {
      id: string;
      activity_type: string;
      duration_minutes: number;
      distance_km: number | null;
      calories: number;
      met_estimate?: number;
      effective_weight_kg?: number;
      confidence?: 'low' | 'medium' | 'high';
      energy_model_version?: number;
      calculation_inputs?: Record<string, unknown>;
    }) => {
      const { id, ...fields } = input;
      const { error } = await supabase.from('calorie_burns').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-burns'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
      queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
    },
  });

  return { ...query, deleteBurn, updateBurn };
}

export interface ManualActivityEntry {
  date: string;
  activity_type: string;
  duration_minutes: number;
}

/**
 * Manual activities within an explicit [from, to] range. Unlike useManualBurns
 * (always "last N days through today"), this respects an arbitrary selected
 * range — needed so muscle-balance analysis matches whatever range the user
 * has picked on Insights, not just the last N days from right now.
 */
export function useManualActivitiesInRange(from: Date, to: Date) {
  const { user } = useAuth();
  const fromStr = format(from, 'yyyy-MM-dd');
  const toStr = format(to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['manual-activities-range', user?.id, fromStr, toStr],
    queryFn: async (): Promise<ManualActivityEntry[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('calorie_burns')
        .select('date, activity_type, duration_minutes')
        .eq('user_id', user.id)
        .eq('source', 'manual')
        .gte('date', fromStr)
        .lte('date', toStr);

      if (error) throw error;
      const rows = data as { date: string; activity_type: string | null; duration_minutes: number | null }[];
      return rows
        .filter((d): d is { date: string; activity_type: string; duration_minutes: number } =>
          !!d.activity_type && !!d.duration_minutes)
        .map((d) => ({
          date: d.date,
          activity_type: d.activity_type,
          duration_minutes: d.duration_minutes,
        }));
    },
    enabled: !!user,
  });
}


