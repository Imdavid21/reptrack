import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays } from 'date-fns';
import { localDateKey } from '@/lib/dateKey';

export type TrainingSplit = 'ppl6' | 'upper_lower4' | 'full_body3' | 'ppl5' | 'custom';
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
  default_rest_seconds: number;
  auto_rest_timer: boolean;
  adaptive_mode_enabled: boolean;
  show_bmr_on_dashboard: boolean;
  created_at: string;
  updated_at: string;
}

async function inferTrainingSplit(userId: string): Promise<TrainingSplit> {
  const thirtyDaysAgo = localDateKey(subDays(new Date(), 30));
  const { data: workouts, error } = await supabase.from('workouts').select('day_name').eq('user_id', userId).gte('date', thirtyDaysAgo);
  if (error) throw error;
  if (!workouts?.length) return 'ppl6';

  const avgPerWeek = Math.round((workouts.length / 30) * 7);
  const dayNames = workouts.map(w => w.day_name?.toLowerCase() || '');
  const hasPush = dayNames.some(d => d.includes('push'));
  const hasPull = dayNames.some(d => d.includes('pull'));
  const hasLegs = dayNames.some(d => d.includes('leg'));
  const hasUpper = dayNames.some(d => d.includes('upper'));
  const hasLower = dayNames.some(d => d.includes('lower'));

  if (hasPush && hasPull && hasLegs) return avgPerWeek >= 5 ? 'ppl6' : 'ppl5';
  if (hasUpper && hasLower) return 'upper_lower4';
  if (avgPerWeek <= 3) return 'full_body3';
  return 'ppl6';
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;

      if (!data) {
        const { count: workoutCount, error: countError } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        if (countError) throw countError;

        if (workoutCount && workoutCount > 0) {
          const inferredSplit = await inferTrainingSplit(user.id);
          const { data: newPrefs, error: insertError } = await supabase.from('user_preferences').upsert({
            user_id: user.id,
            onboarding_completed: true,
            routine_setup_completed: true,
            training_split: inferredSplit,
          }, { onConflict: 'user_id' }).select().maybeSingle();

          if (insertError || !newPrefs) {
            // A concurrent first-load may have won the upsert. Re-read once, but
            // never turn a genuine backend failure into a fake "new user" state.
            const { data: existing, error: rereadError } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
            if (rereadError) throw rereadError;
            if (existing) return existing as unknown as UserPreferences;
            if (insertError) throw insertError;
            throw new Error('Preferences could not be created.');
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
      const { data, error } = await supabase.from('user_preferences').insert({ user_id: user.id, ...prefs }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      if (data) queryClient.setQueryData(['user-preferences', user?.id], data);
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase.from('user_preferences').update(prefs).eq('user_id', user.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      if (data) queryClient.setQueryData(['user-preferences', user?.id], data);
    },
  });

  const completeOnboarding = async (prefs: Partial<UserPreferences>) => {
    const finalPrefs = { ...prefs, onboarding_completed: true };
    return query.data ? updatePreferences.mutateAsync(finalPrefs) : createPreferences.mutateAsync(finalPrefs);
  };

  const needsOnboarding = !query.isLoading && !query.error && query.data !== undefined && (query.data === null || query.data.onboarding_completed === false);

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    needsOnboarding,
    createPreferences,
    updatePreferences,
    completeOnboarding,
  };
}
