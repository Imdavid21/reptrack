import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LastUsedData {
  weight: number;
  reps: number;
  date: string;
}

/**
 * Hook to get last used weight/reps for each exercise.
 * This helps pre-fill values when logging sets.
 */
export function useLastUsedWeights() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['lastUsedWeights', user?.id],
    queryFn: async () => {
      if (!user) return {};

      // Get most recent completed sets per exercise
      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
          exercise_name,
          actual_weight,
          actual_reps,
          created_at,
          workouts!inner (user_id, date)
        `)
        .eq('workouts.user_id', user.id)
        .eq('completed', true)
        .not('actual_weight', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Build map of exercise -> most recent weight/reps
      const lastUsedMap: Record<string, LastUsedData> = {};

      for (const set of data || []) {
        const name = set.exercise_name;
        if (!lastUsedMap[name] && set.actual_weight && set.actual_reps) {
          lastUsedMap[name] = {
            weight: set.actual_weight,
            reps: set.actual_reps,
            date: (set.workouts as any).date,
          };
        }
      }

      return lastUsedMap;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getLastUsed = (exerciseName: string): LastUsedData | undefined => {
    return query.data?.[exerciseName];
  };

  return {
    lastUsedMap: query.data || {},
    getLastUsed,
    isLoading: query.isLoading,
  };
}
