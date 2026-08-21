import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WorkoutExercise } from './useWorkouts';
import { useUserPreferences } from './useUserPreferences';
import { syncWorkoutEnergy } from '@/lib/workoutEnergySync';

// Editing a set from here (History → "tap any set to edit weight & reps") is
// the same underlying `exercises` row every PR/volume/progression view reads
// - but this hook previously only invalidated its own workout-details/
// workouts caches, so correcting an already-logged set (e.g. fixing a typo'd
// weight, or adding the real heaviest set after the fact) left PR badges,
// muscle-balance volume, and progression charts silently showing stale data
// until something unrelated (like starting a brand-new workout) happened to
// refetch them.
function invalidateSetDerivedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
  // Editing sets changes the workout's estimated burn, so every energy surface
  // (Insights charts, daily net calories, history totals) has to refetch too.
  queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
  queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
  queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
  queryClient.invalidateQueries({ queryKey: ['workout-with-exercises'] });
  queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
  queryClient.invalidateQueries({ queryKey: ['muscleBalance'] });
  queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
  // 'exerciseSets' is the one real query key behind volume charts, exercise
  // progression, and muscle balance - NOT 'volumeData'/'exerciseProgression',
  // which read like plausible names but match no actual useQuery anywhere in
  // the app (see the same dead keys in useWorkouts.ts/useOfflineSync.ts).
  queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
  // 'lastUsedWeights' has a 5-minute staleTime and was never invalidated by
  // anything - editing a set here could leave "last used" prefills and next-
  // session progression suggestions showing pre-edit numbers for up to 5min.
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

  const resyncEnergy = async () => {
    if (!user || !workoutId) return;
    try {
      await syncWorkoutEnergy(supabase, {
        userId: user.id,
        workoutId,
        initialWeightKg: preferences?.initial_weight_kg,
      });
    } catch (error) {
      console.error('[useWorkoutDetails] failed to resync workout energy', error);
    }
  };

  const query = useQuery({
    queryKey: ['workout-details', workoutId],
    queryFn: async () => {
      if (!workoutId || !user) return null;

      // Fetch workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (workoutError) throw workoutError;
      if (!workout) return null;

      // Fetch exercises
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('sort_order', { ascending: true });

      if (exercisesError) throw exercisesError;

      // Fetch habits
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('workout_id', workoutId)
        .single();

      // habits might not exist, that's ok

      return {
        ...workout,
        exercises: exercises || [],
        habits: habits || null,
      } as WorkoutWithDetails;
    },
    enabled: !!workoutId && !!user,
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async (exercise: {
      id: string;
      actual_weight: string;
      actual_reps: string;
      completed: boolean;
    }) => {
      const { error } = await supabase
        .from('exercises')
        .update({
          actual_weight: exercise.actual_weight,
          actual_reps: exercise.actual_reps,
          completed: exercise.completed,
        })
        .eq('id', exercise.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await resyncEnergy();
      queryClient.invalidateQueries({ queryKey: ['workout-details', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      invalidateSetDerivedQueries(queryClient);
    },
  });

  const createExerciseMutation = useMutation({
    mutationFn: async (exercise: {
      workout_id: string;
      name: string;
      category: string;
      target_weight?: string;
      target_reps?: string;
      actual_weight?: string;
      actual_reps?: string;
      completed?: boolean;
      sort_order: number;
    }) => {
      const { error } = await supabase
        .from('exercises')
        .insert({
          workout_id: exercise.workout_id,
          name: exercise.name,
          category: exercise.category,
          target_weight: exercise.target_weight,
          target_reps: exercise.target_reps,
          actual_weight: exercise.actual_weight ?? null,
          actual_reps: exercise.actual_reps ?? null,
          sort_order: exercise.sort_order,
          completed: exercise.completed ?? false,
        });

      if (error) throw error;
    },
    onSuccess: async () => {
      await resyncEnergy();
      queryClient.invalidateQueries({ queryKey: ['workout-details', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      invalidateSetDerivedQueries(queryClient);
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await resyncEnergy();
      queryClient.invalidateQueries({ queryKey: ['workout-details', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      invalidateSetDerivedQueries(queryClient);
    },
  });

  const deleteExerciseGroupMutation = useMutation({
    mutationFn: async (exerciseIds: string[]) => {
      if (exerciseIds.length === 0) return;
      const { error } = await supabase
        .from('exercises')
        .delete()
        .in('id', exerciseIds);

      if (error) throw error;
    },
    onSuccess: async () => {
      await resyncEnergy();
      queryClient.invalidateQueries({ queryKey: ['workout-details', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      invalidateSetDerivedQueries(queryClient);
    },
  });

  const renameExerciseGroupMutation = useMutation({
    mutationFn: async (payload: { updates: { id: string; name: string }[]; category?: string }) => {
      const results = await Promise.all(
        payload.updates.map(u =>
          supabase
            .from('exercises')
            .update(payload.category ? { name: u.name, category: payload.category } : { name: u.name })
            .eq('id', u.id)
        )
      );
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: async () => {
      await resyncEnergy();
      queryClient.invalidateQueries({ queryKey: ['workout-details', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      invalidateSetDerivedQueries(queryClient);
    },
  });

  const reorderExercisesMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      // Update each exercise's sort_order individually since we only have id and sort_order
      const promises = updates.map(u => 
        supabase
          .from('exercises')
          .update({ sort_order: u.sort_order })
          .eq('id', u.id)
      );
      
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-details', workoutId] });
    },
  });

  return {
    workout: query.data,
    isLoading: query.isLoading,
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
