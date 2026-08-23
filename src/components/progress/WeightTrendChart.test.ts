import { describe, expect, it } from 'vitest';
import { nearestWeightPointIndex } from './WeightTrendChart';

describe('nearestWeightPointIndex', () => {
  it('selects the nearest chart point across the plot', () => {
    expect(nearestWeightPointIndex(0, 5)).toBe(0);
    expect(nearestWeightPointIndex(0.24, 5)).toBe(1);
    expect(nearestWeightPointIndex(0.51, 5)).toBe(2);
    expect(nearestWeightPointIndex(0.8, 5)).toBe(3);
    expect(nearestWeightPointIndex(1, 5)).toBe(4);
  });

  it('clamps pointer positions outside the plot', () => {
    expect(nearestWeightPointIndex(-1, 4)).toBe(0);
    expect(nearestWeightPointIndex(2, 4)).toBe(3);
  });

  it('handles an empty or single-point chart safely', () => {
    expect(nearestWeightPointIndex(0.5, 0)).toBe(0);
    expect(nearestWeightPointIndex(0.5, 1)).toBe(0);
  });
});
