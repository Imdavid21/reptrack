import { useMemo } from 'react';
import { useDailyMetrics } from './useDailyMetrics';
import { useExerciseSets } from './useExerciseSets';
import { generateMLInsights, formatInsightsAsBullets, WorkoutSummary } from '@/lib/mlInsights';

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export function useMLInsights(dateRange?: DateRangeFilter) {
  const { data: metricsData, isLoading: metricsLoading } = useDailyMetrics(dateRange);
  const { data: exerciseData, isLoading: exerciseLoading } = useExerciseSets(dateRange);

  const isLoading = metricsLoading || exerciseLoading;

  const { insights, formattedInsights, hasData } = useMemo(() => {
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

    const hasData = summary.totalWorkouts > 0 || exerciseProgress.length > 0;
    
    if (!hasData) {
      return { insights: [], formattedInsights: '', hasData: false };
    }

    const generatedInsights = generateMLInsights(summary);
    const formatted = formatInsightsAsBullets(generatedInsights);

    return { insights: generatedInsights, formattedInsights: formatted, hasData };
  }, [metricsData, exerciseData]);

  return {
    insights,
    formattedInsights,
    isLoading,
    hasData,
  };
}
