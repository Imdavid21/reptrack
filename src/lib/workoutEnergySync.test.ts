import { describe, it, expect } from 'vitest';
import { summarizeSetCounts, validWorkoutMinutes } from './workoutEnergySync';

describe('validWorkoutMinutes', () => {
  it('keeps a 50 minute workout', () => expect(validWorkoutMinutes(50)).toBe(50));
  it('rejects a 5,736 minute workout', () => expect(validWorkoutMinutes(5736)).toBe(0));
});

describe('summarizeSetCounts', () => {
  it('counts completed, planned, compound and isolation sets', () => {
    const counts = summarizeSetCounts([
      { category: 'primary', completed: true },
      { category: 'Primary', completed: true },
      { category: 'accessory', completed: true },
      { category: 'accessory', completed: false },
      { category: null, completed: true },
    ]);
    expect(counts).toEqual({
      completedSets: 4,
      plannedSets: 5,
      compoundSets: 2,
      isolationSets: 1,
    });
  });

  it('returns zeroes when every set is removed', () => {
    expect(summarizeSetCounts([])).toEqual({
      completedSets: 0,
      plannedSets: 0,
      compoundSets: 0,
      isolationSets: 0,
    });
  });
});
