import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

export interface RecoveryMetrics {
  id: string;
  user_id: string;
  date: string;
  recovery_score: number | null;
  hrv_ms: number | null;
  resting_hr: number | null;
  sleep_quality: number | null;
  muscle_soreness: number | null;
  fatigue_level: number | null;
  stress_level: number | null;
  workout_readiness: number | null;
  deload_recommended: boolean;
  notes: string | null;
}

export interface DeloadWeek {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  trigger_reason: 'scheduled' | 'ai_recommended' | 'manual' | 'overtraining';
  volume_reduction_percent: number;
  intensity_reduction_percent: number;
  fatigue_indicators: any;
  completed: boolean;
  notes: string | null;
}

// Calculate recovery score from inputs (0-100)
export function calculateRecoveryScore(metrics: {
  sleep_quality?: number;
  muscle_soreness?: number;
  fatigue_level?: number;
  stress_level?: number;
  hrv_ms?: number;
  resting_hr?: number;
}): number {
  let score = 50; // Base score
  let factors = 0;
  
  // Sleep quality (1-10, higher = better)
  if (metrics.sleep_quality) {
    score += (metrics.sleep_quality - 5) * 6; // -30 to +30
    factors++;
  }
  
  // Muscle soreness (1-10, lower = better)
  if (metrics.muscle_soreness) {
    score -= (metrics.muscle_soreness - 5) * 4; // -20 to +20
    factors++;
  }
  
  // Fatigue level (1-10, lower = better)
  if (metrics.fatigue_level) {
    score -= (metrics.fatigue_level - 5) * 5; // -25 to +25
    factors++;
  }
  
  // Stress level (1-10, lower = better)
  if (metrics.stress_level) {
    score -= (metrics.stress_level - 5) * 3; // -15 to +15
    factors++;
  }
  
  // HRV (higher is generally better)
  if (metrics.hrv_ms) {
    // Normalize HRV: 20-60ms is typical range
    const hrvNormalized = Math.min(Math.max((metrics.hrv_ms - 30) / 30, -1), 1);
    score += hrvNormalized * 10;
    factors++;
  }
  
  // Resting HR (lower is generally better)
  if (metrics.resting_hr) {
    // Normalize: 50-80 is typical range
    const hrNormalized = Math.min(Math.max((65 - metrics.resting_hr) / 15, -1), 1);
    score += hrNormalized * 10;
    factors++;
  }
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

// Determine if deload is recommended
export function shouldRecommendDeload(
  recentMetrics: RecoveryMetrics[],
  weeksSinceLastDeload: number
): { recommend: boolean; reason: string } {
  // Scheduled deload every 4-6 weeks
  if (weeksSinceLastDeload >= 5) {
    return { recommend: true, reason: 'Scheduled deload - 5+ weeks since last recovery week' };
  }
  
  // Check for overtraining signals
  const last7Days = recentMetrics.slice(0, 7);
  if (last7Days.length < 3) {
    return { recommend: false, reason: 'Insufficient data' };
  }
  
  const avgRecovery = last7Days.reduce((sum, m) => sum + (m.recovery_score || 50), 0) / last7Days.length;
  const avgFatigue = last7Days.reduce((sum, m) => sum + (m.fatigue_level || 5), 0) / last7Days.length;
  const avgSoreness = last7Days.reduce((sum, m) => sum + (m.muscle_soreness || 5), 0) / last7Days.length;
  
  if (avgRecovery < 40) {
    return { recommend: true, reason: 'Low recovery scores - body needs rest' };
  }
  
  if (avgFatigue > 7) {
    return { recommend: true, reason: 'High fatigue levels detected' };
  }
  
  if (avgSoreness > 7) {
    return { recommend: true, reason: 'Persistent muscle soreness - incomplete recovery' };
  }
  
  // Check for declining trend
  if (last7Days.length >= 5) {
    const firstHalf = last7Days.slice(0, 3);
    const secondHalf = last7Days.slice(-3);
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + (m.recovery_score || 50), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + (m.recovery_score || 50), 0) / secondHalf.length;
    
    if (secondAvg < firstAvg - 15) {
      return { recommend: true, reason: 'Declining recovery trend - consider backing off' };
    }
  }
  
  return { recommend: false, reason: 'Recovery metrics look good' };
}

// Calculate workout readiness (0-100)
export function calculateWorkoutReadiness(
  recoveryScore: number,
  todaysWorkoutType: 'Push' | 'Pull' | 'Legs' | 'rest',
  soreMuscles: string[]
): number {
  let readiness = recoveryScore;
  
  // If rest day, full readiness doesn't matter
  if (todaysWorkoutType === 'rest') {
    return 100;
  }
  
  // Check if sore muscles overlap with today's workout
  const pushMuscles = ['chest', 'front_delts', 'side_delts', 'triceps'];
  const pullMuscles = ['lats', 'mid_back', 'rear_delts', 'biceps'];
  const legMuscles = ['quads', 'hamstrings', 'glutes', 'calves'];
  
  const relevantMuscles = todaysWorkoutType === 'Push' ? pushMuscles :
                         todaysWorkoutType === 'Pull' ? pullMuscles : legMuscles;
  
  const sorenessOverlap = soreMuscles.filter(m => relevantMuscles.includes(m)).length;
  readiness -= sorenessOverlap * 10; // -10% per overlapping sore muscle group
  
  return Math.min(100, Math.max(0, Math.round(readiness)));
}

export function useRecoveryMetrics(days: number = 14) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recoveryMetrics', user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('recovery_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as RecoveryMetrics[];
    },
    enabled: !!user,
  });

  const todayQuery = useQuery({
    queryKey: ['recoveryMetrics', user?.id, 'today'],
    queryFn: async () => {
      if (!user) return null;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('recovery_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as RecoveryMetrics | null;
    },
    enabled: !!user,
  });

  const upsertMetrics = useMutation({
    mutationFn: async (metrics: Partial<RecoveryMetrics> & { date: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Calculate recovery score
      const recovery_score = calculateRecoveryScore({
        sleep_quality: metrics.sleep_quality || undefined,
        muscle_soreness: metrics.muscle_soreness || undefined,
        fatigue_level: metrics.fatigue_level || undefined,
        stress_level: metrics.stress_level || undefined,
        hrv_ms: metrics.hrv_ms || undefined,
        resting_hr: metrics.resting_hr || undefined,
      });
      
      const { data, error } = await supabase
        .from('recovery_metrics')
        .upsert({
          user_id: user.id,
          ...metrics,
          recovery_score,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,date' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recoveryMetrics'] });
    },
  });

  // Calculate averages and trends
  const metrics = query.data || [];
  const avgRecovery = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.recovery_score || 50), 0) / metrics.length)
    : null;
  
  const avgFatigue = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.fatigue_level || 5), 0) / metrics.length * 10) / 10
    : null;

  return {
    metrics,
    todayMetrics: todayQuery.data,
    avgRecovery,
    avgFatigue,
    isLoading: query.isLoading,
    upsertMetrics: upsertMetrics.mutateAsync,
    isSaving: upsertMetrics.isPending,
  };
}

export function useDeloadWeeks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['deloadWeeks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('deload_weeks')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data as DeloadWeek[];
    },
    enabled: !!user,
  });

  const createDeload = useMutation({
    mutationFn: async (deload: Omit<DeloadWeek, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('deload_weeks')
        .insert({
          user_id: user.id,
          ...deload,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deloadWeeks'] });
    },
  });

  const lastDeload = query.data?.[0];
  const weeksSinceLastDeload = lastDeload
    ? Math.floor((Date.now() - new Date(lastDeload.week_end).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 99; // Assume never if no data

  return {
    deloads: query.data || [],
    lastDeload,
    weeksSinceLastDeload,
    isLoading: query.isLoading,
    createDeload: createDeload.mutateAsync,
    isCreating: createDeload.isPending,
  };
}
