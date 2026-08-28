import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { syncWorkoutEnergy } from '@/lib/workoutEnergySync';

function invalidateSetDerivedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
  queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
  queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
  queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
  queryClient.invalidateQueries({ queryKey: ['workout-with-exercises'] });
  queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
  queryClient.invalidateQueries({ queryKey: ['muscleBalance'] });
  queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
  queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
  queryClient.invalidateQueries({ queryKey: ['lastUsedWeights'] });
}

export interface WorkoutWithDetails {
  id: string;
  user_id: string;
  date: string;
  day: string;
  day_name: string;
  week_number: number;
  created_at: string;
  exercises: Array<{
    id: string;
    name: string;
    category: string;
    target_weight: string | null;
    target_reps: string | null;
    actual_weight: string | null;
    actual_reps: string | null;
    completed: boolean;
    sort_order: number;
  }>;
  habits: {
    id: string;
    pullups: number;
    water_intake: number;
    sleep_hours: number;
    bodyweight: number | null;
    notes: string | null;
  } | null;
}

export function useWorkoutDetails(workoutId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preferences } = useUserPreferences();
  const detailKey = ['workout-details', user?.id, workoutId] as const;

  const resyncEnergy = async () => {
    if (!user || !workoutId) return;
    try {
      await syncWorkoutEnergy(supabase, { userId: user.id, workoutId, initialWeightKg: preferences?.initial_weight_kg });
    } catch (error) {
      console.error('[useWorkoutDetails] failed to resync workout energy', error);
    }
  };

  const query = useQuery({
    queryKey: detailKey,
    queryFn: async () => {
      if (!workoutId || !user) return null;

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (workoutError) throw workoutError;
      if (!workout) return null;

      const [{ data: exercises, error: exercisesError }, { data: habits, error: habitsError }] = await Promise.all([
        supabase.from('exercises').select('*').eq('workout_id', workoutId).order('sort_order', { ascending: true }),
        supabase.from('habits').select('*').eq('workout_id', workoutId).maybeSingle(),
      ]);
      if (exercisesError) throw exercisesError;
      if (habitsError) throw habitsError;

      return { ...workout, exercises: exercises || [], habits: habits || null } as WorkoutWithDetails;
    },
    enabled: !!workoutId && !!user,
    throwOnError: true,
  });

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: detailKey });
    queryClient.invalidateQueries({ queryKey: ['workouts'] });
  };

  const updateExerciseMutation = useMutation({
    mutationFn: async (exercise: { id: string; actual_weight: string; actual_reps: string; completed: boolean }) => {
      if (!workoutId) throw new Error('Workout unavailable');
      const { error } = await supabase.from('exercises').update({ actual_weight: exercise.actual_weight, actual_reps: exercise.actual_reps, completed: exercise.completed }).eq('id', exercise.id).eq('workout_id', workoutId);
      if (error) throw error;
    },
    onSuccess: async () => { await resyncEnergy(); invalidateDetail(); invalidateSetDerivedQueries(queryClient); },
  });

  const createExerciseMutation = useMutation({
    mutationFn: async (exercise: { workout_id: string; name: string; category: string; target_weight?: string; target_reps?: string; actual_weight?: string; actual_reps?: string; completed?: boolean; sort_order: number }) => {
      if (!workoutId || exercise.workout_id !== workoutId) throw new Error('Workout mismatch');
      const { error } = await supabase.from('exercises').insert({ workout_id: exercise.workout_id, name: exercise.name, category: exercise.category, target_weight: exercise.target_weight, target_reps: exercise.target_reps, actual_weight: exercise.actual_weight ?? null, actual_reps: exercise.actual_reps ?? null, sort_order: exercise.sort_order, completed: exercise.completed ?? false });
      if (error) throw error;
    },
    onSuccess: async () => { await resyncEnergy(); invalidateDetail(); invalidateSetDerivedQueries(queryClient); },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!workoutId) throw new Error('Workout unavailable');
      const { error } = await supabase.from('exercises').delete().eq('id', exerciseId).eq('workout_id', workoutId);
      if (error) throw error;
    },
    onSuccess: async () => { await resyncEnergy(); invalidateDetail(); invalidateSetDerivedQueries(queryClient); },
  });

  const deleteExerciseGroupMutation = useMutation({
    mutationFn: async (exerciseIds: string[]) => {
      if (!workoutId || exerciseIds.length === 0) return;
      const { error } = await supabase.from('exercises').delete().in('id', exerciseIds).eq('workout_id', workoutId);
      if (error) throw error;
    },
    onSuccess: async () => { await resyncEnergy(); invalidateDetail(); invalidateSetDerivedQueries(queryClient); },
  });

  const renameExerciseGroupMutation = useMutation({
    mutationFn: async (payload: { updates: { id: string; name: string }[]; category?: string }) => {
      if (!workoutId) throw new Error('Workout unavailable');
      const results = await Promise.all(payload.updates.map(update => supabase.from('exercises').update(payload.category ? { name: update.name, category: payload.category } : { name: update.name }).eq('id', update.id).eq('workout_id', workoutId)));
      const error = results.find(result => result.error)?.error;
      if (error) throw error;
    },
    onSuccess: async () => { await resyncEnergy(); invalidateDetail(); invalidateSetDerivedQueries(queryClient); },
  });

  const reorderExercisesMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      if (!workoutId) throw new Error('Workout unavailable');
      const results = await Promise.all(updates.map(update => supabase.from('exercises').update({ sort_order: update.sort_order }).eq('id', update.id).eq('workout_id', workoutId)));
      const error = results.find(result => result.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey }),
  });

  return {
    workout: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    updateExercise: updateExerciseMutation.mutateAsync,
    isUpdatingExercise: updateExerciseMutation.isPending,
    createExercise: createExerciseMutation.mutateAsync,
    isCreatingExercise: createExerciseMutation.isPending,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    deleteExerciseGroup: deleteExerciseGroupMutation.mutateAsync,
    renameExerciseGroup: renameExerciseGroupMutation.mutateAsync,
    isDeletingExercise: deleteExerciseMutation.isPending,
    reorderExercises: reorderExercisesMutation.mutateAsync,
  };
}
