import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

interface HealthInsight {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface CorrelationData {
  morningEnergy: { high: number[]; low: number[] };
  sleepHours: { good: number[]; poor: number[] };
  stepsToEnergy: { date: string; steps: number; energy: number }[];
}

// Helper function to calculate average
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

export function useHealthInsights(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['healthInsights', user?.id, days],
    queryFn: async (): Promise<{ insights: HealthInsight[]; correlations: CorrelationData }> => {
      if (!user) return { 
        insights: [], 
        correlations: { 
          morningEnergy: { high: [], low: [] }, 
          sleepHours: { good: [], poor: [] }, 
          stepsToEnergy: [] 
        } 
      };

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Fetch all relevant data in parallel
      const [metricsRes, nightRes, workoutsRes] = await Promise.all([
        supabase
          .from('daily_metrics')
          .select('date, sleep_hours, energy_level, bodyweight')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .order('date', { ascending: true }),
        supabase
          .from('night_checkins')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .order('date', { ascending: true }),
        supabase
          .from('workouts')
          .select('id, date, post_satisfaction, post_difficulty, workout_duration_minutes')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .order('date', { ascending: true }),
      ]);

      const morningData = (metricsRes.data || []) as any[];
      const nightData = (nightRes.data || []) as any[];
      const workoutData = (workoutsRes.data || []) as any[];

      const insights: HealthInsight[] = [];
      const correlations: CorrelationData = {
        morningEnergy: { high: [], low: [] },
        sleepHours: { good: [], poor: [] },
        stepsToEnergy: [],
      };

      // Correlate morning energy with workout satisfaction
      for (const workout of workoutData) {
        const morning = morningData.find(m => m.date === workout.date);
        if (morning && workout.post_satisfaction) {
          if (morning.energy_level >= 7) {
            correlations.morningEnergy.high.push(workout.post_satisfaction);
          } else if (morning.energy_level <= 4) {
            correlations.morningEnergy.low.push(workout.post_satisfaction);
          }
        }
      }

      // Correlate sleep with workout performance
      for (const workout of workoutData) {
        const morning = morningData.find(m => m.date === workout.date);
        if (morning && morning.sleep_hours && workout.post_satisfaction) {
          if (morning.sleep_hours >= 7) {
            correlations.sleepHours.good.push(workout.post_satisfaction);
          } else if (morning.sleep_hours < 6) {
            correlations.sleepHours.poor.push(workout.post_satisfaction);
          }
        }
      }

      // Recent sleep trend
      const recentSleep = morningData.slice(-7).filter(m => m.sleep_hours);
      if (recentSleep.length >= 5) {
        const avgSleep = avg(recentSleep.map(m => m.sleep_hours));
        if (avgSleep < 6.5) {
          insights.push({
            id: 'sleep-warning',
            type: 'negative',
            title: 'Sleep Deficit',
            description: `Your 7-day average is only ${avgSleep.toFixed(1)} hours. Aim for 7+ for optimal recovery.`,
            metric: `${avgSleep.toFixed(1)}h avg`,
            trend: 'down',
          });
        } else if (avgSleep >= 7.5) {
          insights.push({
            id: 'sleep-good',
            type: 'positive',
            title: 'Great Sleep Streak',
            description: `Averaging ${avgSleep.toFixed(1)} hours this week. Keep it up!`,
            metric: `${avgSleep.toFixed(1)}h avg`,
            trend: 'up',
          });
        }
      }

      // Step count trends
      const recentSteps = nightData.slice(-7).filter(n => n.steps);
      if (recentSteps.length >= 5) {
        const avgSteps = avg(recentSteps.map(n => n.steps));
        if (avgSteps < 5000) {
          insights.push({
            id: 'steps-low',
            type: 'negative',
            title: 'Low Activity',
            description: `Averaging ${Math.round(avgSteps).toLocaleString()} steps/day. Try to hit 8,000+.`,
            metric: `${Math.round(avgSteps).toLocaleString()} avg`,
            trend: 'down',
          });
        } else if (avgSteps >= 10000) {
          insights.push({
            id: 'steps-great',
            type: 'positive',
            title: 'Active Lifestyle',
            description: `Averaging ${Math.round(avgSteps).toLocaleString()} steps/day. Excellent!`,
            metric: `${Math.round(avgSteps).toLocaleString()} avg`,
            trend: 'up',
          });
        }
      }

      return { insights, correlations };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });
}
