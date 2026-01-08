import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WorkoutExercise {
  id?: string;
  name: string;
  category: string;
  target_weight: string;
  target_reps: string;
  actual_weight?: string;
  actual_reps?: string;
  completed: boolean;
  sort_order: number;
}

export interface Habits {
  pullups: number;
  water_intake: number;
  sleep_hours: number;
  energy_level: number;
  bodyweight?: number;
  notes?: string;
  supplements: {
    whey: boolean;
    casein: boolean;
    creatine: boolean;
    omega3: boolean;
    vitaminD: boolean;
    magnesium: boolean;
    zinc: boolean;
  };
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  day: string;
  day_name: string;
  week_number: number;
  created_at: string;
  exercises?: WorkoutExercise[];
  habits?: Habits;
}

export function useWorkouts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const workoutsQuery = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return workouts as Workout[];
    },
    enabled: !!user,
  });

  const createWorkoutMutation = useMutation({
    mutationFn: async (workout: {
      day: string;
      day_name: string;
      week_number: number;
      exercises: WorkoutExercise[];
      habits: Habits;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Create workout
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          day: workout.day,
          day_name: workout.day_name,
          week_number: workout.week_number,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Create exercises
      const exercisesToInsert = workout.exercises
        .filter(ex => ex.completed)
        .map((ex, idx) => ({
          workout_id: workoutData.id,
          name: ex.name,
          category: ex.category,
          target_weight: ex.target_weight,
          target_reps: ex.target_reps,
          actual_weight: ex.actual_weight,
          actual_reps: ex.actual_reps,
          completed: ex.completed,
          sort_order: idx,
        }));

      if (exercisesToInsert.length > 0) {
        const { error: exercisesError } = await supabase
          .from('exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      // Create habits
      const { error: habitsError } = await supabase
        .from('habits')
        .insert({
          workout_id: workoutData.id,
          pullups: workout.habits.pullups,
          water_intake: workout.habits.water_intake,
          sleep_hours: workout.habits.sleep_hours,
          energy_level: workout.habits.energy_level,
          bodyweight: workout.habits.bodyweight,
          notes: workout.habits.notes,
          supplements: workout.habits.supplements,
        });

      if (habitsError) throw habitsError;

      return workoutData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  return {
    workouts: workoutsQuery.data ?? [],
    isLoading: workoutsQuery.isLoading,
    error: workoutsQuery.error,
    createWorkout: createWorkoutMutation.mutateAsync,
    isCreating: createWorkoutMutation.isPending,
  };
}
