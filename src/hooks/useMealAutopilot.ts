import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { localDateKey } from '@/lib/dateKey';
import { mealSuggestions, type MealHistoryRow } from '@/lib/advanced/engine';

export function useMealAutopilot(mealType?: string) {
  const { user } = useAuth();
  const start = localDateKey(subDays(new Date(), 120));
  const end = localDateKey();
  return useQuery({
    queryKey: ['meal-autopilot', user?.id, mealType],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('meals')
        .select('food_name,meal_type,calories,protein,carbs,fat,date')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        .limit(500);
      if (mealType) query = query.eq('meal_type', mealType);
      const { data, error } = await query;
      if (error) throw error;
      return mealSuggestions((data || []) as MealHistoryRow[], mealType, 8);
    },
  });
}
