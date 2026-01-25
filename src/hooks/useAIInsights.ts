import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHabitsData } from './useHabitsData';
import { useVolumeData } from './useVolumeData';
import { useExerciseProgression } from './useExerciseProgression';

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

export function useAIInsights() {
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: habitsData } = useHabitsData(30);
  const { data: volumeData } = useVolumeData(30);
  const { data: progressions } = useExerciseProgression();

  const generateInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build summary from hooks data
      const exerciseProgress = (progressions || []).slice(0, 5).map(p => {
        const sorted = [...p.data].sort((a, b) => a.week - b.week);
        const first = sorted[0]?.weight || 0;
        const last = sorted[sorted.length - 1]?.weight || 0;
        return {
          name: p.exerciseName,
          startWeight: first,
          currentWeight: last,
          change: last - first,
        };
      }).filter(e => e.startWeight > 0);

      const summary: WorkoutSummary = {
        totalWorkouts: habitsData?.dataPoints.length || 0,
        daysActive: habitsData?.dataPoints.length || 0,
        exerciseProgress,
        avgSleep: habitsData?.totals.avgSleep || null,
        avgEnergy: habitsData?.totals.avgEnergy || null,
        supplementAdherence: habitsData?.supplementAdherence || {},
        pullupTotal: habitsData?.totals.totalPullups || 0,
        volumeBreakdown: {
          push: volumeData?.totals.pushVolume || 0,
          pull: volumeData?.totals.pullVolume || 0,
          legs: volumeData?.totals.legsVolume || 0,
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
  }, [habitsData, volumeData, progressions]);

  return {
    insights,
    isLoading,
    error,
    generateInsights,
    hasData: (habitsData?.dataPoints.length || 0) > 0 || (progressions?.length || 0) > 0,
  };
}
