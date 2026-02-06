import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays } from 'date-fns';

export type TrainingSplit = 'ppl6' | 'upper_lower4' | 'full_body3' | 'ppl5' | 'custom';

interface RoutineInference {
  trainingSplit: TrainingSplit;
  avgWorkoutsPerWeek: number;
  hasHistory: boolean;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyzes last 30 days of workout history to infer training split
 */
export function useRoutineInference() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['routine-inference', user?.id],
    queryFn: async (): Promise<RoutineInference> => {
      if (!user) {
        return { trainingSplit: 'ppl6', avgWorkoutsPerWeek: 0, hasHistory: false, confidence: 'low' };
      }

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
      
      // Get workouts from last 30 days
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('id, date, day, day_name, is_skipped')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo)
        .eq('is_skipped', false)
        .order('date', { ascending: false });

      if (error) throw error;

      if (!workouts || workouts.length === 0) {
        return { trainingSplit: 'ppl6', avgWorkoutsPerWeek: 0, hasHistory: false, confidence: 'low' };
      }

      // Calculate average workouts per week
      const avgWorkoutsPerWeek = Math.round((workouts.length / 30) * 7);

      // Analyze day patterns to infer split
      const dayNames = workouts.map(w => w.day_name?.toLowerCase() || '');
      const uniqueDays = new Set(dayNames);
      
      // Count occurrences of workout types
      const hasPush = dayNames.some(d => d.includes('push'));
      const hasPull = dayNames.some(d => d.includes('pull'));
      const hasLegs = dayNames.some(d => d.includes('leg'));
      const hasUpper = dayNames.some(d => d.includes('upper'));
      const hasLower = dayNames.some(d => d.includes('lower'));
      const hasFullBody = dayNames.some(d => d.includes('full'));

      let trainingSplit: TrainingSplit = 'ppl6';
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      // Infer split based on patterns
      if (hasPush && hasPull && hasLegs) {
        // PPL detected
        if (avgWorkoutsPerWeek >= 5) {
          trainingSplit = 'ppl6';
          confidence = 'high';
        } else {
          trainingSplit = 'ppl5';
          confidence = 'medium';
        }
      } else if (hasUpper && hasLower) {
        trainingSplit = 'upper_lower4';
        confidence = 'high';
      } else if (hasFullBody || avgWorkoutsPerWeek <= 3) {
        trainingSplit = 'full_body3';
        confidence = avgWorkoutsPerWeek <= 3 ? 'high' : 'medium';
      } else if (uniqueDays.size <= 4) {
        trainingSplit = 'upper_lower4';
        confidence = 'low';
      }

      return {
        trainingSplit,
        avgWorkoutsPerWeek,
        hasHistory: true,
        confidence,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
