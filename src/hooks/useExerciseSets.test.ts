import { describe, it, expect } from 'vitest';
import { categorizeByDayName, categorizeExercise } from './useExerciseSets';

describe('categorizeByDayName', () => {
  it('matches push/pull day names', () => {
    expect(categorizeByDayName('Push A')).toBe('push');
    expect(categorizeByDayName('Pull B')).toBe('pull');
  });

  it('matches "leg" and "lower" day names as legs', () => {
    expect(categorizeByDayName('Legs A')).toBe('legs');
    expect(categorizeByDayName('Lower A')).toBe('legs');
  });

  it('returns null for day names with no push/pull/leg signal, instead of guessing', () => {
    expect(categorizeByDayName('Upper A')).toBeNull();
    expect(categorizeByDayName('Full Body A')).toBeNull();
  });
});

describe('categorizeExercise', () => {
  // Regression: the old categorizeByDayName had no leg detection at all
  // (bare push -> 'push', pull -> 'pull', everything else -> 'legs'), so
  // every exercise on an Upper day — all push and pull movements — was
  // silently counted as leg volume, and Full Body days fared no better.
  it('classifies push/pull movements correctly even on an Upper day', () => {
    expect(categorizeExercise('Barbell Bench Press', 'Upper A')).toBe('push');
    expect(categorizeExercise('Barbell Row', 'Upper A')).toBe('pull');
  });

  it('classifies leg movements correctly on a Full Body day', () => {
    expect(categorizeExercise('Barbell Squat', 'Full Body A')).toBe('legs');
    expect(categorizeExercise('Romanian Deadlift', 'Full Body B')).toBe('legs');
  });

  it('still gets the easy day-name-only cases right', () => {
    expect(categorizeExercise('Overhead Press', 'Push A')).toBe('push');
    expect(categorizeExercise('Lat Pulldown', 'Pull A')).toBe('pull');
    expect(categorizeExercise('Leg Press', 'Lower A')).toBe('legs');
  });

  it('falls back to the day-level signal, then legs, for exercises with no clean push/pull/legs home', () => {
    // Core work on a Pull day: no confident body-part bucket, so it takes
    // the day-level hint.
    expect(categorizeExercise('Hanging Knee Raises', 'Pull A')).toBe('pull');
    // Core work on a day name that gives no signal either: falls to the
    // historical default rather than being silently dropped.
    expect(categorizeExercise('Hanging Knee Raises', 'Full Body A')).toBe('legs');
  });
});
