import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { enqueueOperation } from '@/lib/offlineSyncQueue';
import { localDateKey } from '@/lib/dateKey';
import { effectiveWeightAt, ENERGY_MODEL_VERSION, estimateWorkoutEnergy } from '@/lib/energyEngineV3';
import { workoutIntensityOverride } from '@/lib/workoutCalories';
import type { ExerciseType } from '@/lib/exerciseLibrary';

export interface ExerciseSet { setNumber: number; targetWeight: string; targetReps: string; actualWeight: string; actualReps: string; targetTime?: number; actualTime?: number; completed: boolean; }
export interface WorkoutExercise { id?: string; name: string; category: string; sets: ExerciseSet[]; sort_order: number; exerciseType?: ExerciseType; restSeconds?: number; rir?: string; mandatory?: boolean; progression?: string; }
export interface Habits { pullups: number; water_intake: number; sleep_hours: number; bodyweight?: number; notes?: string; }
export interface Workout { id: string; user_id: string; date: string; day: string; day_name: string; week_number: number; created_at: string; started_at?: string; completed_at?: string; workout_duration_minutes?: number; estimated_net_kcal?: number | null; exercises?: WorkoutExercise[]; habits?: Habits; }

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
      const { data: workouts, error } = await supabase.from('workouts').select('*').eq('user_id', user.id).order('date', { ascending: false });
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
      const { data: weightRows, error: weightError } = await supabase.from('daily_metrics').select('date,bodyweight').eq('user_id', user.id).gte('date', localDateKey(weightWindowStart)).lte('date', workoutDate).not('bodyweight', 'is', null).order('date');
      if (weightError && navigator.onLine) console.warn('[useWorkouts] bodyweight lookup failed, using profile fallback', weightError);
      const weight = effectiveWeightAt((weightRows || []).map(row => ({ date: row.date, kg: Number(row.bodyweight) })), workoutDate, preferences?.initial_weight_kg);
      const completedSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
      const plannedSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
      const compoundSets = workout.exercises.filter(exercise => ['primary', 'compound'].includes(exercise.category)).reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
      const isolationSets = workout.exercises.filter(exercise => ['accessory', 'specialization', 'core'].includes(exercise.category)).reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
      const burnDuration = workout.durationMinutes || 0;
      const burnEstimate = estimateWorkoutEnergy({ durationMinutes: burnDuration + (workout.explicitPauseSeconds || 0) / 60, pausedSeconds: workout.explicitPauseSeconds || 0, completedSets, plannedSets, compoundSets, isolationSets, weightKg: weight.kg, hasActualFinish: !!workout.completedAt, intensityOverride: workoutIntensityOverride({ day_name: workout.day_name }) });

      const workoutPayload = {
        id: workoutId, user_id: user.id, day: workout.day, day_name: workout.day_name, week_number: workout.week_number, date: workoutDate,
        workout_duration_minutes: workout.durationMinutes, started_at: workout.startedAt?.toISOString(), completed_at: workout.completedAt?.toISOString(), explicit_pause_seconds: workout.explicitPauseSeconds || 0,
        energy_model_version: ENERGY_MODEL_VERSION, estimated_net_kcal: burnEstimate.netKcal, energy_confidence: burnEstimate.confidence,
        energy_inputs: { effectiveWeightKg: weight.kg, weightSource: weight.source, intensity: burnEstimate.intensity, met: burnEstimate.met, completedSets, plannedSets, compoundSets, isolationSets },
      };

      const exerciseRows = workout.exercises.flatMap((ex, exIdx) => {
        const completed = ex.sets.filter(set => set.completed);
        return completed.map((set, setIdx) => ({
          name: `${ex.name} (Set ${set.setNumber})`, category: ex.category, target_weight: set.targetWeight,
          target_reps: ex.exerciseType === 'timed' ? String(set.targetTime || set.targetReps) : set.targetReps,
          actual_weight: set.actualWeight, actual_reps: ex.exerciseType === 'timed' ? String(set.actualTime || set.actualReps) : set.actualReps,
          completed: true, sort_order: exIdx * 100 + setIdx,
        }));
      });

      const habitsPayload = workout.habits ? { pullups: workout.habits.pullups, water_intake: workout.habits.water_intake, sleep_hours: workout.habits.sleep_hours, bodyweight: workout.habits.bodyweight, notes: workout.habits.notes } : null;
      const burnCalories = Math.round(burnEstimate.netKcal);
      const rollbackWorkout = async (id: string, originalError: unknown) => {
        const { error: rollbackError } = await supabase.from('workouts').delete().eq('id', id).eq('user_id', user.id);
        if (rollbackError) console.error('[useWorkouts] rollback failed after incomplete workout save', rollbackError);
        throw originalError;
      };

      try {
        let workoutData: any = null;
        let lastError: any = null;
        let adoptedExisting = false;
        for (let attempt = 0; attempt < 3 && !workoutData; attempt++) {
          if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 400 * attempt));
          const { data, error } = await (supabase.from('workouts') as any).insert(workoutPayload).select().single();
          if (!error) { workoutData = data; break; }
          if (error?.code === '23505') {
            const { data: existing, error: existingError } = await (supabase.from('workouts') as any).select('*').eq('id', workoutId).eq('user_id', user.id).maybeSingle();
            if (existingError) throw existingError;
            if (existing) { workoutData = existing; adoptedExisting = true; break; }
          }
          lastError = error;
          if (!isRetryableError(error)) break;
        }
        if (!workoutData) throw lastError || new Error('Workout could not be saved');

        if (exerciseRows.length > 0) {
          let setsAlreadyExist = false;
          if (adoptedExisting) {
            const { data: existingSets, error: existingSetsError } = await supabase.from('exercises').select('id').eq('workout_id', workoutData.id).limit(1);
            if (existingSetsError) throw existingSetsError;
            setsAlreadyExist = Boolean(existingSets?.length);
          }
          if (!setsAlreadyExist) {
            const { error: exercisesError } = await supabase.from('exercises').insert(exerciseRows.map(row => ({ ...row, workout_id: workoutData.id })));
            if (exercisesError) await rollbackWorkout(workoutData.id, exercisesError);
          }
        }

        if (habitsPayload) {
          const { error: habitsError } = await supabase.from('habits').insert({ workout_id: workoutData.id, ...habitsPayload });
          if (habitsError) {
            console.error('[useWorkouts] habits insert failed, queued for retry', habitsError);
            await enqueueOperation({ ownerUserId: user.id, table: 'habits', operation: 'insert', payload: { workout_id: workoutData.id, ...habitsPayload } }).catch(() => {});
          }
        }

        if (workout.pauseIntervals?.length) {
          const pauseRows = workout.pauseIntervals.map(interval => ({ user_id: user.id, workout_id: workoutData.id, paused_at: interval.pausedAt, resumed_at: interval.resumedAt || workout.completedAt?.toISOString() || null }));
          const { error: pausesError } = await (supabase.from('workout_pauses' as any) as any).insert(pauseRows);
          if (pausesError) {
            console.error('[useWorkouts] pause intervals insert failed, queued for retry', pausesError);
            for (const row of pauseRows) await enqueueOperation({ ownerUserId: user.id, table: 'workout_pauses', operation: 'insert', payload: row }).catch(() => {});
          }
        }

        if (burnCalories > 0) {
          const burnPayload = { user_id: user.id, date: workoutDate, source: 'workout', activity_type: `workout:${workoutData.id}`, duration_minutes: burnDuration, calories: burnCalories, intensity_band: burnEstimate.intensity, intensity_source: 'workout_structure', met_estimate: burnEstimate.met, effective_weight_kg: weight.kg, confidence: burnEstimate.confidence, energy_model_version: ENERGY_MODEL_VERSION, calculation_inputs: workoutPayload.energy_inputs };
          const { error: burnError } = await (supabase.from('calorie_burns') as any).upsert(burnPayload, { onConflict: 'user_id,date,source,activity_type' });
          if (burnError) {
            console.error('[useWorkouts] burn upsert failed, queued for retry', burnError);
            await enqueueOperation({ ownerUserId: user.id, table: 'calorie_burns', operation: 'insert', payload: burnPayload }).catch(() => {});
          }
        }

        return workoutData;
      } catch (error: any) {
        const isNetworkError = !navigator.onLine || error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError') || error?.message?.includes('ERR_INTERNET_DISCONNECTED');
        if (!isNetworkError) throw error;

        console.log('[OfflineSync] Network unavailable, queuing workout');
        const groupId = crypto.randomUUID();
        const tempWorkoutId = workoutId;
        await enqueueOperation({ ownerUserId: user.id, table: 'workouts', operation: 'insert', payload: { id: tempWorkoutId, ...workoutPayload }, groupId, groupOrder: 0 });
        for (let i = 0; i < exerciseRows.length; i++) await enqueueOperation({ ownerUserId: user.id, table: 'exercises', operation: 'insert', payload: { workout_id: tempWorkoutId, ...exerciseRows[i] }, groupId, groupOrder: i + 1 });
        if (habitsPayload) await enqueueOperation({ ownerUserId: user.id, table: 'habits', operation: 'insert', payload: { workout_id: tempWorkoutId, ...habitsPayload }, groupId, groupOrder: exerciseRows.length + 1 });
        if (workout.pauseIntervals?.length) {
          for (let i = 0; i < workout.pauseIntervals.length; i++) await enqueueOperation({ ownerUserId: user.id, table: 'workout_pauses', operation: 'insert', payload: { user_id: user.id, workout_id: tempWorkoutId, paused_at: workout.pauseIntervals[i].pausedAt, resumed_at: workout.pauseIntervals[i].resumedAt || workout.completedAt?.toISOString() || null }, groupId, groupOrder: exerciseRows.length + (habitsPayload ? 2 : 1) + i });
        }
        if (burnCalories > 0) {
          await enqueueOperation({ ownerUserId: user.id, table: 'calorie_burns', operation: 'insert', payload: { user_id: user.id, date: workoutDate, source: 'workout', activity_type: `workout:${tempWorkoutId}`, duration_minutes: burnDuration, calories: burnCalories, intensity_band: burnEstimate.intensity, intensity_source: 'workout_structure', met_estimate: burnEstimate.met, effective_weight_kg: weight.kg, confidence: burnEstimate.confidence, energy_model_version: ENERGY_MODEL_VERSION, calculation_inputs: workoutPayload.energy_inputs }, groupId, groupOrder: exerciseRows.length + (habitsPayload ? 2 : 1) + (workout.pauseIntervals?.length || 0) });
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

      const { data, error } = await supabase.from('workouts').update(patch).eq('id', workout.id).eq('user_id', user.id).select().single();
      if (error) throw error;

      if (workout.workout_duration_minutes !== undefined || workout.date !== undefined) {
        const { data: burn, error: burnLookupError } = await supabase.from('calorie_burns').select('id,duration_minutes,calories').eq('user_id', user.id).eq('source', 'workout').eq('activity_type', `workout:${workout.id}`).maybeSingle();
        if (burnLookupError) console.error('[useWorkouts] linked burn lookup failed after workout update', burnLookupError);
        if (burn) {
          const burnPatch: Record<string, any> = {};
          if (workout.date !== undefined) burnPatch.date = workout.date;
          if (workout.workout_duration_minutes !== undefined) {
            const oldDuration = Number(burn.duration_minutes) || 0;
            const newDuration = Number(workout.workout_duration_minutes) || 0;
            burnPatch.duration_minutes = newDuration;
            if (oldDuration > 0 && newDuration > 0) burnPatch.calories = Math.round((Number(burn.calories) || 0) * (newDuration / oldDuration));
          }
          const { error: burnUpdateError } = await supabase.from('calorie_burns').update(burnPatch).eq('id', burn.id).eq('user_id', user.id);
          if (burnUpdateError) {
            console.error('[useWorkouts] linked burn update failed, queued for retry', burnUpdateError);
            await enqueueOperation({ ownerUserId: user.id, table: 'calorie_burns', operation: 'update', payload: { id: burn.id, user_id: user.id, ...burnPatch } }).catch(() => {});
          }
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

      const { data: linkedBurn, error: burnLookupError } = await supabase.from('calorie_burns').select('id').eq('user_id', user.id).eq('source', 'workout').eq('activity_type', `workout:${workoutId}`).maybeSingle();
      if (burnLookupError) throw burnLookupError;

      const { error } = await supabase.from('workouts').delete().eq('id', workoutId).eq('user_id', user.id);
      if (error) throw error;

      if (linkedBurn) {
        const { error: burnDeleteError } = await supabase.from('calorie_burns').delete().eq('id', linkedBurn.id).eq('user_id', user.id);
        if (burnDeleteError) {
          console.error('[useWorkouts] linked burn cleanup failed, queued for retry', burnDeleteError);
          await enqueueOperation({ ownerUserId: user.id, table: 'calorie_burns', operation: 'delete', payload: { id: linkedBurn.id, user_id: user.id } }).catch(() => {});
        }
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

  return {
    workouts: workoutsQuery.data ?? [], isLoading: workoutsQuery.isLoading, error: workoutsQuery.error,
    createWorkout: createWorkoutMutation.mutateAsync, isCreating: createWorkoutMutation.isPending,
    updateWorkout: updateWorkoutMutation.mutateAsync, deleteWorkout: deleteWorkoutMutation.mutateAsync,
  };
}
