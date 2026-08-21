import { describe, it, expect } from 'vitest';
import { summarizeSetCounts } from './workoutEnergySync';

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
