import { describe, it, expect } from 'vitest';
import { getExerciseType } from './exerciseLibrary';

describe('getExerciseType', () => {
  it('returns the exact library entry for a name spelled exactly as stored', () => {
    expect(getExerciseType('Barbell Bench Press')).toBe('weighted');
    expect(getExerciseType('Pull-ups')).toBe('bodyweight');
    expect(getExerciseType('Dead Hang')).toBe('timed');
  });

  // Regression: called with no weight/reps hints (as usePersonalRecords.ts
  // does for every logged set), a name not spelled out verbatim in the
  // library used to skip straight to inferExerciseType('', undefined), which
  // unconditionally returns 'weighted' — including for exercises that are
  // actually bodyweight or timed. Since a bodyweight exercise's actual_weight
  // is legitimately 0, the PR loop's `weight === 0` guard would then silently
  // skip it forever. getExerciseType now canonicalizes the name first, so a
  // known alias of a bodyweight/timed exercise resolves correctly too.
  it('resolves a bodyweight exercise correctly through its alias, with no hints', () => {
    expect(getExerciseType('Negative Pull-ups')).toBe('bodyweight');
  });

  it('resolves a timed exercise correctly through its alias, with no hints', () => {
    expect(getExerciseType('Dead Hangs')).toBe('timed');
  });

  it('resolves through an alias for a weighted exercise too (no visible symptom before, but same gap)', () => {
    expect(getExerciseType('Bench Press')).toBe('weighted');
    expect(getExerciseType('Reverse Fly')).toBe('weighted');
    expect(getExerciseType('Hammer Curl')).toBe('weighted');
  });

  it('still falls back to weight/reps-hint inference for a genuinely unknown name', () => {
    expect(getExerciseType('Some Brand New Machine Press', 'BW')).toBe('bodyweight');
    expect(getExerciseType('Some Brand New Machine Press', '+10kg')).toBe('weighted_bw');
    expect(getExerciseType('Some Brand New Machine Press', '', '3x45s')).toBe('timed');
    expect(getExerciseType('Some Brand New Machine Press')).toBe('weighted');
  });
});
