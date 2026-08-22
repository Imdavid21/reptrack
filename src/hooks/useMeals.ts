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
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  potassium: number | null;
  caffeine_mg: number | null;
  consumed_at: string | null;
  photo_url: string | null;
  ai_detected_food: string | null;
  ai_confidence: number | null;
  is_confirmed: boolean;
  notes: string | null;
  created_at: string;
  nutrition_source?: 'manual' | 'ai_photo' | 'ai_text' | 'saved_meal' | 'import' | 'legacy';
  source_metadata?: Record<string, unknown>;
}

function defaultConsumedAt(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const now = new Date();
  return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).toISOString();
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

      const { data, error } = await (supabase
        .from('meals') as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('consumed_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Meal[];
    },
    enabled: !!user,
  });

  const invalidateNutrition = () => {
    queryClient.invalidateQueries({ queryKey: ['meals'] });
    queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
    queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
    queryClient.invalidateQueries({ queryKey: ['caffeineData'] });
    queryClient.invalidateQueries({ queryKey: ['dataroom-caffeine'] });
  };

  const addMeal = useMutation({
    mutationFn: async (meal: {
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      food_name?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      potassium?: number;
      caffeine_mg?: number;
      consumed_at?: string;
      photo_url?: string;
      ai_detected_food?: string;
      ai_confidence?: number;
      is_confirmed?: boolean;
      food_quality?: string;
      notes?: string;
      nutrition_source?: 'manual' | 'ai_photo' | 'ai_text' | 'saved_meal' | 'import';
      source_metadata?: Record<string, unknown>;
      /** Optional back-date (yyyy-MM-dd); defaults to the hook's date. */
      date?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const resolvedDate = meal.date || dateStr;

      const { data, error } = await (supabase
        .from('meals') as any)
        .insert({
          user_id: user.id,
          date: resolvedDate,
          ...meal,
          consumed_at: meal.consumed_at || defaultConsumedAt(resolvedDate),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: invalidateNutrition,
  });

  const updateMeal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Meal> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('meals') as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: invalidateNutrition,
  });

  const deleteMeal = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: invalidateNutrition,
  });

  const totalCalories = query.data?.reduce((sum, meal) => sum + (meal.calories || 0), 0) ?? 0;
  const totalCaffeine = query.data?.reduce((sum, meal) => sum + Number(meal.caffeine_mg || 0), 0) ?? 0;
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
    totalCaffeine,
    isLoading: query.isLoading,
    addMeal: addMeal.mutateAsync,
    updateMeal: updateMeal.mutateAsync,
    deleteMeal: deleteMeal.mutateAsync,
    isAdding: addMeal.isPending,
    isUpdating: updateMeal.isPending,
  };
}
