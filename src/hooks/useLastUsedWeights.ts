import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LastUsedData {
  weight: number;
  reps: number;
  sets: number;
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
          set_number,
          workout_id,
          created_at,
          workouts!inner (user_id, date)
        `)
        .eq('workouts.user_id', user.id)
        .eq('completed', true)
        .not('actual_weight', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Build map of exercise -> most recent weight/reps/sets
      // Group by exercise + workout_id to get full set count from the last session
      const lastUsedMap: Record<string, LastUsedData> = {};
      const exerciseWorkoutSets: Record<string, { workoutId: string; count: number }> = {};

      for (const set of data || []) {
        const name = set.exercise_name;
        
        // Track set count per exercise per workout (most recent workout only)
        if (!exerciseWorkoutSets[name]) {
          exerciseWorkoutSets[name] = { workoutId: set.workout_id, count: 0 };
        }
        if (exerciseWorkoutSets[name].workoutId === set.workout_id) {
          exerciseWorkoutSets[name].count++;
        }

        if (!lastUsedMap[name] && set.actual_weight && set.actual_reps) {
          lastUsedMap[name] = {
            weight: set.actual_weight,
            reps: set.actual_reps,
            sets: 1, // will be updated below
            date: (set.workouts as any).date,
          };
        }
      }

      // Update sets count from the tracked data
      for (const [name, data] of Object.entries(exerciseWorkoutSets)) {
        if (lastUsedMap[name]) {
          lastUsedMap[name].sets = data.count;
        }
      }

      return lastUsedMap;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getLastUsed = (exerciseName: string): LastUsedData | undefined => {
    const map = query.data;
    if (!map) return undefined;

    // Exact match first
    if (map[exerciseName]) return map[exerciseName];

    // Fuzzy match: normalize and compare
    const normalize = (name: string) =>
      name
        .toLowerCase()
        .replace(/\bdumbbell\b/g, 'db')
        .replace(/\bbarbell\b/g, 'bb')
        .replace(/\boverhead press\b/g, 'ohp')
        .replace(/\bpush-?ups?\b/g, 'pushup')
        .replace(/\bpull-?ups?\b/g, 'pullup')
        .replace(/\bcable rope\b/g, 'cable')
        .replace(/\bseated\b/g, '')
        .replace(/\bstanding\b/g, '')
        .replace(/\bpress\b/g, '')
        .replace(/\bflyes?\b/g, 'fly')
        .replace(/s\b/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const target = normalize(exerciseName);
    for (const [dbName, data] of Object.entries(map)) {
      const dbNorm = normalize(dbName);
      if (dbNorm === target) return data;
      if (target.length > 6 && dbNorm.length > 6) {
        if (target.includes(dbNorm) || dbNorm.includes(target)) return data;
      }
    }

    return undefined;
  };

  return {
    lastUsedMap: query.data || {},
    getLastUsed,
    isLoading: query.isLoading,
  };
}
