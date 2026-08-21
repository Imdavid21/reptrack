import { effectiveWeightAt, ENERGY_MODEL_VERSION, estimateWorkoutEnergy } from '@/lib/energyEngineV3';
import { workoutIntensityOverride } from '@/lib/workoutCalories';
import { localDateKey } from '@/lib/dateKey';

const COMPOUND_CATEGORIES = ['primary', 'compound'];
const ISOLATION_CATEGORIES = ['accessory', 'specialization', 'core'];

export interface StoredExerciseRow {
  category: string | null;
  completed: boolean | null;
}

export interface SetCounts {
  completedSets: number;
  plannedSets: number;
  compoundSets: number;
  isolationSets: number;
}

/** Pure set-count summary used to re-estimate a workout's energy after history edits. */
export function summarizeSetCounts(rows: StoredExerciseRow[]): SetCounts {
  const normalized = rows.map(row => ({
    category: (row.category || '').toLowerCase(),
    completed: !!row.completed,
  }));
  return {
    completedSets: normalized.filter(r => r.completed).length,
    plannedSets: normalized.length,
    compoundSets: normalized.filter(r => r.completed && COMPOUND_CATEGORIES.includes(r.category)).length,
    isolationSets: normalized.filter(r => r.completed && ISOLATION_CATEGORIES.includes(r.category)).length,
  };
}

/**
 * Recalculates the workout's net burn from its current sets and keeps both
 * `workouts.estimated_net_kcal` and the linked `calorie_burns` row in sync, so
 * edits made from History immediately show up in Insights and daily totals.
 */
export async function syncWorkoutEnergy(
  supabase: any,
  params: { userId: string; workoutId: string; initialWeightKg?: number | null },
): Promise<number | null> {
  const { userId, workoutId } = params;

  const { data: workout } = await supabase
    .from('workouts')
    .select('id,date,day_name,workout_duration_minutes,explicit_pause_seconds,completed_at')
    .eq('id', workoutId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!workout) return null;

  const { data: rows } = await supabase
    .from('exercises')
    .select('category,completed')
    .eq('workout_id', workoutId);

  const counts = summarizeSetCounts((rows || []) as StoredExerciseRow[]);

  const windowStart = new Date(`${workout.date}T12:00:00`);
  windowStart.setDate(windowStart.getDate() - 30);
  const { data: weightRows } = await supabase
    .from('daily_metrics')
    .select('date,bodyweight')
    .eq('user_id', userId)
    .gte('date', localDateKey(windowStart))
    .lte('date', workout.date)
    .not('bodyweight', 'is', null)
    .order('date');

  const weight = effectiveWeightAt(
    (weightRows || []).map((row: any) => ({ date: row.date, kg: Number(row.bodyweight) })),
    workout.date,
    params.initialWeightKg,
  );

  const pausedSeconds = Number(workout.explicit_pause_seconds) || 0;
  const durationMinutes = Number(workout.workout_duration_minutes) || 0;
  const estimate = estimateWorkoutEnergy({
    durationMinutes: durationMinutes + pausedSeconds / 60,
    pausedSeconds,
    completedSets: counts.completedSets,
    plannedSets: counts.plannedSets,
    compoundSets: counts.compoundSets,
    isolationSets: counts.isolationSets,
    weightKg: weight.kg,
    hasActualFinish: !!workout.completed_at,
    intensityOverride: workoutIntensityOverride({ day_name: workout.day_name }),
  });

  const energyInputs = {
    effectiveWeightKg: weight.kg,
    weightSource: weight.source,
    intensity: estimate.intensity,
    met: estimate.met,
    ...counts,
  };

  await supabase
    .from('workouts')
    .update({
      energy_model_version: ENERGY_MODEL_VERSION,
      estimated_net_kcal: estimate.netKcal,
      energy_confidence: estimate.confidence,
      energy_inputs: energyInputs,
    })
    .eq('id', workoutId);

  const calories = Math.round(estimate.netKcal);
  const activityType = `workout:${workoutId}`;

  if (calories > 0) {
    await supabase.from('calorie_burns').upsert(
      {
        user_id: userId,
        date: workout.date,
        source: 'workout',
        activity_type: activityType,
        duration_minutes: durationMinutes,
        calories,
        intensity_band: estimate.intensity,
        intensity_source: 'workout_structure',
        met_estimate: estimate.met,
        effective_weight_kg: weight.kg,
        confidence: estimate.confidence,
        energy_model_version: ENERGY_MODEL_VERSION,
        calculation_inputs: energyInputs,
      },
      { onConflict: 'user_id,date,source,activity_type' },
    );
  } else {
    await supabase
      .from('calorie_burns')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'workout')
      .eq('activity_type', activityType);
  }

  return calories;
}
