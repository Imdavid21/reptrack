import { useState, useMemo, useCallback } from 'react';
import { useDailyMetrics } from './useDailyMetrics';
import { useExerciseSets } from './useExerciseSets';
import { supabase } from '@/integrations/supabase/client';
import { generateMLInsights, WorkoutSummary } from '@/lib/mlInsights';

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

interface Insight {
  category: 'strength' | 'recovery' | 'balance' | 'consistency' | 'progress';
  priority: number;
  text: string;
  icon: string;
}

export function useMLInsights(dateRange?: DateRangeFilter) {
  const { data: metricsData, isLoading: metricsLoading } = useDailyMetrics(dateRange);
  const { data: exerciseData, isLoading: exerciseLoading } = useExerciseSets(dateRange);

  const [aiInsights, setAiInsights] = useState<Insight[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const isLoading = metricsLoading || exerciseLoading;

  // Build workout summary from data
  const { summary, hasData, fallbackInsights } = useMemo(() => {
    const exerciseProgress = (exerciseData?.progressions || []).slice(0, 8).map(p => {
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
      supplementAdherence: {},
      pullupTotal: metricsData?.totals.totalPullups || 0,
      volumeBreakdown: {
        push: exerciseData?.volumeTotals.push || 0,
        pull: exerciseData?.volumeTotals.pull || 0,
        legs: exerciseData?.volumeTotals.legs || 0,
      },
    };

    const hasData = summary.totalWorkouts > 0 || exerciseProgress.length > 0;
    const fallbackInsights = hasData ? generateMLInsights(summary) : [];

    return { summary, hasData, fallbackInsights };
  }, [metricsData, exerciseData]);

  // Generate AI insights on demand
  const generateAIInsights = useCallback(async () => {
    if (!hasData) return;

    setIsGenerating(true);
    setAiError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { summary },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.insights && Array.isArray(data.insights)) {
        setAiInsights(data.insights);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('AI Coach error:', err);
      setAiError(err instanceof Error ? err.message : 'Failed to generate insights');
      // Fall back to rule-based insights
      setAiInsights(null);
    } finally {
      setIsGenerating(false);
    }
  }, [summary, hasData]);

  // Use AI insights if available, otherwise fall back to rule-based
  const insights = aiInsights || fallbackInsights;

  return {
    insights,
    isLoading,
    isGenerating,
    hasData,
    aiError,
    generateAIInsights,
    isAIPowered: aiInsights !== null,
  };
}
