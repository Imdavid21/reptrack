import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { format } from 'date-fns';

interface CalorieBurn {
  id: string;
  user_id: string;
  date: string;
  source: 'workout' | 'steps' | 'manual';
  calories: number;
  duration_minutes?: number;
  activity_type?: string;
}

// MET values for different activities
const MET_VALUES: Record<string, number> = {
  // Strength training
  'Push': 5.0,
  'Pull': 5.0,
  'Legs': 6.0,
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

  // Calculate calories burned from workout duration and type
  const calculateWorkoutCalories = (durationMinutes: number, category: string = 'strength') => {
    const met = MET_VALUES[category] || 5.0;
    // Calories = MET × weight(kg) × duration(hours)
    return Math.round(met * weightKg * (durationMinutes / 60));
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

  const totalBurned = burns.reduce((sum, b) => sum + b.calories, 0);
  const workoutBurned = burns.filter(b => b.source === 'workout').reduce((sum, b) => sum + b.calories, 0);
  const stepBurned = burns.filter(b => b.source === 'steps').reduce((sum, b) => sum + b.calories, 0);

  return {
    burns,
    isLoading,
    addBurn,
    totalBurned,
    workoutBurned,
    stepBurned,
    calculateWorkoutCalories,
    calculateStepCalories,
    calculateBMR,
    weightKg,
  };
}
