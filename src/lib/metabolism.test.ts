import { describe, it, expect } from 'vitest';
import { calculateBMR, resolveMaintenanceOverride, bmrBurnedSoFarToday } from './metabolism';

describe('calculateBMR (Mifflin-St Jeor)', () => {
  it('matches the male formula: 10w + 6.25h - 5a + 5', () => {
    expect(calculateBMR(80, 180, 30, 'male')).toBe(Math.round(10 * 80 + 6.25 * 180 - 5 * 30 + 5));
  });

  it('matches the female formula: 10w + 6.25h - 5a - 161', () => {
    expect(calculateBMR(65, 165, 28, 'female')).toBe(Math.round(10 * 65 + 6.25 * 165 - 5 * 28 - 161));
  });

  it('increases with more bodyweight, all else equal', () => {
    expect(calculateBMR(90, 180, 30, 'male')).toBeGreaterThan(calculateBMR(80, 180, 30, 'male'));
  });

  it('decreases with age, all else equal', () => {
    expect(calculateBMR(80, 180, 40, 'male')).toBeLessThan(calculateBMR(80, 180, 25, 'male'));
  });
});

describe('bmrBurnedSoFarToday', () => {
  it('is 0 right at midnight', () => {
    expect(bmrBurnedSoFarToday(2400, new Date(2026, 5, 1, 0, 0, 0))).toBe(0);
  });

  it('is roughly half the daily BMR at noon', () => {
    expect(bmrBurnedSoFarToday(2400, new Date(2026, 5, 1, 12, 0, 0))).toBe(1200);
  });

  it('is the full daily BMR right at the end of the day', () => {
    expect(bmrBurnedSoFarToday(2400, new Date(2026, 5, 1, 23, 59, 59, 999))).toBeCloseTo(2400, -1);
  });

  it('increases monotonically through the day', () => {
    const morning = bmrBurnedSoFarToday(2400, new Date(2026, 5, 1, 8, 0, 0));
    const evening = bmrBurnedSoFarToday(2400, new Date(2026, 5, 1, 20, 0, 0));
    expect(evening).toBeGreaterThan(morning);
  });
});

// Regression: a stored maintenance_calories of 0 (vs. null) was being read
// with `??`, which only falls back on null/undefined — so 0 was treated as
// a deliberate "maintenance is 0 kcal" override, zeroing out NET on the
// dashboard entirely instead of falling back to the auto-calculation.
describe('resolveMaintenanceOverride', () => {
  it('treats a stored 0 as no override, not a real zero-calorie maintenance', () => {
    expect(resolveMaintenanceOverride(0)).toBeNull();
  });

  it('treats null and undefined as no override', () => {
    expect(resolveMaintenanceOverride(null)).toBeNull();
    expect(resolveMaintenanceOverride(undefined)).toBeNull();
  });

  it('rejects a negative value', () => {
    expect(resolveMaintenanceOverride(-100)).toBeNull();
  });

  it('passes through a real positive override unchanged', () => {
    expect(resolveMaintenanceOverride(2400)).toBe(2400);
  });
});
