/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Single source of truth for "how many active kcal did this day contain".
 *
 * Home (useEnergyModel) and History/Insights (useCalorieHistory) used to
 * answer this question differently: the dashboard recomputed every workout
 * and activity with V3 net-of-rest math, while history read the stored
 * `calorie_burns.calories` column verbatim - which for every pre-V3 row is a
 * gross MET figure that includes resting expenditure. The same walk could
 * therefore read 92 kcal on one screen and 130 kcal on another.
 *
 * Both now call into this module, so the two screens agree by construction.
 * Stored `calories` is only trusted for burn sources this engine cannot
 * model (anything that is neither a workout nor a recognised manual
 * activity), where there is nothing better to fall back on.
 */
import {
  ActivityObservation,
  EffectiveWeight,
  EnergyConfidence,
  estimateActivity,
  estimateWorkoutEnergy,
} from './energyEngineV3';
import { workoutIntensityOverride } from './workoutCalories';

export type ActivityCategory = 'workout' | 'walking' | 'running' | 'cycling' | 'boxing' | 'other';

export interface DayActivityCategories {
  workout: number;
  walking: number;
  running: number;
  cycling: number;
  boxing: number;
  other: number;
}

export interface DayActivityResult {
  categories: DayActivityCategories;
  total: number;
  confidences: EnergyConfidence[];
}

export const emptyCategories = (): DayActivityCategories => ({
  workout: 0, walking: 0, running: 0, cycling: 0, boxing: 0, other: 0,
});

/**
 * Active minutes for a workout. When both timestamps exist the elapsed span
 * is authoritative and explicit pauses are subtracted downstream; legacy
 * `workout_duration_minutes` is already active time, so no pause is removed
 * from it a second time.
 */
export function timingFromWorkout(workout: any): { elapsedMinutes: number; pausedSeconds: number } {
  const start = workout.started_at ? new Date(workout.started_at).getTime() : NaN;
  const finish = workout.completed_at ? new Date(workout.completed_at).getTime() : NaN;
  if (Number.isFinite(start) && Number.isFinite(finish)) {
    return { elapsedMinutes: Math.max(0, (finish - start) / 60000), pausedSeconds: Number(workout.explicit_pause_seconds) || 0 };
  }
  return { elapsedMinutes: Math.max(0, Number(workout.workout_duration_minutes) || 0), pausedSeconds: 0 };
}

/** Net kcal above rest for one workout row. */
export function workoutNetKcal(workout: any, weightKg: number): number {
  const rows = workout.exercises || [];
  const completed = rows.filter((exercise: any) => exercise.completed !== false);
  const compound = completed.filter((exercise: any) => ['primary', 'compound'].includes(String(exercise.category).toLowerCase())).length;
  const isolation = completed.filter((exercise: any) => ['accessory', 'specialization', 'core'].includes(String(exercise.category).toLowerCase())).length;
  const timing = timingFromWorkout(workout);
  return estimateWorkoutEnergy({
    durationMinutes: timing.elapsedMinutes,
    pausedSeconds: timing.pausedSeconds,
    completedSets: completed.length,
    plannedSets: rows.length,
    compoundSets: compound,
    isolationSets: isolation,
    weightKg,
    hasActualFinish: !!workout.completed_at,
    intensityOverride: workoutIntensityOverride({ day_name: workout.day_name }),
  }).netKcal;
}

/**
 * A workout counts toward the day only once it is genuinely finished and not
 * skipped - an in-progress session has no trustworthy duration yet.
 */
export function isCountableWorkout(workout: any): boolean {
  return !workout.is_skipped && !!workout.completed_at;
}

/**
 * Recompute a single day's deliberate activity from raw rows.
 *
 * `burns` should be that day's `calorie_burns` rows and `workouts` that day's
 * `workouts` rows. Burn rows with `source === 'workout'` are ignored on
 * purpose: they are a persisted cache of the workout estimate, and counting
 * both them and the workout itself would double the session.
 */
export function estimateDayActivity({
  date,
  workouts = [],
  burns = [],
  weight,
  history = [],
}: {
  date: string;
  workouts?: any[];
  burns?: any[];
  weight: EffectiveWeight | number;
  history?: ActivityObservation[];
}): DayActivityResult {
  const categories = emptyCategories();
  const confidences: EnergyConfidence[] = [];
  const weightKg = typeof weight === 'number' ? weight : weight.kg;

  workouts.filter(isCountableWorkout).forEach(workout => {
    categories.workout += workoutNetKcal(workout, weightKg);
    confidences.push('medium');
  });

  burns.filter(burn => burn.source !== 'workout').forEach(burn => {
    const kind = ['walking', 'running', 'cycling', 'boxing'].includes(burn.activity_type) ? burn.activity_type : 'other';
    if (burn.source === 'manual' && Number(burn.duration_minutes) > 0) {
      const estimate = estimateActivity({
        kind,
        date,
        weight,
        distanceKm: burn.distance_km,
        durationMinutes: burn.duration_minutes,
        history,
      });
      categories[kind as keyof DayActivityCategories] += estimate.netKcal;
      confidences.push(estimate.confidence);
    } else {
      // Nothing to recompute from (no duration, or a source this engine does
      // not model) - the stored figure is the only number available.
      categories.other += Math.max(0, Number(burn.calories) || 0);
      confidences.push('low');
    }
  });

  return { categories, total: Object.values(categories).reduce((sum, value) => sum + value, 0), confidences };
}
