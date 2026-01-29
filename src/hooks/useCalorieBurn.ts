import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
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

interface WorkoutWithSets {
  id: string;
  date: string;
  day_name: string;
  started_at?: string;
  completed_at?: string;
  workout_duration_minutes?: number;
  exercise_sets: {
    created_at: string;
    exercise_category: string;
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

  // Get user's weight for calculations (default 70kg if not set)
  const weightKg = preferences?.weight_goal || 70;

  // Fetch today's workout with exercise sets for accurate duration calculation
  const { data: todayWorkout } = useQuery({
    queryKey: ['workout-with-sets', user?.id, dateStr],
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
          exercise_sets (
            created_at,
            exercise_category
          )
        `)
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (error) throw error;
      return data as WorkoutWithSets | null;
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

  // Calculate workout duration from first set to completion
  const calculateWorkoutDuration = (): number => {
    if (!todayWorkout) return 0;

    // If we have explicit duration stored, use it
    if (todayWorkout.workout_duration_minutes) {
      return todayWorkout.workout_duration_minutes;
    }

    // Calculate from first set to completed_at
    const sets = todayWorkout.exercise_sets || [];
    if (sets.length === 0) return 0;

    // Find earliest set timestamp
    const sortedSets = [...sets].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const firstSetTime = parseISO(sortedSets[0].created_at);
    
    // Use completed_at if available, otherwise use last set time + buffer
    let endTime: Date;
    if (todayWorkout.completed_at) {
      endTime = parseISO(todayWorkout.completed_at);
    } else {
      // Use last set time + 2 min buffer for ongoing workouts
      const lastSetTime = parseISO(sortedSets[sortedSets.length - 1].created_at);
      endTime = lastSetTime;
    }

    const durationMinutes = differenceInMinutes(endTime, firstSetTime);
    return Math.max(durationMinutes, 0);
  };

  // Calculate calories burned from workout duration and type
  const calculateWorkoutCalories = (durationMinutes: number, category: string = 'strength') => {
    const met = MET_VALUES[category] || 5.0;
    // Calories = MET × weight(kg) × duration(hours)
    return Math.round(met * weightKg * (durationMinutes / 60));
  };

  // Get primary workout category from sets
  const getPrimaryCategory = (): string => {
    if (!todayWorkout?.exercise_sets?.length) return 'strength';
    
    const categoryCounts: Record<string, number> = {};
    todayWorkout.exercise_sets.forEach(set => {
      const cat = set.exercise_category.toLowerCase();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    // Return most common category
    return Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'strength';
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
