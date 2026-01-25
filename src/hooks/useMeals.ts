import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export interface Meal {
  id: string;
  user_id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string | null;
  calories: number | null;
  photo_url: string | null;
  ai_detected_food: string | null;
  ai_confidence: number | null;
  is_confirmed: boolean;
  notes: string | null;
  created_at: string;
}

export function useMeals(date?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetDate = date || new Date();
  const dateStr = format(targetDate, 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['meals', user?.id, dateStr],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Meal[];
    },
    enabled: !!user,
  });

  const addMeal = useMutation({
    mutationFn: async (meal: {
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      food_name?: string;
      calories?: number;
      photo_url?: string;
      ai_detected_food?: string;
      ai_confidence?: number;
      is_confirmed?: boolean;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          date: dateStr,
          ...meal,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['dailyCalories'] });
    },
  });

  const updateMeal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Meal> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['dailyCalories'] });
    },
  });

  const deleteMeal = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['dailyCalories'] });
    },
  });

  const totalCalories = query.data?.reduce((sum, meal) => sum + (meal.calories || 0), 0) ?? 0;
  const mealsByType = {
    breakfast: query.data?.filter(m => m.meal_type === 'breakfast') ?? [],
    lunch: query.data?.filter(m => m.meal_type === 'lunch') ?? [],
    dinner: query.data?.filter(m => m.meal_type === 'dinner') ?? [],
    snack: query.data?.filter(m => m.meal_type === 'snack') ?? [],
  };

  return {
    meals: query.data ?? [],
    mealsByType,
    totalCalories,
    isLoading: query.isLoading,
    addMeal: addMeal.mutateAsync,
    updateMeal: updateMeal.mutateAsync,
    deleteMeal: deleteMeal.mutateAsync,
    isAdding: addMeal.isPending,
    isUpdating: updateMeal.isPending,
  };
}

export function useCalorieHistory(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dailyCalories', user?.id, days],
    queryFn: async () => {
      if (!user) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('meals')
        .select('date, calories')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      // Group by date and sum calories
      const dailyTotals = (data as { date: string; calories: number | null }[]).reduce((acc, meal) => {
        if (!acc[meal.date]) acc[meal.date] = 0;
        acc[meal.date] += meal.calories || 0;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(dailyTotals).map(([date, calories]) => ({ date, calories }));
    },
    enabled: !!user,
  });
}
