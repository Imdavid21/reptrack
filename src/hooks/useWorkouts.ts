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
  targetTime?: number;
  actualTime?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id?: string;
  name: string;
  category: string;
  sets: ExerciseSet[];
  sort_order: number;
  exerciseType?: ExerciseType;
  restSeconds?: number;
  rir?: string;
  mandatory?: boolean;
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

export function isRetryableError(error: any): boolean {
  if (!error) return false;
  const message = String(error?.message || '');
  if (/Failed to fetch|NetworkError|timeout|ETIMEDOUT|ERR_INTERNET_DISCONNECTED/i.test(message)) return true;
  const code = String(error?.code || '');
  return code === '' || /^5\d\d$/.test(code) || code === '57014' || code === '08006';
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
      clientId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const workoutId = workout.clientId || crypto.randomUUID();
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
        id: workoutId,
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

      const exerciseRows = workout.exercises.flatMap((ex, exIdx) => {
        const completed = ex.sets.filter(set => set.completed);
        if (completed.length === 0) return [];
        return completed.map((set, setIdx) => ({
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
      const burnPayload = {
        user_id: user.id,
        date: workoutDate,
        source: 'workout',
        activity_type: `workout:${workoutId}`,
        duration_minutes: burnDuration,
        calories: burnCalories,
        started_at: workout.startedAt?.toISOString() || null,
        ended_at: workout.completedAt?.toISOString() || null,
        intensity_band: burnEstimate.intensity,
        intensity_source: 'workout_structure',
        met_estimate: burnEstimate.met,
        effective_weight_kg: weight.kg,
        confidence: burnEstimate.confidence,
        energy_model_version: ENERGY_MODEL_VERSION,
        calculation_inputs: { ...workoutPayload.energy_inputs, eventTimeSource: workout.startedAt ? 'workout_session' : 'legacy_unknown' },
      };

      const rollbackWorkout = async (id: string, originalError: unknown) => {
        const { error: rollbackError } = await supabase.from('workouts').delete().eq('id', id);
        if (rollbackError) console.error('[useWorkouts] rollback failed after incomplete workout save', rollbackError);
        throw originalError;
      };

      try {
        let workoutData: any = null;
        let lastError: any = null;
        for (let attempt = 0; attempt < 3 && !workoutData; attempt++) {
          if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 400 * attempt));
          const { data, error } = await (supabase.from('workouts') as any).insert(workoutPayload).select().single();
          if (!error) { workoutData = data; break; }
          if (error?.code === '23505') {
            const { data: existing } = await (supabase.from('workouts') as any).select('*').eq('id', workoutId).maybeSingle();
            if (existing) { workoutData = existing; break; }
          }
          lastError = error;
          if (!isRetryableError(error)) break;
        }
        if (!workoutData) throw lastError || new Error('Workout could not be saved');

        if (exerciseRows.length > 0) {
          const { data: existingSets } = await supabase.from('exercises').select('id').eq('workout_id', workoutData.id).limit(1);
          if (!existingSets?.length) {
            const { error: exercisesError } = await supabase.from('exercises').insert(exerciseRows.map(r => ({ ...r, workout_id: workoutData.id })));
            if (exercisesError) await rollbackWorkout(workoutData.id, exercisesError);
          }
        }

        if (habitsPayload) {
          const { error: habitsError } = await supabase.from('habits').insert({ workout_id: workoutData.id, ...habitsPayload });
          if (habitsError) {
            console.error('[useWorkouts] habits insert failed, queued for retry', habitsError);
            await enqueueOperation({ table: 'habits', operation: 'insert', payload: { workout_id: workoutData.id, ...habitsPayload } }).catch(() => {});
          }
        }

        if (workout.pauseIntervals?.length) {
          const { error: pausesError } = await (supabase.from('workout_pauses' as any) as any).insert(workout.pauseIntervals.map(interval => ({ user_id: user.id, workout_id: workoutData.id, paused_at: interval.pausedAt, resumed_at: interval.resumedAt || workout.completedAt?.toISOString() || null })));
          if (pausesError) console.error('[useWorkouts] pause intervals insert failed', pausesError);
        }

        if (burnCalories > 0) {
          const resolvedBurnPayload = { ...burnPayload, activity_type: `workout:${workoutData.id}` };
          const { error: burnError } = await (supabase.from('calorie_burns') as any).upsert(resolvedBurnPayload, { onConflict: 'user_id,date,source,activity_type' });
          if (burnError) {
            console.error('[useWorkouts] burn upsert failed, queued for retry', burnError);
            await enqueueOperation({ table: 'calorie_burns', operation: 'insert', payload: resolvedBurnPayload }).catch(() => {});
          }
        }

        return workoutData;
      } catch (error: any) {
        const isNetworkError = !navigator.onLine || error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError') || error?.message?.includes('ERR_INTERNET_DISCONNECTED');
        if (!isNetworkError) throw error;

        console.log('[OfflineSync] Network unavailable, queuing workout');
        const groupId = crypto.randomUUID();
        const tempWorkoutId = workoutId;
        await enqueueOperation({ table: 'workouts', operation: 'insert', payload: { id: tempWorkoutId, ...workoutPayload }, groupId, groupOrder: 0 });

        if (exerciseRows.length > 0) {
          for (let i = 0; i < exerciseRows.length; i++) {
            await enqueueOperation({ table: 'exercises', operation: 'insert', payload: { workout_id: tempWorkoutId, ...exerciseRows[i] }, groupId, groupOrder: i + 1 });
          }
        }
        if (habitsPayload) {
          await enqueueOperation({ table: 'habits', operation: 'insert', payload: { workout_id: tempWorkoutId, ...habitsPayload }, groupId, groupOrder: exerciseRows.length + 1 });
        }
        if (workout.pauseIntervals?.length) {
          for (let i = 0; i < workout.pauseIntervals.length; i++) {
            await enqueueOperation({ table: 'workout_pauses', operation: 'insert', payload: { user_id: user.id, workout_id: tempWorkoutId, paused_at: workout.pauseIntervals[i].pausedAt, resumed_at: workout.pauseIntervals[i].resumedAt || workout.completedAt?.toISOString() || null }, groupId, groupOrder: exerciseRows.length + (habitsPayload ? 2 : 1) + i });
          }
        }
        if (burnCalories > 0) {
          await enqueueOperation({ table: 'calorie_burns', operation: 'insert', payload: burnPayload, groupId, groupOrder: exerciseRows.length + (habitsPayload ? 2 : 1) + (workout.pauseIntervals?.length || 0) });
        }
        return { id: tempWorkoutId, ...workoutPayload } as any;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['habitsData'] });
      queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
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
      const patch: Record<string, any> = {};
      if ((workout as any).is_skipped !== undefined) patch.is_skipped = (workout as any).is_skipped;
      if ((workout as any).notes !== undefined) patch.notes = (workout as any).notes;
      if (workout.date !== undefined) patch.date = workout.date;
      if (workout.started_at !== undefined) patch.started_at = workout.started_at;
      if (workout.completed_at !== undefined) patch.completed_at = workout.completed_at;
      if (workout.workout_duration_minutes !== undefined) patch.workout_duration_minutes = workout.workout_duration_minutes;

      const { data, error } = await supabase.from('workouts').update(patch).eq('id', workout.id).select().single();
      if (error) throw error;

      if (workout.workout_duration_minutes !== undefined || workout.date !== undefined || workout.started_at !== undefined || workout.completed_at !== undefined) {
        const { data: burn } = await (supabase.from('calorie_burns') as any)
          .select('id,duration_minutes,calories')
          .eq('user_id', user.id)
          .eq('source', 'workout')
          .eq('activity_type', `workout:${workout.id}`)
          .maybeSingle();

        if (burn) {
          const burnPatch: Record<string, any> = {};
          if (workout.date !== undefined) burnPatch.date = workout.date;
          if (workout.started_at !== undefined) burnPatch.started_at = workout.started_at;
          if (workout.completed_at !== undefined) burnPatch.ended_at = workout.completed_at;
          if (workout.workout_duration_minutes !== undefined) {
            const oldDuration = Number(burn.duration_minutes) || 0;
            const newDuration = Number(workout.workout_duration_minutes) || 0;
            burnPatch.duration_minutes = newDuration;
            if (oldDuration > 0 && newDuration > 0) burnPatch.calories = Math.round((Number(burn.calories) || 0) * (newDuration / oldDuration));
          }
          await (supabase.from('calorie_burns') as any).update(burnPatch).eq('id', burn.id);
        }
      }
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
      await supabase.from('calorie_burns').delete().eq('user_id', user.id).eq('source', 'workout').eq('activity_type', `workout:${workoutId}`);
      const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['habitsData'] });
      queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
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
