import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { enqueueOperation } from '@/lib/offlineSyncQueue';
import { localDateKey } from '@/lib/dateKey';
import { effectiveWeightAt, ENERGY_MODEL_VERSION, estimateWorkoutEnergy } from '@/lib/energyEngineV3';
import { workoutIntensityOverride } from '@/lib/workoutCalories';

import type { ExerciseType } from '@/lib/exerciseLibrary';

export interface ExerciseSet {
  setNumber: number;
  targetWeight: string;
  targetReps: string;
  actualWeight: string;
  actualReps: string;
  /** Target duration in seconds for timed exercises */
  targetTime?: number;
  /** Actual duration in seconds for timed exercises */
  actualTime?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id?: string;
  name: string;
  category: string;
  sets: ExerciseSet[];
  sort_order: number;
  /** How this exercise is measured: weighted, bodyweight, weighted_bw, timed */
  exerciseType?: ExerciseType;
  /** Recommended rest between sets in seconds */
  restSeconds?: number;
  /** Reps in reserve target (e.g. "2-3") */
  rir?: string;
  /** Corrective/functional work that shouldn't be skipped for time. */
  mandatory?: boolean;
  /** Short progression rule shown to the user. */
  progression?: string;
}

export interface Habits {
  pullups: number;
  water_intake: number;
  sleep_hours: number;
  bodyweight?: number;
  notes?: string;
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
  exercises?: WorkoutExercise[];
  habits?: Habits;
}

export function useWorkouts() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
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
      habits?: Habits;
      durationMinutes?: number;
      startedAt?: Date;
      completedAt?: Date;
      explicitPauseSeconds?: number;
      pauseIntervals?: Array<{ pausedAt: string; resumedAt?: string }>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Format date for Supabase (YYYY-MM-DD) using LOCAL time, not UTC.
      const workoutDate = localDateKey(workout.date ?? new Date());

      const weightWindowStart = new Date(`${workoutDate}T12:00:00`);
      weightWindowStart.setDate(weightWindowStart.getDate() - 30);
      const { data: weightRows } = await supabase.from('daily_metrics').select('date,bodyweight').eq('user_id', user.id).gte('date', localDateKey(weightWindowStart)).lte('date', workoutDate).not('bodyweight', 'is', null).order('date');
      const weight = effectiveWeightAt((weightRows || []).map(row => ({ date: row.date, kg: Number(row.bodyweight) })), workoutDate, preferences?.initial_weight_kg);
      const completedSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
      const plannedSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
      const compoundSets = workout.exercises.filter(exercise => ['primary', 'compound'].includes(exercise.category)).reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
      const isolationSets = workout.exercises.filter(exercise => ['accessory', 'specialization', 'core'].includes(exercise.category)).reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
      const burnDuration = workout.durationMinutes || 0;
      const burnEstimate = estimateWorkoutEnergy({ durationMinutes: burnDuration + (workout.explicitPauseSeconds || 0) / 60, pausedSeconds: workout.explicitPauseSeconds || 0, completedSets, plannedSets, compoundSets, isolationSets, weightKg: weight.kg, hasActualFinish: !!workout.completedAt, intensityOverride: workoutIntensityOverride({ day_name: workout.day_name }) });

      const workoutPayload = {
        user_id: user.id,
        day: workout.day,
        day_name: workout.day_name,
        week_number: workout.week_number,
        date: workoutDate,
        workout_duration_minutes: workout.durationMinutes,
        started_at: workout.startedAt?.toISOString(),
        completed_at: workout.completedAt?.toISOString(),
        explicit_pause_seconds: workout.explicitPauseSeconds || 0,
        energy_model_version: ENERGY_MODEL_VERSION,
        estimated_net_kcal: burnEstimate.netKcal,
        energy_confidence: burnEstimate.confidence,
        energy_inputs: { effectiveWeightKg: weight.kg, weightSource: weight.source, intensity: burnEstimate.intensity, met: burnEstimate.met, completedSets, plannedSets, compoundSets, isolationSets },
      };

      // Build exercise rows
      const exerciseRows = workout.exercises.flatMap((ex, exIdx) => {
        const completedSets = ex.sets.filter(set => set.completed);
        if (completedSets.length === 0) return [];
        return completedSets.map((set, setIdx) => ({
          name: `${ex.name} (Set ${set.setNumber})`,
          category: ex.category,
          target_weight: set.targetWeight,
          target_reps: ex.exerciseType === 'timed' ? String(set.targetTime || set.targetReps) : set.targetReps,
          actual_weight: set.actualWeight,
          actual_reps: ex.exerciseType === 'timed' ? String(set.actualTime || set.actualReps) : set.actualReps,
          completed: set.completed,
          sort_order: exIdx * 100 + setIdx,
        }));
      });

      const habitsPayload = workout.habits ? {
        pullups: workout.habits.pullups,
        water_intake: workout.habits.water_intake,
        sleep_hours: workout.habits.sleep_hours,
        bodyweight: workout.habits.bodyweight,
        notes: workout.habits.notes,
      } : null;
      const burnCalories = Math.round(burnEstimate.netKcal);

      const rollbackWorkout = async (workoutId: string, originalError: unknown) => {
        const { error: rollbackError } = await supabase.from('workouts').delete().eq('id', workoutId);
        if (rollbackError) {
          console.error('[useWorkouts] rollback failed after incomplete workout save', rollbackError);
        }
        throw originalError;
      };

      try {
        // Try online first
        const { data: workoutData, error: workoutError } = await (supabase
          .from('workouts') as any)
          .insert(workoutPayload)
          .select()
          .single();

        if (workoutError) throw workoutError;

        if (exerciseRows.length > 0) {
          const { error: exercisesError } = await supabase
            .from('exercises')
            .insert(exerciseRows.map(r => ({ ...r, workout_id: workoutData.id })));
          if (exercisesError) await rollbackWorkout(workoutData.id, exercisesError);
        }

        if (habitsPayload) {
          const { error: habitsError } = await supabase
            .from('habits')
            .insert({ workout_id: workoutData.id, ...habitsPayload });
          if (habitsError) await rollbackWorkout(workoutData.id, habitsError);
        }

        if (workout.pauseIntervals?.length) {
          const { error: pausesError } = await (supabase.from('workout_pauses' as any) as any).insert(workout.pauseIntervals.map(interval => ({ user_id: user.id, workout_id: workoutData.id, paused_at: interval.pausedAt, resumed_at: interval.resumedAt || workout.completedAt?.toISOString() || null })));
          if (pausesError) await rollbackWorkout(workoutData.id, pausesError);
        }

        if (burnCalories > 0) {
          const { error: burnError } = await (supabase
            .from('calorie_burns') as any)
            .upsert({
              user_id: user.id,
              date: workoutDate,
              source: 'workout',
              activity_type: `workout:${workoutData.id}`,
              duration_minutes: burnDuration,
              calories: burnCalories,
              intensity_band: burnEstimate.intensity,
              intensity_source: 'workout_structure',
              met_estimate: burnEstimate.met,
              effective_weight_kg: weight.kg,
              confidence: burnEstimate.confidence,
              energy_model_version: ENERGY_MODEL_VERSION,
              calculation_inputs: workoutPayload.energy_inputs,
          }, { onConflict: 'user_id,date,source,activity_type' });
          if (burnError) await rollbackWorkout(workoutData.id, burnError);
        }

        return workoutData;
      } catch (error: any) {
        // If offline or network failure, queue for background sync
        const isNetworkError = !navigator.onLine ||
          error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('ERR_INTERNET_DISCONNECTED');

        if (isNetworkError) {
          console.log('[OfflineSync] Network unavailable, queuing workout');
          const groupId = crypto.randomUUID();
          const tempWorkoutId = crypto.randomUUID();

          await enqueueOperation({
            table: 'workouts',
            operation: 'insert',
            payload: { id: tempWorkoutId, ...workoutPayload },
            groupId,
            groupOrder: 0,
          });

          if (exerciseRows.length > 0) {
            for (let i = 0; i < exerciseRows.length; i++) {
              await enqueueOperation({
                table: 'exercises',
                operation: 'insert',
                payload: { workout_id: tempWorkoutId, ...exerciseRows[i] },
                groupId,
                groupOrder: i + 1,
              });
            }
          }

          if (habitsPayload) {
            await enqueueOperation({
              table: 'habits',
              operation: 'insert',
              payload: { workout_id: tempWorkoutId, ...habitsPayload },
              groupId,
              groupOrder: exerciseRows.length + 1,
            });
          }


          if (workout.pauseIntervals?.length) {
            for (let i = 0; i < workout.pauseIntervals.length; i++) {
              await enqueueOperation({ table: 'workout_pauses', operation: 'insert', payload: { user_id: user.id, workout_id: tempWorkoutId, paused_at: workout.pauseIntervals[i].pausedAt, resumed_at: workout.pauseIntervals[i].resumedAt || workout.completedAt?.toISOString() || null }, groupId, groupOrder: exerciseRows.length + (habitsPayload ? 2 : 1) + i });
            }
          }

          if (burnCalories > 0) {
            await enqueueOperation({
              table: 'calorie_burns',
              operation: 'insert',
              payload: {
                user_id: user.id,
                date: workoutDate,
                source: 'workout',
                activity_type: `workout:${tempWorkoutId}`,
                duration_minutes: burnDuration,
                calories: burnCalories,
                intensity_band: burnEstimate.intensity,
                intensity_source: 'workout_structure',
                met_estimate: burnEstimate.met,
                effective_weight_kg: weight.kg,
                confidence: burnEstimate.confidence,
                energy_model_version: ENERGY_MODEL_VERSION,
                calculation_inputs: workoutPayload.energy_inputs,
              },
              groupId,
              groupOrder: exerciseRows.length + (habitsPayload ? 2 : 1) + (workout.pauseIntervals?.length || 0),
            });
          }

          // Return a fake result so the UI flow continues
          return { id: tempWorkoutId, ...workoutPayload } as any;
        }

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['habitsData'] });
      // 'exerciseSets' is the one real query key behind volume charts,
      // exercise progression, and muscle balance — the 'volumeData'/
      // 'exerciseProgression' names this used to invalidate read like
      // plausible query keys but match no actual useQuery anywhere in the
      // app, so those charts weren't reactively refreshing on a new/deleted
      // workout at all.
      queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
      // 5-minute staleTime, never invalidated elsewhere — without this, "last
      // used" prefills and next-session progression suggestions could show
      // pre-this-workout numbers for up to 5 minutes after logging.
      queryClient.invalidateQueries({ queryKey: ['lastUsedWeights'] });
      queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
      queryClient.invalidateQueries({ queryKey: ['workout-with-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
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
      queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
      queryClient.invalidateQueries({ queryKey: ['workout-with-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('calorie_burns')
        .delete()
        .eq('user_id', user.id)
        .eq('source', 'workout')
        .eq('activity_type', `workout:${workoutId}`);

      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['habitsData'] });
      // 'exerciseSets' is the one real query key behind volume charts,
      // exercise progression, and muscle balance — the 'volumeData'/
      // 'exerciseProgression' names this used to invalidate read like
      // plausible query keys but match no actual useQuery anywhere in the
      // app, so those charts weren't reactively refreshing on a new/deleted
      // workout at all.
      queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
      // 5-minute staleTime, never invalidated elsewhere — without this, "last
      // used" prefills and next-session progression suggestions could show
      // pre-this-workout numbers for up to 5 minutes after logging.
      queryClient.invalidateQueries({ queryKey: ['lastUsedWeights'] });
      queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
      queryClient.invalidateQueries({ queryKey: ['workout-with-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
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
