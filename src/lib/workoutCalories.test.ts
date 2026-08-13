import { describe, expect, it } from 'vitest';
import {
  calculateWorkoutCalories,
  getWorkoutMet,
  getWorkoutMetCategory,
  resolveBodyweightKg,
} from './workoutCalories';

const completed = (category: string, count: number) =>
  Array.from({ length: count }, () => ({ category, completed: true }));

describe('workout energy compatibility boundary', () => {
  it('does not infer intensity from the workout name', () => {
    expect(getWorkoutMetCategory({ day_name: 'Push A' })).toBe('light');
    expect(getWorkoutMetCategory({ day_name: 'Legs A' })).toBe('light');
    expect(getWorkoutMet({ day_name: 'Push A' })).toBe(getWorkoutMet({ day_name: 'Legs A' }));
  });

  it('uses completed session structure to choose a broad intensity band', () => {
    expect(getWorkoutMetCategory({
      day_name: 'Anything',
      exercises: [...completed('primary', 8), ...completed('accessory', 5)],
      plannedSets: 13,
    })).toBe('normal');
  });

  it('treats named conditioning sessions as vigorous and mobility as light', () => {
    expect(getWorkoutMetCategory({ day_name: 'Cindy' })).toBe('vigorous');
    expect(getWorkoutMetCategory({ day_name: 'Chelsea' })).toBe('vigorous');
    expect(getWorkoutMetCategory({ day_name: 'Mobility' })).toBe('light');
    expect(calculateWorkoutCalories({ day_name: 'Cindy', exercises: completed('compound', 5), plannedSets: 20 }, 75, 20))
      .toBeGreaterThan(calculateWorkoutCalories({ day_name: 'Push A', exercises: completed('compound', 5), plannedSets: 20 }, 75, 20));
  });

  it('keeps a one-minute partial workout small', () => {
    expect(calculateWorkoutCalories({
      exercises: completed('primary', 1),
      plannedSets: 12,
    }, 70, 1)).toBeLessThan(8);
  });

  it('scales with real elapsed time and completed work', () => {
    const workout = {
      exercises: [...completed('primary', 8), ...completed('accessory', 4)],
      plannedSets: 12,
    };
    const short = calculateWorkoutCalories(workout, 75, 30);
    const long = calculateWorkoutCalories(workout, 75, 60);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThan(short * 2.1);
  });

  it('subtracts explicit pauses from active energy time', () => {
    const workout = {
      exercises: [...completed('primary', 8), ...completed('accessory', 4)],
      plannedSets: 12,
    };
    const continuous = calculateWorkoutCalories(workout, 75, 60);
    const paused = calculateWorkoutCalories({ ...workout, pausedSeconds: 15 * 60 }, 75, 60);
    expect(paused).toBeLessThan(continuous);
  });

  it('returns zero for missing or non-positive duration', () => {
    expect(calculateWorkoutCalories({}, 80, 0)).toBe(0);
    expect(calculateWorkoutCalories({}, 80, -10)).toBe(0);
    expect(calculateWorkoutCalories({}, 80, null as unknown as number)).toBe(0);
  });
});

describe('resolveBodyweightKg', () => {
  it('prefers the historical smoothed measurement', () => {
    expect(resolveBodyweightKg(90, 75)).toBe(90);
  });

  it('falls back to the initial measured profile weight, never goal weight', () => {
    expect(resolveBodyweightKg(null, 75)).toBe(75);
  });

  it('uses the temporary fallback only when no physiological weight exists', () => {
    expect(resolveBodyweightKg(null, null)).toBe(70);
    expect(resolveBodyweightKg(null, null, 65)).toBe(65);
    expect(resolveBodyweightKg(0, 0)).toBe(70);
  });
});
