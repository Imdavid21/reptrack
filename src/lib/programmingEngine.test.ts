import { describe, it, expect } from 'vitest';
import { derivePersonalizedProgramming } from './programmingEngine';
import type { Exercise } from './workoutPresets';
import type { LastUsedData } from '@/hooks/useLastUsedWeights';

const primaryEx: Exercise = {
  name: 'Barbell Bench Press',
  category: 'primary',
  targetWeight: '60kg',
  targetReps: '4x8', // deliberately conflicts with focus tables, to prove focus wins
};

const accessoryEx: Exercise = {
  name: 'Lateral Raises',
  category: 'accessory',
  targetWeight: '8kg',
  targetReps: '3x15',
};

const bodyweightEx: Exercise = {
  name: 'Pull-ups',
  category: 'primary',
  targetWeight: 'BW',
  targetReps: '3x8-12',
};

const weightedBwEx: Exercise = {
  name: 'Weighted Dips',
  category: 'primary',
  targetWeight: '+10kg',
  targetReps: '3x8-10',
};

function lastUsed(weight: number, reps: number, sets = 3): LastUsedData {
  return { weight, reps, sets, date: '2026-06-01', perSet: [] };
}

describe('training focus drives sets & reps, overriding the template', () => {
  it('strength focus always uses a low-rep, high-rest scheme regardless of the template', () => {
    const r = derivePersonalizedProgramming(primaryEx, 'volume', undefined, null, 'strength');
    expect(r.sets).toBe(5);
    expect(r.restSeconds).toBeGreaterThanOrEqual(210);
    // reps should be a tight low range (3-5), not the template's "8"
    expect(r.reps).toMatch(/^[3-5](-[3-5])?$/);
  });

  it('volume focus always uses a high-rep, shorter-rest scheme regardless of the template', () => {
    const r = derivePersonalizedProgramming(primaryEx, 'heavy', undefined, null, 'volume');
    expect(r.sets).toBe(4);
    expect(r.restSeconds).toBeLessThanOrEqual(90);
    expect(r.reps).toMatch(/^(8|9|10|11|12)(-\d+)?$/);
  });

  it('accessory volume focus programs meaningfully more reps than strength focus', () => {
    const strength = derivePersonalizedProgramming(accessoryEx, 'heavy', undefined, null, 'strength');
    const volume = derivePersonalizedProgramming(accessoryEx, 'heavy', undefined, null, 'volume');
    const topOf = (label: string) => Math.max(...label.split('-').map(Number));
    expect(topOf(volume.reps)).toBeGreaterThan(topOf(strength.reps));
  });

  it('mix focus (default/unset) preserves the template\'s own explicit prescription unchanged', () => {
    const withMix = derivePersonalizedProgramming(primaryEx, 'heavy', undefined, null, 'mix');
    const withUnset = derivePersonalizedProgramming(primaryEx, 'heavy', undefined, null, undefined);
    // template says '4x8' → sets=4, reps='8'
    expect(withMix.sets).toBe(4);
    expect(withMix.reps).toBe('8');
    expect(withUnset.sets).toBe(4);
    expect(withUnset.reps).toBe('8');
  });
});

describe('weight/rep progression against real history', () => {
  it('bumps weight and resets to the bottom of the range after hitting the top last time', () => {
    // strength range for primary is 3-5; last time they got 5 reps at 60kg
    const r = derivePersonalizedProgramming(primaryEx, 'heavy', lastUsed(60, 5), null, 'strength');
    expect(r.trend).toBe('up');
    const weightNum = parseFloat(r.weight);
    expect(weightNum).toBeGreaterThan(60);
    expect(r.note.toLowerCase()).toContain('kg');
  });

  it('holds weight and chases reps when the range top was not reached', () => {
    const r = derivePersonalizedProgramming(primaryEx, 'heavy', lastUsed(60, 3), null, 'strength');
    expect(r.trend).toBe('hold');
    expect(r.weight).toBe('60kg');
  });

  it('progresses bodyweight exercises by reps, not weight', () => {
    const r = derivePersonalizedProgramming(bodyweightEx, 'volume', lastUsed(0, 12), null, 'mix');
    expect(r.weight).toBe('BW');
  });

  it('does not double-prefix "+" on a weighted_bw exercise with no history', () => {
    const r = derivePersonalizedProgramming(weightedBwEx, 'heavy', undefined, null, 'mix');
    expect(r.weight.startsWith('++')).toBe(false);
    expect(r.weight).toBe('10kg');
  });

  it('progresses a weighted_bw exercise by adding weight once history exists', () => {
    const r = derivePersonalizedProgramming(weightedBwEx, 'heavy', lastUsed(10, 10), null, 'mix');
    expect(r.trend).toBe('up');
    expect(parseFloat(r.weight)).toBeGreaterThan(10);
  });
});
