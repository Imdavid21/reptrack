import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WorkoutExercise, Habits } from './useWorkouts';

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
    energy_level: number;
    bodyweight: number | null;
    notes: string | null;
    supplements: Record<string, boolean>;
  } | null;
}

export function useWorkoutDetails(workoutId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
        .single();

      if (workoutError) throw workoutError;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-details', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const updateHabitsMutation = useMutation({
    mutationFn: async (habits: Partial<Habits> & { workout_id: string }) => {
      const { workout_id, ...habitData } = habits;

      // Check if habits exist
      const { data: existing } = await supabase
        .from('habits')
        .select('id')
        .eq('workout_id', workout_id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('habits')
          .update(habitData)
          .eq('workout_id', workout_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('habits')
          .insert({ workout_id, ...habitData });
        if (error) throw error;
      }
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
    updateHabits: updateHabitsMutation.mutateAsync,
    isUpdatingHabits: updateHabitsMutation.isPending,
  };
}
