import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

export interface LastWeekSet {
  weight: number;
  reps: number;
  setNumber: number;
}

export interface LastWeekExerciseData {
  exerciseName: string;
  sets: LastWeekSet[];
  lastPerformed: string;
}

interface SmartDefault {
  weight: number;
  reps: number;
  source: 'history' | 'default';
}

// Progressive overload logic
export function calculateSmartDefault(
  lastWeekSets: LastWeekSet[],
  setNumber: number
): SmartDefault {
  const lastSet = lastWeekSets.find(s => s.setNumber === setNumber);
  
  if (!lastSet) {
    // Use previous set from last week if available
    const previousSet = lastWeekSets[setNumber - 2];
    if (previousSet) {
      return {
        weight: previousSet.weight,
        reps: previousSet.reps,
        source: 'history',
      };
    }
    // Default middle option
    return { weight: 30, reps: 9, source: 'default' };
  }

  // If hit top of range (10+ reps), increase weight
  if (lastSet.reps >= 10) {
    return {
      weight: lastSet.weight + 2.5,
      reps: 8, // Expect fewer reps at higher weight
      source: 'history',
    };
  }

  // If struggled (<8 reps), keep same
  if (lastSet.reps < 8) {
    return {
      weight: lastSet.weight,
      reps: lastSet.reps,
      source: 'history',
    };
  }

  // Otherwise, same as last week
  return {
    weight: lastSet.weight,
    reps: lastSet.reps,
    source: 'history',
  };
}

export function useLastWeekSets(exerciseName: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lastWeekSets', user?.id, exerciseName],
    queryFn: async (): Promise<LastWeekExerciseData | null> => {
      if (!user || !exerciseName) return null;

      // Look back 14 days to find last session with this exercise
      const lookbackDate = format(subDays(new Date(), 14), 'yyyy-MM-dd');

      // First try the new exercise_sets table
      const { data: exerciseSets, error: setsError } = await supabase
        .from('exercise_sets')
        .select(`
          set_number,
          actual_weight,
          actual_reps,
          created_at,
          workouts!inner (date, user_id)
        `)
        .eq('workouts.user_id', user.id)
        .eq('exercise_name', exerciseName)
        .eq('completed', true)
        .gte('workouts.date', lookbackDate)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!setsError && exerciseSets && exerciseSets.length > 0) {
        // Group by workout date, take most recent workout
        const mostRecentDate = (exerciseSets[0] as any).workouts?.date;
        const recentSets = exerciseSets
          .filter((s: any) => s.workouts?.date === mostRecentDate)
          .map((s: any) => ({
            weight: s.actual_weight || 0,
            reps: s.actual_reps || 0,
            setNumber: s.set_number,
          }))
          .sort((a, b) => a.setNumber - b.setNumber);

        if (recentSets.length > 0) {
          return {
            exerciseName,
            sets: recentSets,
            lastPerformed: mostRecentDate,
          };
        }
      }

      // Fallback to legacy exercises table
      const { data: legacySets, error: legacyError } = await supabase
        .from('exercises')
        .select(`
          name,
          actual_weight,
          actual_reps,
          sort_order,
          workouts!inner (date, user_id)
        `)
        .eq('workouts.user_id', user.id)
        .ilike('name', `${exerciseName}%`)
        .eq('completed', true)
        .gte('workouts.date', lookbackDate)
        .order('sort_order', { ascending: true })
        .limit(20);

      if (legacyError || !legacySets || legacySets.length === 0) {
        return null;
      }

      // Group by date, take most recent
      const dateGroups = new Map<string, typeof legacySets>();
      legacySets.forEach((s: any) => {
        const date = s.workouts?.date;
        if (!date) return;
        if (!dateGroups.has(date)) {
          dateGroups.set(date, []);
        }
        dateGroups.get(date)!.push(s);
      });

      const sortedDates = Array.from(dateGroups.keys()).sort().reverse();
      if (sortedDates.length === 0) return null;

      const mostRecentDate = sortedDates[0];
      const recentSets = dateGroups.get(mostRecentDate)!
        .map((s: any, idx: number) => ({
          weight: parseFloat(s.actual_weight) || 0,
          reps: parseInt(s.actual_reps) || 0,
          setNumber: idx + 1,
        }))
        .filter(s => s.weight > 0 && s.reps > 0);

      if (recentSets.length === 0) return null;

      return {
        exerciseName,
        sets: recentSets,
        lastPerformed: mostRecentDate,
      };
    },
    enabled: !!user && !!exerciseName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
