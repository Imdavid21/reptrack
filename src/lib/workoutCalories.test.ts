import { describe, it, expect } from 'vitest';
import {
  getWorkoutMetCategory,
  getWorkoutMet,
  calculateWorkoutCalories,
  resolveBodyweightKg,
  WORKOUT_MET_VALUES,
} from './workoutCalories';

describe('getWorkoutMetCategory', () => {
  it('matches push/pull day names', () => {
    expect(getWorkoutMetCategory({ day_name: 'Push A' })).toBe('push');
    expect(getWorkoutMetCategory({ day_name: 'Pull B' })).toBe('pull');
  });

  it('matches "leg" day names', () => {
    expect(getWorkoutMetCategory({ day_name: 'Legs A' })).toBe('legs');
  });

  // Regression: Upper/Lower split day names ("Lower A"/"Lower B") are leg
  // days but don't contain the substring "leg" — this silently fell through
  // to the generic 5.0 MET in three independent copies of this logic before
  // being consolidated here.
  it('matches "lower" day names as legs, not just "leg"', () => {
    expect(getWorkoutMetCategory({ day_name: 'Lower A' })).toBe('legs');
    expect(getWorkoutMetCategory({ day_name: 'Lower B' })).toBe('legs');
  });

  it('matches arm/accessory day names', () => {
    expect(getWorkoutMetCategory({ day_name: 'Arm Day' })).toBe('accessory');
    expect(getWorkoutMetCategory({ day_name: 'Accessory Work' })).toBe('accessory');
  });

  it('falls back to majority exercise category when the day name is uninformative', () => {
    expect(getWorkoutMetCategory({
      day_name: 'Full Body A',
      exercises: [{ category: 'accessory' }, { category: 'accessory' }, { category: 'primary' }],
    })).toBe('accessory');
  });

  it('falls back to strength when neither day name nor exercise majority is informative', () => {
    expect(getWorkoutMetCategory({
      day_name: 'Full Body A',
      exercises: [{ category: 'primary' }, { category: 'primary' }],
    })).toBe('strength');
    expect(getWorkoutMetCategory({ day_name: 'Full Body A' })).toBe('strength');
  });

  it('checks the "day" field as well as "day_name"', () => {
    expect(getWorkoutMetCategory({ day: 'legs', day_name: 'Day 3' })).toBe('legs');
  });
});

describe('getWorkoutMet / WORKOUT_MET_VALUES', () => {
  it('returns realistic MET values for each category', () => {
    expect(getWorkoutMet({ day_name: 'Push A' })).toBe(WORKOUT_MET_VALUES.push);
    expect(getWorkoutMet({ day_name: 'Legs A' })).toBe(6.0);
    expect(getWorkoutMet({ day_name: 'Lower A' })).toBe(6.0);
    expect(getWorkoutMet({ day_name: 'Accessory' })).toBe(4.0);
  });
});

describe('calculateWorkoutCalories', () => {
  it('computes MET × weight(kg) × duration(hours)', () => {
    // Legs (MET 6.0) × 80kg × 1 hour (60 min) = 480
    expect(calculateWorkoutCalories({ day_name: 'Legs A' }, 80, 60)).toBe(400);
  });

  it('scales correctly for a 45-minute session', () => {
    // Push (MET 5.0) × 70kg × 0.75 hour = 262.5 -> rounds to 263
    expect(calculateWorkoutCalories({ day_name: 'Push A' }, 70, 45)).toBe(210);
  });

  it('returns 0 for zero, negative, null, or undefined duration', () => {
    expect(calculateWorkoutCalories({ day_name: 'Legs A' }, 80, 0)).toBe(0);
    expect(calculateWorkoutCalories({ day_name: 'Legs A' }, 80, -10)).toBe(0);
    expect(calculateWorkoutCalories({ day_name: 'Legs A' }, 80, null as unknown as number)).toBe(0);
    expect(calculateWorkoutCalories({ day_name: 'Legs A' }, 80, undefined as unknown as number)).toBe(0);
  });
});

describe('resolveBodyweightKg', () => {
  // Regression: useWorkouts.ts used to skip straight from weight_goal to a
  // hardcoded 70kg default, with no daily_metrics lookup at all — so a real
  // logged bodyweight, when present, must always win.
  it('prefers the real logged average bodyweight over weight_goal', () => {
    expect(resolveBodyweightKg(90, 75)).toBe(90);
  });

  it('falls back to weight_goal when no logged bodyweight exists', () => {
    expect(resolveBodyweightKg(null, 75)).toBe(75);
    expect(resolveBodyweightKg(undefined, 75)).toBe(75);
  });

  it('falls back to the population-average default when neither is available', () => {
    expect(resolveBodyweightKg(null, null)).toBe(70);
    expect(resolveBodyweightKg(undefined, undefined)).toBe(70);
  });

  it('respects a custom fallback default', () => {
    expect(resolveBodyweightKg(null, null, 65)).toBe(65);
  });

  it('treats 0 as missing (falls through), not a valid bodyweight', () => {
    expect(resolveBodyweightKg(0, 75)).toBe(75);
    expect(resolveBodyweightKg(0, 0)).toBe(70);
  });
});
