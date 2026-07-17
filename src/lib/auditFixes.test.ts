import { describe, it, expect } from 'vitest';
import { resolveSplitDays } from './splitTemplates';
import type { WorkoutDay } from './workoutPresets';
import { getBodyPart } from './exerciseClassification';
import { derivePersonalizedProgramming } from './programmingEngine';
import { normalizeExerciseName, findBestMatch } from './exerciseMatching';
import { computeBodyOverview, BodyOverviewInput } from './bodyScore';
import type { Exercise } from './workoutPresets';
import type { LastUsedData } from '@/hooks/useLastUsedWeights';

// ── Split resolution: the chosen split wins unless it's explicitly 'custom' ──
describe('resolveSplitDays', () => {
  const customDays: Record<string, WorkoutDay> = {
    'Day 1': { name: 'Push A', focus: 'Chest & Triceps', exercises: [] },
  };

  it('uses the template split even when an active custom routine exists', () => {
    // The reported bug: picking Full Body still rendered the custom PPL routine.
    const days = resolveSplitDays('full_body3', customDays, true);
    const names = Object.values(days).map(d => d.name);
    expect(names.some(n => n.includes('Full Body'))).toBe(true);
    expect(names).not.toContain('Push A');
  });

  it('honors Upper/Lower over a leftover custom routine', () => {
    const days = resolveSplitDays('upper_lower4', customDays, true);
    const names = Object.values(days).map(d => d.name);
    expect(names.some(n => n.includes('Upper'))).toBe(true);
    expect(names).not.toContain('Push A');
  });

  it('only applies a custom routine when the split is explicitly custom', () => {
    expect(resolveSplitDays('custom', customDays, true)).toBe(customDays);
  });

  it('ignores a custom routine flag with no days, falling back to template', () => {
    const days = resolveSplitDays('custom', null, true);
    expect(Object.keys(days).length).toBe(0); // getSplitDays('custom') → empty
  });

  it('defaults to ppl6 when split is missing', () => {
    const days = resolveSplitDays(undefined, null, false);
    const names = Object.values(days).map(d => d.name);
    expect(names).toContain('Push A');
    expect(Object.keys(days).length).toBe(6);
  });
});

// ── C2: exercise classification — specific tokens must beat generic press/push ──
describe('getBodyPart classification precedence', () => {
  it('classifies pushdowns as Triceps, not Chest', () => {
    expect(getBodyPart('Tricep Pushdown')).toBe('Triceps');
    expect(getBodyPart('Single Arm Tricep Pushdown')).toBe('Triceps');
    expect(getBodyPart('V-Bar Pushdown')).toBe('Triceps');
  });

  it('classifies non-chest presses correctly', () => {
    expect(getBodyPart('Pallof Press')).toBe('Core');
    expect(getBodyPart('Z Press')).toBe('Shoulders');
    expect(getBodyPart('Behind the Neck Press')).toBe('Shoulders');
  });

  it('still classifies genuine chest/back movements', () => {
    expect(getBodyPart('Bench Press')).toBe('Chest');
    expect(getBodyPart('Incline Barbell Bench Press')).toBe('Chest');
    expect(getBodyPart('Barbell Row')).toBe('Back');
  });
});

// ── C3: programming engine must clamp set count from history to a sane range ──
describe('derivePersonalizedProgramming set clamp', () => {
  const squat: Exercise = {
    name: 'Barbell Squat',
    category: 'primary',
    targetWeight: '80kg',
    targetReps: '4x8',
  };
  const lastUsed = (sets: number): LastUsedData => ({
    weight: 80, reps: 8, sets, date: '2026-06-01', perSet: [],
  });

  it('ignores an abnormally low historical set count (quit after 1 set)', () => {
    const r = derivePersonalizedProgramming(squat, 'heavy', lastUsed(1));
    expect(r.sets).toBe(4); // template's 4, not 1
  });

  it('ignores an abnormally high historical set count', () => {
    const r = derivePersonalizedProgramming(squat, 'heavy', lastUsed(12));
    expect(r.sets).toBe(4);
  });

  it('honors a reasonable historical set count', () => {
    const r = derivePersonalizedProgramming(squat, 'heavy', lastUsed(5));
    expect(r.sets).toBe(5);
  });

  it('falls back to the template when there is no history', () => {
    const r = derivePersonalizedProgramming(squat, 'heavy', undefined);
    expect(r.sets).toBe(4);
  });
});

// ── C5: seated vs standing calf raise must not cross-contaminate ──
describe('normalizeExerciseName keeps calf raise variants distinct', () => {
  it('does not collapse seated and standing calf raises', () => {
    expect(normalizeExerciseName('Standing Calf Raise'))
      .not.toBe(normalizeExerciseName('Seated Calf Raise'));
  });

  it('findBestMatch does not return standing history for a seated lookup', () => {
    const map = { 'Standing Calf Raise': { weight: 100 } };
    expect(findBestMatch('Seated Calf Raise', map)).toBeUndefined();
  });

  it('findBestMatch still resolves the same variant', () => {
    const map = { 'Seated Calf Raise': { weight: 40 } };
    expect(findBestMatch('Seated Calf Raise', map)).toEqual({ weight: 40 });
  });
});

// ── C4: training pillar trend must reflect real frequency change ──
describe('computeBodyOverview training trend', () => {
  const baseInput = (workoutDates: string[]): BodyOverviewInput => ({
    rangeDays: 28,
    goals: {
      weeklyWorkouts: 4, dailyCalories: 2400, dailyProtein: 160,
      dailyWaterLiters: 3, sleepHours: 8, weightGoalType: null,
    },
    workoutDates,
    meals: [], waterByDay: {}, metrics: [],
  });

  it('reports up when frequency ramps up across the range', () => {
    // sparse first half, dense second half
    const dates = ['2026-06-01', '2026-06-15',
      '2026-06-22', '2026-06-23', '2026-06-25', '2026-06-26', '2026-06-28'];
    expect(computeBodyOverview(baseInput(dates)).pillars.training.trend).toBe('up');
  });

  it('reports down when frequency falls off', () => {
    const dates = ['2026-06-01', '2026-06-02', '2026-06-04', '2026-06-05', '2026-06-07',
      '2026-06-20', '2026-06-28'];
    expect(computeBodyOverview(baseInput(dates)).pillars.training.trend).toBe('down');
  });
});
