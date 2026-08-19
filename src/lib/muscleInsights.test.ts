import { describe, it, expect } from 'vitest';
import { analyzeMuscles, estimateOneRepMax, pickVariation, InsightSet, InsightActivity } from './muscleInsights';

function benchSet(date: string, weight: number, reps: number): InsightSet {
  return { exercise_name: 'Barbell Bench Press', actual_weight: weight, actual_reps: reps, workout_date: date };
}

function activity(kind: string, minutes: number): InsightActivity {
  return { activity_type: kind, duration_minutes: minutes };
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

describe('analyzeMuscles - balance', () => {
  it('marks untrained muscles with a suggested movement', () => {
    const res = analyzeMuscles([benchSet('2026-06-01', 60, 5)], 7);
    const legs = res.balance.find(b => b.bodyPart === 'Quads');
    expect(legs?.status).toBe('untrained');
    expect(res.untrained).toContain('Quads');
    expect(legs?.suggestion).toBeTruthy();
  });

  it('computes weekly sets over the range, not raw counts', () => {
    // Flat barbell bench press is all "Mid Chest": 16 sets across a 14-day
    // (2-week) window = 8 sets/week.
    const sets = Array.from({ length: 16 }, (_, i) => benchSet(`2026-06-${String((i % 14) + 1).padStart(2, '0')}`, 60, 8));
    const res = analyzeMuscles(sets, 14);
    const midChest = res.balance.find(b => b.bodyPart === 'Mid Chest');
    expect(midChest?.weeklySets).toBe(8);
    expect(midChest?.status).toBe('optimal'); // mev 4
  });

  it('flags overreaching above MRV', () => {
    // 30 flat bench sets in one week = 30/wk Mid Chest, above its MRV (13).
    const sets = Array.from({ length: 30 }, (_, i) => benchSet(`2026-06-0${(i % 7) + 1}`, 60, 8));
    const res = analyzeMuscles(sets, 7);
    const midChest = res.balance.find(b => b.bodyPart === 'Mid Chest');
    expect(midChest?.status).toBe('overreaching');
  });
});

describe('analyzeMuscles - activity contribution', () => {
  function squatSet(date: string, weight: number, reps: number): InsightSet {
    return { exercise_name: 'Barbell Squat', actual_weight: weight, actual_reps: reps, workout_date: date };
  }

  it('credits a logged activity toward the muscles it actually loads', () => {
    // One 30-min run in a 7-day (1-week) window = running's per-30-min Quads load (1) at face value.
    const res = analyzeMuscles([], 7, [activity('running', 30)]);
    const quads = res.balance.find(b => b.bodyPart === 'Quads');
    expect(quads?.weeklySets).toBe(1);
    expect(quads?.fromActivity).toBe(1);
    expect(quads?.status).toBe('under'); // 1 < Quads MEV (8), so no longer "untrained"
    expect(res.untrained).not.toContain('Quads');
  });

  it('ignores an unrecognized activity type without throwing', () => {
    const res = analyzeMuscles([], 7, [activity('swimming', 45)]);
    expect(res.balance.every(b => b.fromActivity === undefined)).toBe(true);
  });

  it('ignores a zero-duration activity entry', () => {
    const res = analyzeMuscles([], 7, [activity('running', 0)]);
    const quads = res.balance.find(b => b.bodyPart === 'Quads');
    expect(quads?.fromActivity).toBeUndefined();
    expect(quads?.status).toBe('untrained');
  });

  it('combines lifting sets and activity load additively, and isolates the activity portion', () => {
    // 4 squat sets (lifting) + one 60-min run (running.Quads = 1/30min => +2 equivalent sets) in a 1-week window.
    const sets = [
      squatSet('2026-06-01', 100, 5),
      squatSet('2026-06-01', 100, 5),
      squatSet('2026-06-01', 100, 5),
      squatSet('2026-06-01', 100, 5),
    ];
    const res = analyzeMuscles(sets, 7, [activity('running', 60)]);
    const quads = res.balance.find(b => b.bodyPart === 'Quads');
    expect(quads?.weeklySets).toBe(6); // 4 lifted + 2 from activity
    expect(quads?.fromActivity).toBe(2);
  });

  it('only credits muscles an activity actually trains (boxing does not load legs)', () => {
    const res = analyzeMuscles([], 7, [activity('boxing', 60)]);
    const sideDelts = res.balance.find(b => b.bodyPart === 'Side Delts');
    const quads = res.balance.find(b => b.bodyPart === 'Quads');
    expect(sideDelts?.fromActivity).toBeGreaterThan(0);
    expect(quads?.fromActivity).toBeUndefined();
    expect(quads?.status).toBe('untrained');
  });

  it('defaults to no activity contribution when the param is omitted (back-compat)', () => {
    const res = analyzeMuscles([benchSet('2026-06-01', 60, 5)], 7);
    expect(res.balance.every(b => b.fromActivity === undefined)).toBe(true);
  });
});

describe('analyzeMuscles - PRs and plateaus', () => {
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
