/**
 * Compatibility boundary for workout energy estimates.
 *
 * Energy Engine V3 deliberately does not infer intensity from "Push", "Pull",
 * or "Legs". Session structure and actual completion determine a broad band.
 */
import { estimateWorkoutEnergy } from './energyEngineV3';
import type { WorkoutIntensity } from './energyEngineV3';

export interface WorkoutForMet {
  day?: string | null;
  day_name?: string | null;
  exercises?: { category: string; completed?: boolean }[];
  plannedSets?: number;
  pausedSeconds?: number;
}

export function workoutIntensityOverride(workout: WorkoutForMet): WorkoutIntensity | undefined {
  const name = String(workout.day_name || '').toLowerCase();
  if (/cindy|annie|chelsea|bodyweight emom/.test(name)) return 'vigorous';
  if (/mobility|recovery/.test(name)) return 'light';
  return undefined;
}

export function getWorkoutMetCategory(workout: WorkoutForMet): 'light' | 'normal' | 'vigorous' {
  const rows = (workout.exercises || []).filter(row => row.completed !== false);
  const compounds = rows.filter(row => ['primary', 'compound'].includes(String(row.category).toLowerCase())).length;
  return estimateWorkoutEnergy({ durationMinutes: 60, completedSets: rows.length, plannedSets: workout.plannedSets || rows.length, compoundSets: compounds, weightKg: 70, intensityOverride: workoutIntensityOverride(workout) }).intensity;
}

export function getWorkoutMet(workout: WorkoutForMet, durationMinutes = 60): number {
  const rows = (workout.exercises || []).filter(row => row.completed !== false);
  const compounds = rows.filter(row => ['primary', 'compound'].includes(String(row.category).toLowerCase())).length;
  return estimateWorkoutEnergy({ durationMinutes, pausedSeconds: workout.pausedSeconds, completedSets: rows.length, plannedSets: workout.plannedSets || rows.length, compoundSets: compounds, weightKg: 70, intensityOverride: workoutIntensityOverride(workout) }).met;
}

export function calculateWorkoutCalories(workout: WorkoutForMet, weightKg: number, durationMinutes: number): number {
  const rows = (workout.exercises || []).filter(row => row.completed !== false);
  const compounds = rows.filter(row => ['primary', 'compound'].includes(String(row.category).toLowerCase())).length;
  const isolation = rows.filter(row => ['accessory', 'specialization', 'core'].includes(String(row.category).toLowerCase())).length;
  return Math.round(estimateWorkoutEnergy({ durationMinutes, pausedSeconds: workout.pausedSeconds, completedSets: rows.length, plannedSets: workout.plannedSets || rows.length, compoundSets: compounds, isolationSets: isolation, weightKg, hasActualFinish: durationMinutes > 0, intensityOverride: workoutIntensityOverride(workout) }).netKcal);
}

/**
 * Legacy callers pass a real smoothed measurement first and the profile's
 * initial measured weight second. Goal weight is intentionally not accepted
 * as physiological state by V3.
 */
export function resolveBodyweightKg(
  smoothedBodyweightKg: number | null | undefined,
  profileInitialWeightKg: number | null | undefined,
  temporaryFallbackKg = 70,
): number {
  return Number(smoothedBodyweightKg) > 0 ? Number(smoothedBodyweightKg)
    : Number(profileInitialWeightKg) > 0 ? Number(profileInitialWeightKg)
      : temporaryFallbackKg;
}
