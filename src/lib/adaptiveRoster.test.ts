import { describe, it, expect } from 'vitest';
import { matchExerciseToPattern, detectPatternSeed, HistoricalSet } from './adaptiveRoster';

describe('matchExerciseToPattern', () => {
  it('matches an exact roster hint', () => {
    expect(matchExerciseToPattern('Romanian Deadlift')).toEqual({ patternKey: 'hinge', variationName: 'Romanian Deadlift' });
  });

  it('matches case-insensitively and strips a (Set N) suffix', () => {
    expect(matchExerciseToPattern('back squat (Set 3)')).toEqual({ patternKey: 'squat', variationName: 'Back Squat' });
  });

  it('falls back to substring matching for close variants', () => {
    expect(matchExerciseToPattern('Heavy Barbell Bench Press Day')).toEqual({ patternKey: 'horizontal_press', variationName: 'Barbell Bench Press' });
  });

  it('returns null for exercises outside the six patterns', () => {
    expect(matchExerciseToPattern('Bicep Curl')).toBeNull();
    expect(matchExerciseToPattern('')).toBeNull();
  });
});

describe('detectPatternSeed', () => {
  function set(name: string, weight: number, reps: number, date: string): HistoricalSet {
    return { exercise_name: name, actual_weight: weight, actual_reps: reps, workout_date: date, completed: true };
  }

  it('seeds from the heaviest set on the most recently trained date for the pattern', () => {
    const sets: HistoricalSet[] = [
      set('Back Squat', 100, 5, '2026-06-01'),
      set('Back Squat', 120, 3, '2026-06-15'), // most recent date, heaviest
      set('Back Squat', 110, 5, '2026-06-15'),
      set('Romanian Deadlift', 80, 8, '2026-06-20'), // different pattern (hinge)
    ];
    expect(detectPatternSeed('squat', sets)).toEqual({ variationName: 'Back Squat', startingLoad: 120, startingReps: 3 });
  });

  it('returns null when nothing in the pattern has ever been logged', () => {
    const sets: HistoricalSet[] = [set('Barbell Bench Press', 80, 8, '2026-06-01')];
    expect(detectPatternSeed('squat', sets)).toBeNull();
  });

  it('ignores incomplete or zero-value sets', () => {
    const sets: HistoricalSet[] = [
      { exercise_name: 'Back Squat', actual_weight: 100, actual_reps: 5, workout_date: '2026-06-01', completed: false },
      { exercise_name: 'Back Squat', actual_weight: 0, actual_reps: 5, workout_date: '2026-06-02', completed: true },
      { exercise_name: 'Back Squat', actual_weight: 90, actual_reps: 6, workout_date: '2026-06-03', completed: true },
    ];
    expect(detectPatternSeed('squat', sets)).toEqual({ variationName: 'Back Squat', startingLoad: 90, startingReps: 6 });
  });
});
