import { describe, it, expect } from 'vitest';
import { analyzeMuscles, estimateOneRepMax, pickVariation, recommendIntervention, InsightSet } from './muscleInsights';

function benchSet(date: string, weight: number, reps: number): InsightSet {
  return { exercise_name: 'Barbell Bench Press', actual_weight: weight, actual_reps: reps, workout_date: date };
}

describe('estimateOneRepMax', () => {
  it('returns the weight itself at 0 effective reps influence', () => {
    expect(estimateOneRepMax(100, 1)).toBeCloseTo(100 * (1 + 1 / 30));
  });
  it('caps rep influence at 12 so high-rep sets are not overweighted', () => {
    expect(estimateOneRepMax(50, 20)).toBe(estimateOneRepMax(50, 12));
  });
  it('is zero for invalid input', () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe('pickVariation', () => {
  it('suggests a different-equipment variant of the same lift', () => {
    expect(pickVariation('Barbell Bench Press')).toBe('Dumbbell Bench Press');
  });
  it('returns undefined for unknown lifts', () => {
    expect(pickVariation('Totally Made Up Lift')).toBeUndefined();
  });
});

describe('analyzeMuscles — balance', () => {
  it('marks untrained muscles with a suggested movement', () => {
    const res = analyzeMuscles([benchSet('2026-06-01', 60, 5)], 7);
    const legs = res.balance.find(b => b.bodyPart === 'Quads');
    expect(legs?.status).toBe('untrained');
    expect(res.untrained).toContain('Quads');
    expect(legs?.suggestion).toBeTruthy();
  });

  it('computes weekly sets over the range, not raw counts', () => {
    // 16 chest sets across a 14-day (2-week) window = 8 sets/week.
    const sets = Array.from({ length: 16 }, (_, i) => benchSet(`2026-06-${String((i % 14) + 1).padStart(2, '0')}`, 60, 8));
    const res = analyzeMuscles(sets, 14);
    const chest = res.balance.find(b => b.bodyPart === 'Chest');
    expect(chest?.weeklySets).toBe(8);
    expect(chest?.status).toBe('optimal'); // mev 8
  });

  it('flags overreaching above MRV', () => {
    // 30 chest sets in one week = 30/wk, above chest MRV (22).
    const sets = Array.from({ length: 30 }, (_, i) => benchSet(`2026-06-0${(i % 7) + 1}`, 60, 8));
    const res = analyzeMuscles(sets, 7);
    const chest = res.balance.find(b => b.bodyPart === 'Chest');
    expect(chest?.status).toBe('overreaching');
  });
});

describe('analyzeMuscles — PRs and plateaus', () => {
  it('detects a PR when the most recent session sets a new best', () => {
    const sets = [
      benchSet('2026-06-01', 80, 5),
      benchSet('2026-06-04', 82.5, 5),
      benchSet('2026-06-08', 85, 5), // best, and most recent
    ];
    const res = analyzeMuscles(sets, 14);
    const pr = res.prs.find(p => p.exercise === 'Barbell Bench Press');
    expect(pr).toBeDefined();
    expect(pr!.weight).toBe(85);
    expect(res.plateaus).toHaveLength(0);
  });

  it('flags a plateau after 3+ stalled sessions and suggests a variation', () => {
    const sets = [
      benchSet('2026-06-01', 100, 5), // best e1rm set here
      benchSet('2026-06-04', 100, 4),
      benchSet('2026-06-08', 97.5, 5),
      benchSet('2026-06-11', 100, 4),
    ];
    const res = analyzeMuscles(sets, 28);
    const plateau = res.plateaus.find(p => p.exercise === 'Barbell Bench Press');
    expect(plateau).toBeDefined();
    expect(plateau!.sessionsStalled).toBe(3);
    expect(plateau!.switchTo).toBe('Dumbbell Bench Press');
    // A plateau is not a PR.
    expect(res.prs.find(p => p.exercise === 'Barbell Bench Press')).toBeUndefined();
  });

  it('does not flag a plateau while the lift is still progressing', () => {
    const sets = [
      benchSet('2026-06-01', 80, 5),
      benchSet('2026-06-04', 82.5, 5),
      benchSet('2026-06-08', 85, 5),
      benchSet('2026-06-11', 87.5, 5),
    ];
    const res = analyzeMuscles(sets, 28);
    expect(res.plateaus).toHaveLength(0);
  });

  it('ignores lifts with only one session', () => {
    const res = analyzeMuscles([benchSet('2026-06-01', 80, 5)], 14);
    expect(res.plateaus).toHaveLength(0);
    expect(res.prs).toHaveLength(0);
  });
});

describe('regression detection (§2.3)', () => {
  it('flags a >10% drop below the prior 3 sessions', () => {
    const res = analyzeMuscles([
      benchSet('2026-06-01', 100, 5),
      benchSet('2026-06-04', 100, 5),
      benchSet('2026-06-08', 100, 5),
      benchSet('2026-06-11', 80, 5), // ~20% drop
    ], 28);
    const reg = res.regressions.find(r => r.exercise === 'Barbell Bench Press');
    expect(reg).toBeDefined();
    expect(reg!.dropPct).toBeGreaterThanOrEqual(15);
  });

  it('does not flag small dips within 10%', () => {
    const res = analyzeMuscles([
      benchSet('2026-06-01', 100, 5),
      benchSet('2026-06-04', 100, 5),
      benchSet('2026-06-08', 100, 5),
      benchSet('2026-06-11', 97, 5), // ~3% dip
    ], 28);
    expect(res.regressions).toHaveLength(0);
  });
});

describe('recommendIntervention (§4 escalation ladder)', () => {
  it('starts with a mini-deload at 3-4 stalled sessions', () => {
    expect(recommendIntervention(3, 1).level).toBe('mini-deload');
    expect(recommendIntervention(4, 1).level).toBe('mini-deload');
  });
  it('escalates to a stimulus change at 5+ stalled sessions', () => {
    const r = recommendIntervention(5, 1, 'Dumbbell Bench Press');
    expect(r.level).toBe('stimulus-change');
    expect(r.action).toContain('Dumbbell Bench Press');
  });
  it('recommends a deload week when 2+ lifts are stalled at once', () => {
    expect(recommendIntervention(3, 2).level).toBe('deload-week');
    // systemic takes priority even over a single-lift stimulus change
    expect(recommendIntervention(6, 3).level).toBe('deload-week');
  });
});
