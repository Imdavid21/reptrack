import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDailyMetrics } from './useDailyMetrics';
import { useExerciseSets } from './useExerciseSets';

export interface WorkoutSummary {
  totalWorkouts: number;
  exerciseProgress: { name: string; startWeight: number; currentWeight: number; change: number }[];
  avgSleep: number | null;
  avgEnergy: number | null;
  supplementAdherence: Record<string, number>;
  pullupTotal: number;
  volumeBreakdown: { push: number; pull: number; legs: number };
  daysActive: number;
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export function useAIInsights(dateRange?: DateRangeFilter) {
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: metricsData } = useDailyMetrics(dateRange);
  const { data: exerciseData } = useExerciseSets(dateRange);

  const generateInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build exercise progress from progressions
      const exerciseProgress = (exerciseData?.progressions || []).slice(0, 5).map(p => {
        const first = p.data[0]?.weight || 0;
        const last = p.data[p.data.length - 1]?.weight || 0;
        return {
          name: p.exerciseName,
          startWeight: first,
          currentWeight: last,
          change: last - first,
        };
      }).filter(e => e.startWeight > 0);

      const summary: WorkoutSummary = {
        totalWorkouts: metricsData?.totals.daysTracked || 0,
        daysActive: metricsData?.totals.daysWithData || 0,
        exerciseProgress,
        avgSleep: metricsData?.totals.avgSleep || null,
        avgEnergy: metricsData?.totals.avgEnergy || null,
        supplementAdherence: metricsData?.supplementAdherence || {},
        pullupTotal: metricsData?.totals.totalPullups || 0,
        volumeBreakdown: {
          push: exerciseData?.volumeTotals.push || 0,
          pull: exerciseData?.volumeTotals.pull || 0,
          legs: exerciseData?.volumeTotals.legs || 0,
        },
      };

      // Check if we have enough data
      if (summary.totalWorkouts === 0 && exerciseProgress.length === 0) {
        setInsights('Log some workouts to get personalized AI coaching insights.');
        setIsLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('generate-insights', {
        body: { summary },
      });

      if (fnError) throw fnError;
      
      setInsights(data.insights);
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError('Failed to generate insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [metricsData, exerciseData]);

  return {
    insights,
    isLoading,
    error,
    generateInsights,
    hasData: (metricsData?.totals.daysTracked || 0) > 0 || (exerciseData?.progressions?.length || 0) > 0,
  };
}
