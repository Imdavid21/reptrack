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
  heartRate: { low: number[]; high: number[] };
  stepsToEnergy: { date: string; steps: number; energy: number }[];
}

export function useHealthInsights() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['healthInsights', user?.id],
    queryFn: async (): Promise<{ insights: HealthInsight[]; correlations: CorrelationData }> => {
      if (!user) return { insights: [], correlations: { morningEnergy: { high: [], low: [] }, sleepHours: { good: [], poor: [] }, heartRate: { low: [], high: [] }, stepsToEnergy: [] } };

      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      // Fetch all relevant data in parallel
      const [morningRes, nightRes, workoutsRes] = await Promise.all([
        supabase
          .from('morning_checkins')
          .select('*')
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

      const morningData = (morningRes.data || []) as any[];
      const nightData = (nightRes.data || []) as any[];
      const workoutData = (workoutsRes.data || []) as any[];

      const insights: HealthInsight[] = [];
      const correlations: CorrelationData = {
        morningEnergy: { high: [], low: [] },
        sleepHours: { good: [], poor: [] },
        heartRate: { low: [], high: [] },
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

      // Correlate resting heart rate with workout difficulty perception
      for (const workout of workoutData) {
        const morning = morningData.find(m => m.date === workout.date);
        if (morning && morning.heart_rate && workout.post_difficulty) {
          if (morning.heart_rate <= 60) {
            correlations.heartRate.low.push(workout.post_difficulty);
          } else if (morning.heart_rate >= 75) {
            correlations.heartRate.high.push(workout.post_difficulty);
          }
        }
      }

      // Steps to night energy correlation
      for (const night of nightData) {
        if (night.steps && night.energy_score) {
          correlations.stepsToEnergy.push({
            date: night.date,
            steps: night.steps,
            energy: night.energy_score,
          });
        }
      }

      // Generate insights from correlations
      const avgFunc = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      const highEnergyAvg = avgFunc(correlations.morningEnergy.high);
      const lowEnergyAvg = avgFunc(correlations.morningEnergy.low);
      if (highEnergyAvg && lowEnergyAvg && correlations.morningEnergy.high.length >= 3) {
        const diff = Math.round(((highEnergyAvg - lowEnergyAvg) / lowEnergyAvg) * 100);
        if (diff > 10) {
          insights.push({
            id: 'morning-energy-correlation',
            type: 'positive',
            title: 'Morning Energy Matters',
            description: `You rate workouts ${diff}% higher when starting with high energy (7+) vs low energy (≤4).`,
            metric: `+${diff}%`,
            trend: 'up',
          });
        }
      }

      const goodSleepAvg = avgFunc(correlations.sleepHours.good);
      const poorSleepAvg = avgFunc(correlations.sleepHours.poor);
      if (goodSleepAvg && poorSleepAvg && correlations.sleepHours.good.length >= 3) {
        const diff = Math.round(((goodSleepAvg - poorSleepAvg) / poorSleepAvg) * 100);
        if (diff > 10) {
          insights.push({
            id: 'sleep-performance',
            type: 'positive',
            title: 'Sleep = Performance',
            description: `7+ hours of sleep correlates with ${diff}% higher workout satisfaction.`,
            metric: `+${diff}%`,
            trend: 'up',
          });
        }
      }

      const lowHRAvg = avgFunc(correlations.heartRate.low);
      const highHRAvg = avgFunc(correlations.heartRate.high);
      if (lowHRAvg && highHRAvg && correlations.heartRate.low.length >= 3) {
        const diff = Math.round(highHRAvg - lowHRAvg);
        if (diff > 1) {
          insights.push({
            id: 'heart-rate-recovery',
            type: 'neutral',
            title: 'Resting HR Insight',
            description: `Workouts feel ${diff > 0 ? 'harder' : 'easier'} when your morning HR is elevated (75+ BPM).`,
            metric: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} difficulty`,
            trend: diff > 0 ? 'up' : 'down',
          });
        }
      }

      // Recent sleep trend
      const recentSleep = morningData.slice(-7).filter(m => m.sleep_hours);
      if (recentSleep.length >= 5) {
        const avgSleep = avgFunc(recentSleep.map(m => m.sleep_hours)) || 0;
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
        const avgSteps = avgFunc(recentSteps.map(n => n.steps)) || 0;
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
    staleTime: 5 * 60 * 1000,
  });
}
