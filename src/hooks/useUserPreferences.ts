import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays } from 'date-fns';

export type TrainingSplit = 'ppl6' | 'upper_lower4' | 'full_body3' | 'ppl5' | 'custom';

export interface UserPreferences {
  id: string;
  user_id: string;
  onboarding_completed: boolean;
  daily_water_goal: number;
  daily_calorie_goal: number;
  daily_protein_goal: number;
  weekly_workout_goal: number;
  sleep_goal: number;
  weight_goal: number | null;
  weight_goal_type: 'lose' | 'gain' | 'maintain' | null;
  units_system: 'metric' | 'imperial';
  training_split: TrainingSplit;
  rest_days: number[];
  routine_setup_completed: boolean;
  fitness_goal: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to infer training split from workout history
async function inferTrainingSplit(userId: string, workoutCount: number): Promise<TrainingSplit> {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
  
  const { data: workouts } = await supabase
    .from('workouts')
    .select('day_name')
    .eq('user_id', userId)
    .gte('date', thirtyDaysAgo);

  if (!workouts || workouts.length === 0) {
    // Default to ppl6 for users with older history
    return 'ppl6';
  }

  const avgPerWeek = Math.round((workouts.length / 30) * 7);
  const dayNames = workouts.map(w => w.day_name?.toLowerCase() || '');
  
  const hasPush = dayNames.some(d => d.includes('push'));
  const hasPull = dayNames.some(d => d.includes('pull'));
  const hasLegs = dayNames.some(d => d.includes('leg'));
  const hasUpper = dayNames.some(d => d.includes('upper'));
  const hasLower = dayNames.some(d => d.includes('lower'));

  if (hasPush && hasPull && hasLegs) {
    return avgPerWeek >= 5 ? 'ppl6' : 'ppl5';
  } else if (hasUpper && hasLower) {
    return 'upper_lower4';
  } else if (avgPerWeek <= 3) {
    return 'full_body3';
  }
  
  return 'ppl6'; // Default fallback
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no preferences exist, check if user has existing data (returning user)
      if (!data) {
        const { count: workoutCount } = await supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        // If user has existing workouts, they're a returning user - auto-create preferences
        if (workoutCount && workoutCount > 0) {
          // Infer training split from workout patterns
          const inferredSplit = await inferTrainingSplit(user.id, workoutCount);
          
          const { data: newPrefs } = await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              onboarding_completed: true, // Skip onboarding for existing users
              routine_setup_completed: true, // Skip routine setup for existing users
              training_split: inferredSplit,
            })
            .select()
            .single();
          return newPrefs as UserPreferences;
        }
      }
      
      return data as UserPreferences | null;
    },
    enabled: !!user,
  });

  const createPreferences = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...prefs,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('user_preferences')
        .update(prefs)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });

  const completeOnboarding = async (prefs: Partial<UserPreferences>) => {
    const finalPrefs = { ...prefs, onboarding_completed: true };
    
    if (preferences) {
      return updatePreferences.mutateAsync(finalPrefs);
    } else {
      return createPreferences.mutateAsync(finalPrefs);
    }
  };

  // Only show onboarding if:
  // 1. Loading is complete
  // 2. Either no preferences exist OR onboarding_completed is explicitly false
  // 3. This accounts for returning users who get auto-created preferences
  const needsOnboarding = !isLoading && preferences !== undefined && 
    (preferences === null || preferences.onboarding_completed === false);

  return {
    preferences,
    isLoading,
    needsOnboarding,
    createPreferences,
    updatePreferences,
    completeOnboarding,
  };
}
