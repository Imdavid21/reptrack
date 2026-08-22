import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays } from 'date-fns';
import { localDateKey } from '@/lib/dateKey';

export type TrainingSplit = 'ppl6' | 'upper_lower4' | 'full_body3' | 'ppl5' | 'custom';

/**
 * How sets/reps/rest get programmed for every exercise:
 *  - 'strength': low reps, more rest, always - regardless of the day's own bias.
 *  - 'volume': high reps, more sets, shorter rest - regardless of day bias.
 *  - 'mix' (default): alternate per the day's own heavy/volume bias, honoring
 *    each split's hand-curated per-exercise prescription (today's behavior).
 * See src/lib/programmingEngine.ts for where this is applied.
 */
export type TrainingFocus = 'volume' | 'strength' | 'mix';

export interface UserPreferences {
  id: string;
  user_id: string;
  name: string | null;
  age: number | null;
  date_of_birth?: string | null;
  height_cm: number | null;
  gender: string | null;
  initial_weight_kg?: number | null;
  nonexercise_lifestyle?: 'mostly_seated' | 'mixed_seated_standing' | 'physically_active_occupation' | null;
  onboarding_completed: boolean;
  daily_water_goal: number;
  daily_calorie_goal: number;
  daily_protein_goal: number;
  calorie_target_locked?: boolean;
  protein_target_locked?: boolean;
  weekly_workout_goal: number;
  sleep_goal: number;
  weight_goal: number | null;
  weight_goal_type: 'lose' | 'gain' | 'maintain' | null;
  units_system: 'metric' | 'imperial';
  training_split: TrainingSplit;
  training_focus: TrainingFocus;
  rest_days: number[];
  routine_setup_completed: boolean;
  fitness_goal: string | null;
  deficit_mode_enabled: boolean;
  daily_deficit_target: number;
  maintenance_calories: number | null;
  /** Default rest duration (seconds) offered in Settings; only used as the
   *  final fallback in SetBySetCard's getDefaultRest() - exercise-specific
   *  and workout-bias-derived rest times take priority. */
  default_rest_seconds: number;
  auto_rest_timer: boolean;
  /** Adaptive Mode (Infinite Progression method) - see src/lib/adaptiveEngine.ts. */
  adaptive_mode_enabled: boolean;
  /** Whether the BMR/maintenance breakdown tile shows on the dashboard's deficit card. */
  show_bmr_on_dashboard: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to infer training split from workout history
async function inferTrainingSplit(userId: string, workoutCount: number): Promise<TrainingSplit> {
  const thirtyDaysAgo = localDateKey(subDays(new Date(), 30));
  
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

          // Upsert (not insert) so a concurrent first-load in another tab that
          // already created the row doesn't throw a unique-constraint error and
          // leave this query returning undefined (which React Query rejects,
          // wedging the whole app on the loading state).
          const { data: newPrefs, error: insertError } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              onboarding_completed: true, // Skip onboarding for existing users
              routine_setup_completed: true, // Skip routine setup for existing users
              training_split: inferredSplit,
            }, { onConflict: 'user_id' })
            .select()
            .maybeSingle();

          // On any write error, fall back to re-reading the existing row rather
          // than returning undefined.
          if (insertError || !newPrefs) {
            const { data: existing } = await supabase
              .from('user_preferences')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            return (existing ?? null) as unknown as UserPreferences | null;
          }
          return newPrefs as unknown as UserPreferences;
        }
      }
      
      return data as unknown as UserPreferences | null;
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
    onSuccess: (data) => {
      // Seed the cache with the authoritative saved row directly - this is
      // the only query key this resource ever uses, so there's nothing left
      // to invalidate. Deliberately skip invalidateQueries: it would trigger
      // an immediate background refetch racing this write, and a slow/flaky
      // connection (e.g. gym wifi) can let that refetch resolve with a stale
      // service-worker-cached GET, silently clobbering the row we just saved.
      if (data) {
        queryClient.setQueryData(['user-preferences', user?.id], data);
      }
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
    onSuccess: (data) => {
      // The update returns the freshly-saved row (e.g. the new training_split).
      // Write it straight into the cache so the UI updates instantly. Skip
      // invalidateQueries on purpose - this is the only query key this
      // resource uses, so there's nothing else to reconcile, and forcing an
      // immediate refetch here just races this write against a possibly
      // stale service-worker-cached GET (see api-cache in vite.config.ts),
      // which is exactly how a saved training_split could appear to revert.
      if (data) {
        queryClient.setQueryData(['user-preferences', user?.id], data);
      }
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
