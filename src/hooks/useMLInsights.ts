import { useState, useMemo, useCallback } from 'react';
import { useDailyMetrics } from './useDailyMetrics';
import { useExerciseSets } from './useExerciseSets';
import { useUserPreferences } from './useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { generateMLInsights, WorkoutSummary } from '@/lib/mlInsights';
import { localDateKey } from '@/lib/dateKey';

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

interface Insight {
  category: 'strength' | 'recovery' | 'nutrition' | 'hydration' | 'balance' | 'consistency' | 'progress';
  priority: number;
  text: string;
  icon: string;
}

export function useMLInsights(dateRange?: DateRangeFilter) {
  const { user } = useAuth();
  const { data: metricsData, isLoading: metricsLoading } = useDailyMetrics(dateRange);
  const { data: exerciseData, isLoading: exerciseLoading } = useExerciseSets(dateRange);
  const { preferences } = useUserPreferences();

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

  // Fetch additional data and generate AI insights
  const generateAIInsights = useCallback(async () => {
    if (!hasData || !user) return;

    setIsGenerating(true);
    setAiError(null);

    try {
      // Fetch meals, water, and bodyweight data in parallel
      const fromDate = localDateKey(dateRange?.from ?? new Date(Date.now() - 30 * 86400000));
      const toDate = localDateKey(dateRange?.to ?? new Date());

      const [mealsResult, waterResult, bodyweightResult] = await Promise.all([
        supabase
          .from('meals')
          .select('calories, protein, carbs, fat, date')
          .eq('user_id', user.id)
          .gte('date', fromDate)
          .lte('date', toDate),
        supabase
          .from('water_logs')
          .select('amount, timestamp')
          .eq('user_id', user.id)
          .gte('timestamp', `${fromDate}T00:00:00`)
          .lte('timestamp', `${toDate}T23:59:59`),
        supabase
          .from('daily_metrics')
          .select('bodyweight, date')
          .eq('user_id', user.id)
          .not('bodyweight', 'is', null)
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('date', { ascending: true }),
      ]);

      // Process nutrition data
      let nutrition = null;
      if (mealsResult.data && mealsResult.data.length > 0) {
        const meals = mealsResult.data;
        const dayMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
        for (const m of meals) {
          const existing = dayMap.get(m.date) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
          existing.calories += m.calories || 0;
          existing.protein += m.protein || 0;
          existing.carbs += m.carbs || 0;
          existing.fat += m.fat || 0;
          dayMap.set(m.date, existing);
        }
        const days = Array.from(dayMap.values());
        const daysTracked = days.length;
        nutrition = {
          avgCalories: days.reduce((s, d) => s + d.calories, 0) / daysTracked,
          avgProtein: days.reduce((s, d) => s + d.protein, 0) / daysTracked,
          avgCarbs: days.reduce((s, d) => s + d.carbs, 0) / daysTracked,
          avgFat: days.reduce((s, d) => s + d.fat, 0) / daysTracked,
          daysTracked,
          calorieGoal: preferences?.daily_calorie_goal || null,
        };
      }

      // Process hydration data
      let hydration = null;
      if (waterResult.data && waterResult.data.length > 0) {
        const dayMap = new Map<string, number>();
        for (const w of waterResult.data) {
          const day = w.timestamp?.split('T')[0] || '';
          dayMap.set(day, (dayMap.get(day) || 0) + (w.amount || 0));
        }
        const dailyAmounts = Array.from(dayMap.values());
        hydration = {
          avgIntake: dailyAmounts.reduce((s, a) => s + a, 0) / dailyAmounts.length,
          daysTracked: dailyAmounts.length,
          waterGoal: preferences?.daily_water_goal || null,
        };
      }

      // Process bodyweight trend
      let bodyweightTrend = null;
      if (bodyweightResult.data && bodyweightResult.data.length > 0) {
        const bwData = bodyweightResult.data.filter(d => d.bodyweight);
        if (bwData.length >= 2) {
          const start = bwData[0].bodyweight!;
          const current = bwData[bwData.length - 1].bodyweight!;
          bodyweightTrend = { start, current, change: current - start };
        } else if (bwData.length === 1) {
          bodyweightTrend = { start: bwData[0].bodyweight!, current: bwData[0].bodyweight!, change: 0 };
        }
      }

      // Build user profile context from raw DB (preferences type may not include all fields)
      let userProfile: Record<string, any> | null = null;
      if (preferences) {
        const rawPrefs = preferences as any;
        userProfile = {
          age: rawPrefs.age || null,
          gender: rawPrefs.gender || null,
          height_cm: rawPrefs.height_cm || null,
          fitness_goal: rawPrefs.fitness_goal || null,
          daily_calorie_goal: preferences.daily_calorie_goal,
          daily_water_goal: preferences.daily_water_goal,
          weekly_workout_goal: preferences.weekly_workout_goal,
        };
      }

      // Send enriched summary to edge function
      const enrichedSummary = {
        ...summary,
        userProfile,
        nutrition,
        hydration,
        bodyweightTrend,
      };

      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { summary: enrichedSummary },
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
      setAiInsights(null);
    } finally {
      setIsGenerating(false);
    }
  }, [summary, hasData, user, dateRange, preferences]);

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
