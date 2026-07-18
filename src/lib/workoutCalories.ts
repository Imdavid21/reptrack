/**
 * Single source of truth for workout calorie-burn math. Previously this MET
 * table and the day-name-to-category logic were independently copy-pasted
 * across useWorkouts.ts, useCalorieBurn.ts, and useCalorieHistory.ts, and
 * had drifted: none of the three copies matched "Lower" (Upper/Lower split
 * leg days), so those days silently got the generic MET instead of the legs
 * one. Import from here instead of re-deriving this anywhere else.
 */

/** MET (Metabolic Equivalent of Task) values per workout movement pattern. */
export const WORKOUT_MET_VALUES: Record<string, number> = {
  push: 5.0,
  pull: 5.0,
  legs: 6.0,
  accessory: 4.0,
  strength: 5.0, // generic/full-body fallback
};

export interface WorkoutForMet {
  day?: string | null;
  day_name?: string | null;
  exercises?: { category: string }[];
}

/**
 * Derive the MET lookup category for a workout. Day text is checked first
 * (push/pull/legs/arm+accessory) since it's the reliable signal; falls back
 * to the majority exercise.category only when the day name says nothing
 * (Full Body / custom splits) — exercise.category is the training-role enum
 * ('primary'/'accessory'/'warmup'), so the majority is almost always
 * 'primary', which isn't a MET key on its own.
 *
 * Matches both "leg" and "lower" — Upper/Lower split day names ("Lower A"/
 * "Lower B") are leg days and don't contain the substring "leg".
 */
export function getWorkoutMetCategory(workout: WorkoutForMet): string {
  const text = `${workout.day || ''} ${workout.day_name || ''}`.toLowerCase();
  if (text.includes('push')) return 'push';
  if (text.includes('pull')) return 'pull';
  if (text.includes('leg') || text.includes('lower')) return 'legs';
  if (text.includes('arm') || text.includes('accessory')) return 'accessory';

  const exercises = workout.exercises || [];
  if (exercises.length > 0) {
    const categoryCounts: Record<string, number> = {};
    exercises.forEach(ex => {
      const cat = (ex.category || '').toLowerCase();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const top = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top === 'accessory') return 'accessory';
  }
  return 'strength';
}

export function getWorkoutMet(workout: WorkoutForMet): number {
  return WORKOUT_MET_VALUES[getWorkoutMetCategory(workout)] ?? 5.0;
}

/** Calories = MET × bodyweight(kg) × duration(hours). */
export function calculateWorkoutCalories(
  workout: WorkoutForMet,
  weightKg: number,
  durationMinutes: number
): number {
  if (!durationMinutes || durationMinutes <= 0) return 0;
  return Math.round(getWorkoutMet(workout) * weightKg * (durationMinutes / 60));
}

/**
 * Resolve the bodyweight (kg) to use for calorie-burn math: prefer a real
 * logged average from daily_metrics, then the user's weight_goal (a target
 * weight, not their actual one — worse than a real weigh-in, better than a
 * population-average guess), then a population-average default.
 *
 * Single source of truth for this fallback chain — useWorkouts.ts previously
 * skipped straight to weight_goal with no daily_metrics lookup at all, which
 * meant the persisted calorie_burns row for nearly every workout was
 * computed against a target weight instead of the user's real one.
 */
export function resolveBodyweightKg(
  avgLoggedBodyweightKg: number | null | undefined,
  weightGoalKg: number | null | undefined,
  fallbackKg = 70
): number {
  return avgLoggedBodyweightKg || weightGoalKg || fallbackKg;
}
