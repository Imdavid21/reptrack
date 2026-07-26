import { describe, it, expect } from 'vitest';
import { calculateBMR, averageDailyActivityBurn, computeAutoMaintenance, resolveMaintenanceOverride } from './metabolism';

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

describe('averageDailyActivityBurn', () => {
  it('divides by the full window, not just days with a logged entry — rest days pull the average down', () => {
    // 2 active days totaling 1000 kcal, over a 10-day window (8 implicit rest days).
    const entries = [{ date: '2026-07-01', calories: 600 }, { date: '2026-07-05', calories: 400 }];
    expect(averageDailyActivityBurn(entries, 10)).toBe(100);
  });

  it('returns 0 for an empty window', () => {
    expect(averageDailyActivityBurn([], 0)).toBe(0);
  });

  it('returns 0 when nothing was logged', () => {
    expect(averageDailyActivityBurn([], 14)).toBe(0);
  });
});

describe('computeAutoMaintenance', () => {
  it('is BMR plus the trailing activity-burn average', () => {
    const result = computeAutoMaintenance({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'male',
      activityBurnEntries: [{ date: '2026-07-01', calories: 3500 }],
      windowDays: 7,
    });
    expect(result.avgActivityBurn).toBe(500);
    expect(result.maintenance).toBe(result.bmr + 500);
  });

  it('falls back to pure BMR when no activity has been logged', () => {
    const result = computeAutoMaintenance({
      weightKg: 70, heightCm: 170, age: 25, gender: 'female',
      activityBurnEntries: [], windowDays: 14,
    });
    expect(result.avgActivityBurn).toBe(0);
    expect(result.maintenance).toBe(result.bmr);
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
