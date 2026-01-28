import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, differenceInMinutes, startOfDay, endOfDay, subDays } from 'date-fns';

export interface AutoMetrics {
  performanceScore: number; // 1-10 based on weights lifted
  energyScore: number; // 1-10 based on workout completion speed
  efficiency: number; // kg lifted per minute
  totalVolume: number;
  avgDuration: number;
}

export interface DailyAutoMetrics {
  date: string;
  performanceScore: number;
  energyScore: number;
  efficiency: number;
  volume: number;
  duration: number;
}

export function useAutoMetrics(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['autoMetrics', user?.id, days],
    queryFn: async (): Promise<{ today: AutoMetrics; history: DailyAutoMetrics[] }> => {
      if (!user) {
        return {
          today: { performanceScore: 0, energyScore: 0, efficiency: 0, totalVolume: 0, avgDuration: 0 },
          history: [],
        };
      }

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch workouts with duration
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, date, workout_duration_minutes, started_at, completed_at')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      // Fetch all exercise sets
      const workoutIds = workouts?.map(w => w.id) || [];
      
      const { data: sets } = await supabase
        .from('exercise_sets')
        .select('workout_id, actual_weight, actual_reps, completed')
        .in('workout_id', workoutIds)
        .eq('completed', true);

      // Calculate metrics per workout
      const workoutMetrics = new Map<string, { volume: number; duration: number }>();
      
      sets?.forEach(set => {
        const volume = (set.actual_weight || 0) * (set.actual_reps || 0);
        const existing = workoutMetrics.get(set.workout_id) || { volume: 0, duration: 0 };
        existing.volume += volume;
        workoutMetrics.set(set.workout_id, existing);
      });

      // Add duration data
      workouts?.forEach(w => {
        let duration = w.workout_duration_minutes || 0;
        if (!duration && w.started_at && w.completed_at) {
          duration = differenceInMinutes(new Date(w.completed_at), new Date(w.started_at));
        }
        const existing = workoutMetrics.get(w.id) || { volume: 0, duration: 0 };
        existing.duration = duration > 0 ? duration : 45; // Default 45 min
        workoutMetrics.set(w.id, existing);
      });

      // Calculate max volume for normalization (personal baseline)
      let maxVolume = 0;
      let minDuration = Infinity;
      workoutMetrics.forEach((m) => {
        if (m.volume > maxVolume) maxVolume = m.volume;
        if (m.duration > 0 && m.duration < minDuration) minDuration = m.duration;
      });

      if (minDuration === Infinity) minDuration = 30;

      // Build daily metrics
      const history: DailyAutoMetrics[] = [];
      let todayMetrics: AutoMetrics = { performanceScore: 0, energyScore: 0, efficiency: 0, totalVolume: 0, avgDuration: 0 };

      workouts?.forEach(w => {
        const metrics = workoutMetrics.get(w.id);
        if (!metrics) return;

        // Performance score: normalized by personal max volume (1-10)
        const performanceScore = maxVolume > 0 
          ? Math.min(10, Math.max(1, Math.round((metrics.volume / maxVolume) * 10)))
          : 5;

        // Energy score: how fast workout completed (faster = higher energy)
        // Normalize against personal best time
        const speedRatio = minDuration > 0 ? minDuration / metrics.duration : 1;
        const energyScore = Math.min(10, Math.max(1, Math.round(speedRatio * 7 + 3))); // Scale 3-10

        // Efficiency: kg per minute
        const efficiency = metrics.duration > 0 ? metrics.volume / metrics.duration : 0;

        const dailyMetric: DailyAutoMetrics = {
          date: w.date,
          performanceScore,
          energyScore,
          efficiency: Math.round(efficiency),
          volume: metrics.volume,
          duration: metrics.duration,
        };

        history.push(dailyMetric);

        if (w.date === today) {
          todayMetrics = {
            performanceScore,
            energyScore,
            efficiency: Math.round(efficiency),
            totalVolume: metrics.volume,
            avgDuration: metrics.duration,
          };
        }
      });

      // If no workout today, calculate averages
      if (todayMetrics.performanceScore === 0 && history.length > 0) {
        const recentMetrics = history.slice(-7); // Last 7 workouts
        const avgPerf = recentMetrics.reduce((s, m) => s + m.performanceScore, 0) / recentMetrics.length;
        const avgEnergy = recentMetrics.reduce((s, m) => s + m.energyScore, 0) / recentMetrics.length;
        const avgEff = recentMetrics.reduce((s, m) => s + m.efficiency, 0) / recentMetrics.length;
        const avgVol = recentMetrics.reduce((s, m) => s + m.volume, 0) / recentMetrics.length;
        const avgDur = recentMetrics.reduce((s, m) => s + m.duration, 0) / recentMetrics.length;
        
        todayMetrics = {
          performanceScore: Math.round(avgPerf),
          energyScore: Math.round(avgEnergy),
          efficiency: Math.round(avgEff),
          totalVolume: Math.round(avgVol),
          avgDuration: Math.round(avgDur),
        };
      }

      return { today: todayMetrics, history };
    },
    enabled: !!user,
  });
}
