import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WorkoutDay } from '@/lib/workoutPresets';

interface CustomRoutineRow {
  id: string;
  routine_name: string;
  routine_data: {
    days: Record<string, WorkoutDay>;
  };
  is_active: boolean;
}

export function useCustomRoutine() {
  const { user } = useAuth();

  const { data: customRoutine, isLoading } = useQuery({
    queryKey: ['custom-routine', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('custom_routines')
        .select('id, routine_name, routine_data, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching custom routine:', error);
        return null;
      }

      return data as unknown as CustomRoutineRow | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const customDays: Record<string, WorkoutDay> | null =
    customRoutine?.routine_data?.days ?? null;

  return {
    customRoutine,
    customDays,
    isLoading,
    hasCustomRoutine: !!customDays && Object.keys(customDays).length > 0,
  };
}
