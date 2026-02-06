import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ExerciseSet {
  setNumber: number;
  targetWeight: string;
  targetReps: string;
  actualWeight: string;
  actualReps: string;
  completed: boolean;
}

export interface WorkoutExercise {
  id?: string;
  name: string;
  category: string;
  sets: ExerciseSet[];
  sort_order: number;
}

export interface Habits {
  pullups: number;
  water_intake: number;
  sleep_hours: number;
  energy_level: number;
  bodyweight?: number;
  notes?: string;
}

export interface PostCheckin {
  difficulty: number;
  satisfaction: number;
  durationMinutes?: number;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  day: string;
  day_name: string;
  week_number: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  workout_duration_minutes?: number;
  post_difficulty?: number;
  post_satisfaction?: number;
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
      date?: Date;
      exercises: WorkoutExercise[];
      habits: Habits;
      postCheckin?: PostCheckin;
      startedAt?: Date;
      completedAt?: Date;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Format date for Supabase (YYYY-MM-DD)
      const workoutDate = workout.date
        ? workout.date.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      // Create workout with check-in data
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          day: workout.day,
          day_name: workout.day_name,
          week_number: workout.week_number,
          date: workoutDate,
          post_difficulty: workout.postCheckin?.difficulty,
          post_satisfaction: workout.postCheckin?.satisfaction,
          workout_duration_minutes: workout.postCheckin?.durationMinutes,
          started_at: workout.startedAt?.toISOString(),
          completed_at: workout.completedAt?.toISOString(),
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Create exercises - flatten sets into individual exercise records
      const exercisesToInsert = workout.exercises.flatMap((ex, exIdx) => {
        const completedSets = ex.sets.filter(set => set.completed);
        if (completedSets.length === 0) return [];

        return completedSets.map((set, setIdx) => ({
          workout_id: workoutData.id,
          name: `${ex.name} (Set ${set.setNumber})`,
          category: ex.category,
          target_weight: set.targetWeight,
          target_reps: set.targetReps,
          actual_weight: set.actualWeight,
          actual_reps: set.actualReps,
          completed: set.completed,
          sort_order: exIdx * 100 + setIdx,
        }));
      });

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
        });

      if (habitsError) throw habitsError;

      return workoutData;
    },
    onSuccess: () => {
      // Keep analytics in sync immediately after logging a workout
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['habitsData'] });
      queryClient.invalidateQueries({ queryKey: ['volumeData'] });
      queryClient.invalidateQueries({ queryKey: ['exerciseProgression'] });
      queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async (workout: Partial<Workout> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('workouts')
        .update({
          is_skipped: (workout as any).is_skipped, // Cast as any if column not in type yet
          notes: (workout as any).notes,
        })
        .eq('id', workout.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['habitsData'] });
      queryClient.invalidateQueries({ queryKey: ['volumeData'] });
      queryClient.invalidateQueries({ queryKey: ['exerciseProgression'] });
      queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
    },
  });

  return {
    workouts: workoutsQuery.data ?? [],
    isLoading: workoutsQuery.isLoading,
    error: workoutsQuery.error,
    createWorkout: createWorkoutMutation.mutateAsync,
    isCreating: createWorkoutMutation.isPending,
    updateWorkout: updateWorkoutMutation.mutateAsync,
    deleteWorkout: deleteWorkoutMutation.mutateAsync,
  };
}
