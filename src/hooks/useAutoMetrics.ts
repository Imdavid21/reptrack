import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, differenceInMinutes } from 'date-fns';

export interface AutoMetrics {
  performanceScore: number;
  energyScore: number;
  efficiency: number;
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

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

function parseWeight(weight: string | null): number {
  if (!weight) return 0;
  const match = weight.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseReps(reps: string | null): number {
  if (!reps) return 0;
  const match = reps.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function useAutoMetrics(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['autoMetrics', user?.id, dateRange ? format(dateRange.from, 'yyyy-MM-dd') : undefined, dateRange ? format(dateRange.to, 'yyyy-MM-dd') : undefined],
    queryFn: async (): Promise<{ today: AutoMetrics; history: DailyAutoMetrics[] }> => {
      if (!user) {
        return {
          today: { performanceScore: 0, energyScore: 0, efficiency: 0, totalVolume: 0, avgDuration: 0 },
          history: [],
        };
      }

      const startDate = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : '1900-01-01';
      const endDate = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : '2100-01-01';
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch workouts with duration and exercises (the table with actual data)
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          id, 
          date, 
          workout_duration_minutes, 
          started_at, 
          completed_at,
          exercises (
            actual_weight,
            actual_reps,
            completed
          )
        `)
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      // Calculate metrics per workout, then aggregate by date
      const workoutMetricsById = new Map<string, { volume: number; duration: number; date: string }>();

      workouts?.forEach(w => {
        let volume = 0;
        
        // Calculate volume from exercises table (string values)
        (w.exercises || []).forEach((ex: any) => {
          if (!ex.completed) return;
          const weight = parseWeight(ex.actual_weight);
          const reps = parseReps(ex.actual_reps);
          volume += weight * reps;
        });

        // Calculate duration
        let duration = w.workout_duration_minutes || 0;
        if (!duration && w.started_at && w.completed_at) {
          duration = differenceInMinutes(new Date(w.completed_at), new Date(w.started_at));
        }
        // Default to 45 min if no duration data
        if (duration <= 0) duration = 45;

        workoutMetricsById.set(w.id, { volume, duration, date: w.date });
      });

      // Aggregate by date (sum volume and duration for same-day workouts)
      const workoutMetrics = new Map<string, { volume: number; duration: number; date: string }>();
      workoutMetricsById.forEach((metrics) => {
        const existing = workoutMetrics.get(metrics.date);
        if (existing) {
          existing.volume += metrics.volume;
          existing.duration += metrics.duration;
        } else {
          workoutMetrics.set(metrics.date, { ...metrics });
        }
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

      workoutMetrics.forEach((metrics, workoutId) => {
        // Performance score: normalized by personal max volume (1-10)
        const performanceScore = maxVolume > 0 
          ? Math.min(10, Math.max(1, Math.round((metrics.volume / maxVolume) * 10)))
          : 5;

        // Energy score: how fast workout completed (faster = higher energy)
        const speedRatio = minDuration > 0 ? minDuration / metrics.duration : 1;
        const energyScore = Math.min(10, Math.max(1, Math.round(speedRatio * 7 + 3)));

        // Efficiency: kg per minute
        const efficiency = metrics.duration > 0 ? metrics.volume / metrics.duration : 0;

        const dailyMetric: DailyAutoMetrics = {
          date: metrics.date,
          performanceScore,
          energyScore,
          efficiency: Math.round(efficiency),
          volume: metrics.volume,
          duration: metrics.duration,
        };

        history.push(dailyMetric);

        if (metrics.date === today) {
          todayMetrics = {
            performanceScore,
            energyScore,
            efficiency: Math.round(efficiency),
            totalVolume: metrics.volume,
            avgDuration: metrics.duration,
          };
        }
      });

      // Sort history by date
      history.sort((a, b) => a.date.localeCompare(b.date));

      // If no workout today, calculate averages
      if (todayMetrics.performanceScore === 0 && history.length > 0) {
        const recentMetrics = history.slice(-7);
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
