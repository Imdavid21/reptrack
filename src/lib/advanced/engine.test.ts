import { describe, expect, it } from 'vitest';
import { goalRunway, mealSuggestions, plateLoad, progressionAutopilot, sessionQuality, simulateCut, warmupAutopilot } from './engine';

describe('advanced engine', () => {
  it('calculates plates for any historical or live load', () => {
    expect(plateLoad(100, 20).perSide).toEqual([25, 15]);
    expect(plateLoad(103, 20).loadedKg).toBe(102.5);
    expect(plateLoad(103, 20).deltaKg).toBe(0.5);
  });

  it('returns a warm-up ramp below the working load', () => {
    const ramp = warmupAutopilot(100, 8);
    expect(ramp.map(item => item.weight)).toEqual([40, 60, 80]);
    expect(ramp.every(item => item.weight < 100)).toBe(true);
  });

  it('detects exercise progression from session-to-session evidence', () => {
    const result = progressionAutopilot([
      { exercise: 'Bench Press', date: '2026-08-01', weight: 60, reps: 6 },
      { exercise: 'Bench Press', date: '2026-08-08', weight: 60, reps: 8 },
    ]);
    expect(result[0].state).toBe('progressing');
    expect(result[0].nextWeight).toBe(62.5);
  });

  it('does not invent an ETA without enough directional evidence', () => {
    expect(goalRunway([{ date: '2026-08-20', bodyweight: 72 }], 68).weeks).toBeNull();
  });

  it('derives frequent foods from logs', () => {
    const suggestions = mealSuggestions([
      { food_name: 'Greek yogurt', meal_type: 'breakfast', calories: 100, protein: 11, date: '2026-08-01' },
      { food_name: 'Greek yogurt', meal_type: 'breakfast', calories: 110, protein: 11, date: '2026-08-02' },
      { food_name: 'Banana', meal_type: 'breakfast', calories: 90, protein: 1, date: '2026-08-02' },
    ], 'breakfast');
    expect(suggestions[0]).toMatchObject({ label: 'Greek yogurt', count: 2, calories: 105, protein: 11 });
  });

  it('describes session quality with facts rather than a score', () => {
    expect(sessionQuality({ completedSets: 18, plannedSets: 20, progressionWins: 2, regressions: 0 })).toMatchObject({ completion: 90, flags: ['plan hit', '2 progression'], review: false });
  });

  it('simulates a cut from explicit assumptions', () => {
    const result = simulateCut({ currentWeight: 72, targetWeight: 68, dailyDeficit: 500, maintenance: 2200 });
    expect(result.calories).toBe(1700);
    expect(result.weeklyRate).toBeLessThan(0);
    expect(result.weeks).toBeGreaterThan(0);
  });
});
