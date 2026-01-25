import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMemo } from 'react';

export interface Correlation {
  variable1: string;
  variable2: string;
  coefficient: number; // Pearson r
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative';
  sampleSize: number;
  insight: string;
  actionable: string;
}

export interface ProgressionTrend {
  exerciseName: string;
  weeklyIncrease: number; // kg per week
  rSquared: number; // How well linear trend fits
  currentWeight: number;
  projectedWeight4Weeks: number;
  prAttemptReady: boolean;
  prSuggestion?: number;
  stalling: boolean;
}

export interface DeloadRecommendation {
  recommended: boolean;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  indicators: string[];
}

// Pearson correlation coefficient
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));

  return denominator === 0 ? 0 : numerator / denominator;
}

// Linear regression for trend analysis
function linearRegression(x: number[], y: number[]): { slope: number; rSquared: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, rSquared: 0 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + (yi - predicted) ** 2;
  }, 0);

  const rSquared = ssTotal === 0 ? 0 : 1 - ssRes / ssTotal;

  return { slope, rSquared: Math.max(0, rSquared) };
}

function interpretCorrelation(r: number): { strength: Correlation['strength']; direction: Correlation['direction'] } {
  const absR = Math.abs(r);
  let strength: Correlation['strength'];
  
  if (absR >= 0.7) strength = 'strong';
  else if (absR >= 0.5) strength = 'moderate';
  else if (absR >= 0.3) strength = 'weak';
  else strength = 'none';

  return { strength, direction: r >= 0 ? 'positive' : 'negative' };
}

export function usePerformanceCorrelations() {
  const { user } = useAuth();

  const { data: rawData } = useQuery({
    queryKey: ['performanceCorrelations', user?.id],
    queryFn: async () => {
      if (!user) return { workouts: [], checkins: [], recovery: [] };

      // Fetch workouts with performance data
      const [workoutsRes, checkinsRes, recoveryRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('date, post_satisfaction, post_difficulty, workout_duration_minutes, pre_energy, pre_motivation, pre_soreness')
          .eq('user_id', user.id)
          .not('post_satisfaction', 'is', null)
          .order('date', { ascending: true }),
        supabase
          .from('morning_checkins')
          .select('date, sleep_hours, energy_level')
          .eq('user_id', user.id)
          .order('date', { ascending: true }),
        supabase
          .from('recovery_metrics')
          .select('date, recovery_score, fatigue_level, sleep_quality')
          .eq('user_id', user.id)
          .order('date', { ascending: true }),
      ]);

      return {
        workouts: workoutsRes.data || [],
        checkins: checkinsRes.data || [],
        recovery: recoveryRes.data || [],
      };
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const correlations = useMemo((): Correlation[] => {
    if (!rawData) return [];

    const { workouts, checkins, recovery } = rawData;

    // Join data by date
    const dateMap = new Map<string, any>();
    
    for (const w of workouts) {
      dateMap.set(w.date, { ...dateMap.get(w.date), ...w });
    }
    for (const c of checkins) {
      dateMap.set(c.date, { ...dateMap.get(c.date), ...c });
    }
    for (const r of recovery) {
      dateMap.set(r.date, { ...dateMap.get(r.date), ...r });
    }

    const combined = Array.from(dateMap.values()).filter(d => d.post_satisfaction);

    if (combined.length < 5) return [];

    const results: Correlation[] = [];

    // Sleep vs Performance
    const sleepData = combined.filter(d => d.sleep_hours && d.post_satisfaction);
    if (sleepData.length >= 5) {
      const r = pearsonCorrelation(
        sleepData.map(d => d.sleep_hours),
        sleepData.map(d => d.post_satisfaction)
      );
      const { strength, direction } = interpretCorrelation(r);
      
      if (strength !== 'none') {
        const avgGoodSleep = sleepData.filter(d => d.sleep_hours >= 7.5)
          .reduce((sum, d) => sum + d.post_satisfaction, 0) / sleepData.filter(d => d.sleep_hours >= 7.5).length || 0;
        const avgBadSleep = sleepData.filter(d => d.sleep_hours < 7)
          .reduce((sum, d) => sum + d.post_satisfaction, 0) / sleepData.filter(d => d.sleep_hours < 7).length || 0;
        
        results.push({
          variable1: 'Sleep',
          variable2: 'Performance',
          coefficient: r,
          strength,
          direction,
          sampleSize: sleepData.length,
          insight: `7.5+ hrs = ${avgGoodSleep.toFixed(1)}/10 avg · <7 hrs = ${avgBadSleep.toFixed(1)}/10 avg`,
          actionable: 'Prioritize 7.5+ hours on training days',
        });
      }
    }

    // Pre-workout energy vs Performance
    const energyData = combined.filter(d => d.pre_energy && d.post_satisfaction);
    if (energyData.length >= 5) {
      const r = pearsonCorrelation(
        energyData.map(d => d.pre_energy),
        energyData.map(d => d.post_satisfaction)
      );
      const { strength, direction } = interpretCorrelation(r);
      
      if (strength !== 'none') {
        const highEnergy = energyData.filter(d => d.pre_energy >= 8);
        const lowEnergy = energyData.filter(d => d.pre_energy < 6);
        
        results.push({
          variable1: 'Pre-workout Energy',
          variable2: 'Performance',
          coefficient: r,
          strength,
          direction,
          sampleSize: energyData.length,
          insight: `High energy (8+) leads to ${((highEnergy.length / energyData.length) * 100).toFixed(0)}% of best sessions`,
          actionable: lowEnergy.length > 3 ? 'Consider lighter sessions on low-energy days' : 'Maintain energy management',
        });
      }
    }

    // Recovery score vs Performance (if available)
    const recoveryData = combined.filter(d => d.recovery_score && d.post_satisfaction);
    if (recoveryData.length >= 5) {
      const r = pearsonCorrelation(
        recoveryData.map(d => d.recovery_score),
        recoveryData.map(d => d.post_satisfaction)
      );
      const { strength, direction } = interpretCorrelation(r);
      
      if (strength !== 'none') {
        results.push({
          variable1: 'Recovery Score',
          variable2: 'Performance',
          coefficient: r,
          strength,
          direction,
          sampleSize: recoveryData.length,
          insight: `r=${r.toFixed(2)} correlation between recovery and session quality`,
          actionable: 'Track recovery to optimize training intensity',
        });
      }
    }

    return results.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  }, [rawData]);

  return { correlations, isLoading: !rawData };
}

export function useProgressionTrends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['progressionTrends', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
          exercise_name,
          actual_weight,
          actual_reps,
          workouts!inner (date, week_number, user_id)
        `)
        .eq('workouts.user_id', user.id)
        .eq('completed', true)
        .not('actual_weight', 'is', null)
        .order('workouts(date)', { ascending: true });

      if (error) return [];

      // Group by exercise and week, take max weight per week
      const exerciseMap = new Map<string, Map<number, number>>();
      
      for (const s of data || []) {
        const workout = s.workouts as any;
        const exerciseName = s.exercise_name;
        const weight = s.actual_weight || 0;
        const week = workout?.week_number || 1;

        if (!exerciseMap.has(exerciseName)) {
          exerciseMap.set(exerciseName, new Map());
        }
        
        const weekMap = exerciseMap.get(exerciseName)!;
        weekMap.set(week, Math.max(weekMap.get(week) || 0, weight));
      }

      // Calculate trends for exercises with 3+ weeks of data
      const trends: ProgressionTrend[] = [];

      for (const [exerciseName, weekMap] of exerciseMap.entries()) {
        if (weekMap.size < 3) continue;

        const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]);
        const weeks = sortedWeeks.map(([w]) => w);
        const weights = sortedWeeks.map(([_, w]) => w);

        const { slope, rSquared } = linearRegression(weeks, weights);
        const currentWeight = weights[weights.length - 1];
        const currentWeek = weeks[weeks.length - 1];
        
        // Check for stalling (last 2 weeks same weight or decline)
        const lastTwo = weights.slice(-2);
        const stalling = lastTwo.length === 2 && lastTwo[1] <= lastTwo[0];

        // PR attempt suggestion
        let prAttemptReady = false;
        let prSuggestion: number | undefined;
        
        if (rSquared > 0.7 && slope > 0 && !stalling) {
          prSuggestion = Math.round((currentWeight + 2.5) * 2) / 2;
          prAttemptReady = true;
        }

        trends.push({
          exerciseName,
          weeklyIncrease: Math.round(slope * 10) / 10,
          rSquared: Math.round(rSquared * 100) / 100,
          currentWeight,
          projectedWeight4Weeks: Math.round((currentWeight + slope * 4) * 2) / 2,
          prAttemptReady,
          prSuggestion,
          stalling,
        });
      }

      return trends
        .filter(t => t.currentWeight >= 20) // Focus on meaningful weights
        .sort((a, b) => b.currentWeight - a.currentWeight)
        .slice(0, 8); // Top 8 exercises
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDeloadRecommendation() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['deloadRecommendation', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch last 3 weeks of data
      const [workoutsRes, recoveryRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('date, week_number, post_satisfaction, post_difficulty')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(18),
        supabase
          .from('recovery_metrics')
          .select('date, recovery_score, fatigue_level')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(21),
      ]);

      const workouts = workoutsRes.data || [];
      const recovery = recoveryRes.data || [];

      const indicators: string[] = [];
      let score = 0;

      // Check workout satisfaction trend
      if (workouts.length >= 6) {
        const recentSatisfaction = workouts.slice(0, 6)
          .filter(w => w.post_satisfaction)
          .map(w => w.post_satisfaction!);
        const olderSatisfaction = workouts.slice(6, 12)
          .filter(w => w.post_satisfaction)
          .map(w => w.post_satisfaction!);

        if (recentSatisfaction.length >= 3 && olderSatisfaction.length >= 3) {
          const recentAvg = recentSatisfaction.reduce((a, b) => a + b, 0) / recentSatisfaction.length;
          const olderAvg = olderSatisfaction.reduce((a, b) => a + b, 0) / olderSatisfaction.length;
          
          if (recentAvg < olderAvg - 1) {
            indicators.push(`Performance declining (${recentAvg.toFixed(1)} vs ${olderAvg.toFixed(1)})`);
            score += 2;
          }
        }
      }

      // Check recovery scores
      if (recovery.length >= 7) {
        const recentRecovery = recovery.slice(0, 7).filter(r => r.recovery_score);
        const lowRecoveryDays = recentRecovery.filter(r => r.recovery_score! < 60).length;
        
        if (lowRecoveryDays >= 3) {
          indicators.push(`Low recovery: ${lowRecoveryDays}/7 days below 60%`);
          score += 2;
        }

        const highFatigueDays = recentRecovery.filter(r => r.fatigue_level && r.fatigue_level >= 7).length;
        if (highFatigueDays >= 2) {
          indicators.push(`High fatigue reported ${highFatigueDays} times`);
          score += 1;
        }
      }

      // Check week count
      const currentWeek = workouts[0]?.week_number || 1;
      if (currentWeek > 0 && currentWeek % 4 === 0) {
        indicators.push(`Week ${currentWeek}: Scheduled deload checkpoint`);
        score += 1;
      }

      let urgency: DeloadRecommendation['urgency'] = 'low';
      if (score >= 4) urgency = 'high';
      else if (score >= 2) urgency = 'medium';

      const recommendation: DeloadRecommendation = {
        recommended: score >= 2,
        reason: score >= 4 
          ? 'Multiple fatigue indicators suggest a deload week'
          : score >= 2 
            ? 'Some fatigue signs - consider a lighter week'
            : 'Recovery looks good - continue training',
        urgency,
        indicators,
      };

      return recommendation;
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 min cache
  });
}
