import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useDailyMetrics } from './useDailyMetrics';
import { format, differenceInMinutes, parseISO } from 'date-fns';

interface CalorieBurn {
  id: string;
  user_id: string;
  date: string;
  source: 'workout' | 'steps' | 'manual';
  calories: number;
  duration_minutes?: number;
  activity_type?: string;
}

interface WorkoutWithExercises {
  id: string;
  date: string;
  day_name: string;
  started_at?: string;
  completed_at?: string;
  workout_duration_minutes?: number;
  exercises: {
    category: string;
  }[];
}

// MET values for different activities
const MET_VALUES: Record<string, number> = {
  // Strength training
  'Push': 5.0,
  'push': 5.0,
  'Pull': 5.0,
  'pull': 5.0,
  'Legs': 6.0,
  'legs': 6.0,
  'Accessory': 4.0,
  'accessory': 4.0,
  // General
  'strength': 5.0,
  'cardio': 7.0,
  'hiit': 8.0,
};

export function useCalorieBurn(date?: Date) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const queryClient = useQueryClient();
  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  // Get actual bodyweight from daily metrics, fall back to weight_goal, then 70kg
  const { data: metricsData } = useDailyMetrics({ from: new Date(Date.now() - 30 * 86400000), to: new Date() });
  const latestBodyweight = metricsData?.totals?.avgBodyweight;
  const weightKg = latestBodyweight || preferences?.weight_goal || 70;

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
          exercises (
            category
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
      
      const { data, error } = await supabase
        .from('calorie_burns')
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
      const { data, error } = await supabase
        .from('calorie_burns')
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

  // Calculate calories burned from workout duration and type
  const calculateWorkoutCalories = (durationMinutes: number, category: string = 'strength') => {
    const met = MET_VALUES[category] || 5.0;
    // Calories = MET × weight(kg) × duration(hours)
    return Math.round(met * weightKg * (durationMinutes / 60));
  };

  // Get primary workout category from exercises or day_name
  const getPrimaryCategory = (workout: WorkoutWithExercises): string => {
    const exercises = workout.exercises || [];
    if (exercises.length > 0) {
      const categoryCounts: Record<string, number> = {};
      exercises.forEach(ex => {
        const cat = ex.category.toLowerCase();
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      const top = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (top) return top;
    }

    // Fallback: infer from day_name
    const dayNameLower = workout.day_name.toLowerCase();
    if (dayNameLower.includes('push')) return 'push';
    if (dayNameLower.includes('pull')) return 'pull';
    if (dayNameLower.includes('leg')) return 'legs';
    if (dayNameLower.includes('arm') || dayNameLower.includes('accessory')) return 'accessory';
    return 'strength';
  };

  // Calculate calories from steps (rough estimate: 0.04 cal per step per kg)
  const calculateStepCalories = (steps: number) => {
    // Average: ~0.04-0.05 calories per step (adjusted for weight)
    const caloriesPerStep = 0.04 * (weightKg / 70);
    return Math.round(steps * caloriesPerStep);
  };

  // BMR calculation (Mifflin-St Jeor)
  const calculateBMR = (age: number, heightCm: number, gender: 'male' | 'female') => {
    if (gender === 'male') {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    } else {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }
  };

  // Calculate today's workout calories across all workouts on the day
  const workoutSummaries = todayWorkouts.map((workout) => {
    const calculatedDuration = calculateWorkoutDuration(workout);
    const primaryCategory = getPrimaryCategory(workout);
    const calculatedCalories = calculatedDuration > 0
      ? calculateWorkoutCalories(calculatedDuration, primaryCategory)
      : 0;
    return { ...workout, calculatedDuration, calculatedCalories, primaryCategory };
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
        .select('id, date, source, activity_type, calories, duration_minutes')
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
    },
  });

  return { ...query, deleteBurn };
}


