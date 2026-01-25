import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SetPrediction {
  weight: number;
  reps: number;
  confidence: number; // 0-1
  reason: 'progressive_overload' | 'maintain' | 'deload' | 'first_time';
  weightOptions: number[];
  repOptions: number[];
}

interface HistoricalSet {
  weight: number;
  reps: number;
  week: number;
  setNumber: number;
}

// Generate weight options around a base weight
function generateWeightOptions(baseWeight: number, isDumbbell: boolean): number[] {
  const increment = isDumbbell ? 2.5 : 5;
  const options: number[] = [];
  
  // Generate 6 options centered around the base weight
  for (let i = -2; i <= 3; i++) {
    const weight = baseWeight + (i * increment);
    if (weight > 0) options.push(weight);
  }
  
  return options.slice(0, 6);
}

// Generate rep options around a base rep count
function generateRepOptions(baseReps: number): number[] {
  const options: number[] = [];
  for (let i = Math.max(1, baseReps - 3); i <= baseReps + 5; i++) {
    options.push(i);
  }
  return options.slice(0, 9);
}

export function useSetPrediction(exerciseName: string, setNumber: number) {
  const { user } = useAuth();

  const { data: history } = useQuery({
    queryKey: ['exerciseHistory', user?.id, exerciseName],
    queryFn: async () => {
      if (!user) return [];

      // Get last 8 weeks of this exercise
      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
          actual_weight,
          actual_reps,
          set_number,
          workouts!inner (
            date,
            week_number,
            user_id
          )
        `)
        .eq('workouts.user_id', user.id)
        .eq('exercise_name', exerciseName)
        .eq('completed', true)
        .not('actual_weight', 'is', null)
        .order('workouts(date)', { ascending: false })
        .limit(32);

      if (error) return [];

      return (data || []).map((s: any) => ({
        weight: s.actual_weight || 0,
        reps: s.actual_reps || 0,
        week: s.workouts?.week_number || 1,
        setNumber: s.set_number,
      })) as HistoricalSet[];
    },
    enabled: !!user && !!exerciseName,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const prediction = useMemo((): SetPrediction => {
    const isDumbbell = exerciseName.toLowerCase().includes('db') || 
                       exerciseName.toLowerCase().includes('dumbbell');

    // No history - return defaults
    if (!history || history.length === 0) {
      const defaultWeight = isDumbbell ? 15 : 40;
      const defaultReps = 10;
      return {
        weight: defaultWeight,
        reps: defaultReps,
        confidence: 0.3,
        reason: 'first_time',
        weightOptions: generateWeightOptions(defaultWeight, isDumbbell),
        repOptions: generateRepOptions(defaultReps),
      };
    }

    // Get sets matching this set number from recent weeks
    const matchingSets = history.filter(s => s.setNumber === setNumber);
    const lastMatchingSet = matchingSets[0];

    // Calculate averages from last 4 matching sets
    const recentSets = matchingSets.slice(0, 4);
    const avgWeight = recentSets.reduce((sum, s) => sum + s.weight, 0) / recentSets.length;
    const avgReps = recentSets.reduce((sum, s) => sum + s.reps, 0) / recentSets.length;

    // Check progression trend
    const firstWeek = recentSets[recentSets.length - 1];
    const lastWeek = recentSets[0];
    const weightTrend = lastWeek && firstWeek ? lastWeek.weight - firstWeek.weight : 0;

    let predictedWeight = lastMatchingSet?.weight || avgWeight;
    let predictedReps = Math.round(lastMatchingSet?.reps || avgReps);
    let reason: SetPrediction['reason'] = 'maintain';
    let confidence = 0.7;

    // Progressive overload logic
    if (lastMatchingSet) {
      // If hit top of rep range (10+ reps), suggest weight increase
      if (lastMatchingSet.reps >= 10 && weightTrend >= 0) {
        const increment = isDumbbell ? 2.5 : 5;
        predictedWeight = lastMatchingSet.weight + increment;
        predictedReps = Math.max(8, lastMatchingSet.reps - 2); // Reduce reps expectation
        reason = 'progressive_overload';
        confidence = 0.8;
      }
      // If struggling (< 8 reps), suggest staying or slight decrease
      else if (lastMatchingSet.reps < 8 && setNumber > 1) {
        reason = 'maintain';
        confidence = 0.6;
      }
    }

    // Account for set fatigue (later sets = fewer reps expected)
    const fatigueMultiplier = 1 - (setNumber - 1) * 0.05;
    predictedReps = Math.round(predictedReps * fatigueMultiplier);
    predictedReps = Math.max(6, Math.min(15, predictedReps));

    return {
      weight: Math.round(predictedWeight * 2) / 2, // Round to 0.5
      reps: predictedReps,
      confidence,
      reason,
      weightOptions: generateWeightOptions(predictedWeight, isDumbbell),
      repOptions: generateRepOptions(predictedReps),
    };
  }, [history, exerciseName, setNumber]);

  return prediction;
}

// Hook to get last week's performance for an exercise
export function useLastWeekPerformance(exerciseName: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lastWeekPerformance', user?.id, exerciseName],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
          set_number,
          actual_weight,
          actual_reps,
          workouts!inner (date, user_id)
        `)
        .eq('workouts.user_id', user.id)
        .eq('exercise_name', exerciseName)
        .eq('completed', true)
        .order('workouts(date)', { ascending: false })
        .limit(8);

      if (error || !data || data.length === 0) return null;

      // Group by set number, take most recent
      const setMap = new Map<number, { weight: number; reps: number }>();
      for (const s of data as any[]) {
        if (!setMap.has(s.set_number)) {
          setMap.set(s.set_number, {
            weight: s.actual_weight || 0,
            reps: s.actual_reps || 0,
          });
        }
      }

      return Array.from(setMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([_, performance]) => performance);
    },
    enabled: !!user && !!exerciseName,
    staleTime: 5 * 60 * 1000,
  });
}
