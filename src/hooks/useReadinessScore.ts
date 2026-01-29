import { useMemo } from 'react';
import { useDailyMetrics } from './useDailyMetrics';
import { useWaterLogs } from './useWaterLogs';
import { useUserPreferences } from './useUserPreferences';
import { useExerciseSets } from './useExerciseSets';
import { format, subDays } from 'date-fns';

interface ReadinessBreakdown {
  sleep: number;      // 0-100
  energy: number;     // 0-100
  soreness: number;   // 0-100 (inverted - low soreness = high score)
  hydration: number;  // 0-100
}

interface ReadinessResult {
  score: number | null;
  breakdown: ReadinessBreakdown | null;
  isLoading: boolean;
  hasData: boolean;
}

/**
 * Calculate a Readiness Score (0-100) based on:
 * - Sleep: 30% weight (optimal ~8h)
 * - Energy: 30% weight (1-10 scale)
 * - Soreness: 20% weight (inverted, from recovery_metrics or default)
 * - Hydration: 20% weight (% of daily goal)
 */
export function useReadinessScore(): ReadinessResult {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Get today's metrics and recent data for fallback
  const { data: metricsData, isLoading: metricsLoading } = useDailyMetrics({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  
  // Get today's water intake
  const { totalToday, isLoading: waterLoading } = useWaterLogs();
  
  // Get user's water goal
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  
  // Get recent exercise data to estimate muscle fatigue
  const exerciseSetsQuery = useExerciseSets({
    from: subDays(new Date(), 3),
    to: new Date(),
  });

  const isLoading = metricsLoading || waterLoading || prefsLoading || exerciseSetsQuery.isLoading;

  const result = useMemo(() => {
    if (isLoading) {
      return { score: null, breakdown: null, hasData: false };
    }

    const todayMetrics = metricsData?.dataPoints.find(d => d.date === todayStr);
    
    // Get most recent values (today or fallback to recent)
    const recentMetrics = metricsData?.dataPoints
      .filter(d => d.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const sleepHours = todayMetrics?.sleep_hours ?? recentMetrics?.sleep_hours ?? null;
    const energyLevel = todayMetrics?.energy_level ?? recentMetrics?.energy_level ?? null;
    
    // Estimate soreness based on recent training volume (more sets = more sore)
    // Count sets from last 2 days
    const exerciseSets = exerciseSetsQuery.data?.sets ?? [];
    const recentSetsCount = exerciseSets.filter(s => {
      const setDate = s.created_at?.split('T')[0] || '';
      const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
      return setDate >= twoDaysAgo && s.completed;
    }).length;
    
    // More sets = more soreness (rough estimate)
    // 0 sets = no soreness (score 100), 30+ sets = high soreness (score 30)
    const estimatedSorenessScore = Math.max(30, 100 - (recentSetsCount * 2.5));
    
    // Calculate hydration percentage
    const waterGoal = preferences?.daily_water_goal ?? 3;
    const hydrationPct = waterGoal > 0 ? Math.min((totalToday / waterGoal) * 100, 100) : null;

    // Check if we have enough data
    const hasEnoughData = sleepHours !== null || energyLevel !== null || hydrationPct !== null;
    if (!hasEnoughData) {
      return { score: null, breakdown: null, hasData: false };
    }

    // Calculate individual scores (0-100)
    // Sleep: optimal is 7-9h, scale accordingly
    let sleepScore = 50;
    if (sleepHours !== null) {
      if (sleepHours >= 7 && sleepHours <= 9) {
        sleepScore = 100;
      } else if (sleepHours < 7) {
        sleepScore = Math.max(0, (sleepHours / 7) * 100);
      } else {
        // Over 9h slightly less optimal
        sleepScore = Math.max(70, 100 - (sleepHours - 9) * 10);
      }
    }

    // Energy: 1-10 scale → 0-100
    const energyScore = energyLevel !== null ? energyLevel * 10 : 50;

    // Soreness: estimated from training volume
    const sorenessScore = estimatedSorenessScore;

    // Hydration: already 0-100%
    const hydrationScore = hydrationPct ?? 50;

    const breakdown: ReadinessBreakdown = {
      sleep: Math.round(sleepScore),
      energy: Math.round(energyScore),
      soreness: Math.round(sorenessScore),
      hydration: Math.round(hydrationScore),
    };

    // Weighted average: sleep 30%, energy 30%, soreness 20%, hydration 20%
    const score = Math.round(
      sleepScore * 0.3 +
      energyScore * 0.3 +
      sorenessScore * 0.2 +
      hydrationScore * 0.2
    );

    return { score, breakdown, hasData: true };
  }, [isLoading, metricsData, todayStr, exerciseSetsQuery.data, totalToday, preferences]);

  return {
    ...result,
    isLoading,
  };
}
