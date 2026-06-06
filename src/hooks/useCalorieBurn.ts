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

  // Fetch today's workouts (may have multiple) and pick the longest
  const { data: todayWorkout } = useQuery({
    queryKey: ['workout-with-exercises', user?.id, dateStr],
    queryFn: async () => {
      if (!user) return null;

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
      if (!data || data.length === 0) return null;

      // Pick the workout with the longest duration
      const best = data.reduce((longest, w) => {
        const dur = w.workout_duration_minutes || 0;
        const longestDur = longest.workout_duration_minutes || 0;
        return dur > longestDur ? w : longest;
      }, data[0]);

      return best as WorkoutWithExercises;
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
    mutationFn: async (burn: Omit<CalorieBurn, 'id' | 'user_id' | 'date'>) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('calorie_burns')
        .upsert({
          user_id: user.id,
          date: dateStr,
          ...burn,
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
    },
  });

  // Calculate workout duration
  const calculateWorkoutDuration = (): number => {
    if (!todayWorkout) return 0;

    // Use explicit duration if stored
    if (todayWorkout.workout_duration_minutes) {
      return todayWorkout.workout_duration_minutes;
    }

    // Fallback: calculate from started_at to completed_at
    if (todayWorkout.started_at && todayWorkout.completed_at) {
      const durationMinutes = differenceInMinutes(
        parseISO(todayWorkout.completed_at),
        parseISO(todayWorkout.started_at)
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
  const getPrimaryCategory = (): string => {
    if (!todayWorkout) return 'strength';

    // Try from exercises table
    const exercises = todayWorkout.exercises || [];
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
    const dayNameLower = todayWorkout.day_name.toLowerCase();
    if (dayNameLower.includes('push')) return 'push';
    if (dayNameLower.includes('pull')) return 'pull';
    if (dayNameLower.includes('leg')) return 'legs';
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

  // Calculate today's workout calories
  const workoutDuration = calculateWorkoutDuration();
  const primaryCategory = getPrimaryCategory();
  const workoutCaloriesFromDuration = workoutDuration > 0 
    ? calculateWorkoutCalories(workoutDuration, primaryCategory)
    : 0;

  const totalBurned = burns.reduce((sum, b) => sum + b.calories, 0);
  const workoutBurned = burns.filter(b => b.source === 'workout').reduce((sum, b) => sum + b.calories, 0);
  const stepBurned = burns.filter(b => b.source === 'steps').reduce((sum, b) => sum + b.calories, 0);

  // Use calculated workout calories if no manual entry exists
  const effectiveWorkoutBurned = workoutBurned > 0 ? workoutBurned : workoutCaloriesFromDuration;
  const effectiveTotalBurned = totalBurned > 0 ? totalBurned : workoutCaloriesFromDuration;

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
    todayWorkout: todayWorkout ? {
      ...todayWorkout,
      calculatedDuration: workoutDuration,
      calculatedCalories: workoutCaloriesFromDuration,
      primaryCategory,
  } : null,
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

