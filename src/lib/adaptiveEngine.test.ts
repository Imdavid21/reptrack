import { describe, it, expect } from 'vitest';
import {
  checkEndTrigger,
  consecutiveZoneBreakdown,
  detectOpenWeakPoint,
  computeCarryoverOut,
  computeCarryoverTotal,
  deriveConversionFactor,
  computeNewStartingLoad,
  selectNextVariation,
  isResensitised,
  computeSessionTargets,
  defaultBackoffLoad,
  SessionLogEntry,
  LifecycleRecord,
  DEFAULT_ADAPTIVE_CONFIG,
} from './adaptiveEngine';
import { MOVEMENT_PATTERNS } from './adaptiveRoster';

function session(date: string, load: number, reps: number, zone?: SessionLogEntry['weak_point_zone']): SessionLogEntry {
  return { session_date: date, leading_load: load, leading_reps: reps, weak_point_zone: zone ?? null };
}

describe('checkEndTrigger', () => {
  const base = { start_date: '2026-06-01', rep_range_low: 6 };

  it('fires reps_floor when 2 consecutive sessions hit the rep floor with no load increase', () => {
    const sessions = [session('2026-06-01', 100, 10), session('2026-06-08', 100, 6), session('2026-06-15', 100, 6)];
    expect(checkEndTrigger(base, sessions)?.type).toBe('reps_floor');
  });

  it('does not fire reps_floor if load increased between the two floor sessions', () => {
    const sessions = [session('2026-06-08', 100, 6), session('2026-06-15', 102.5, 6)];
    const result = checkEndTrigger(base, sessions);
    expect(result?.type).not.toBe('reps_floor');
  });

  it('fires load_stall when load has not increased for 2 consecutive sessions', () => {
    const sessions = [session('2026-06-01', 100, 10), session('2026-06-08', 100, 9), session('2026-06-15', 100, 8)];
    expect(checkEndTrigger(base, sessions)?.type).toBe('load_stall');
  });

  it('fires form_breakdown when the same zone is flagged 2 consecutive sessions', () => {
    const sessions = [
      session('2026-06-01', 100, 10),
      session('2026-06-08', 102.5, 9, 'bottom-range'),
      session('2026-06-15', 105, 8, 'bottom-range'),
    ];
    const result = checkEndTrigger(base, sessions);
    expect(result?.type).toBe('form_breakdown');
  });

  it('fires duration_cap once the lifecycle exceeds the configured max weeks, even mid-progress', () => {
    const sessions = [session('2026-06-01', 100, 10), session('2026-06-08', 102.5, 10), session('2026-06-15', 105, 10)];
    const today = new Date('2026-07-25'); // ~7.7 weeks after 2026-06-01
    expect(checkEndTrigger(base, sessions, DEFAULT_ADAPTIVE_CONFIG, today)?.type).toBe('duration_cap');
  });

  it('returns null when the lifecycle is still progressing cleanly', () => {
    const sessions = [session('2026-06-01', 100, 10), session('2026-06-08', 102.5, 10), session('2026-06-15', 105, 10)];
    const today = new Date('2026-06-16');
    expect(checkEndTrigger(base, sessions, DEFAULT_ADAPTIVE_CONFIG, today)).toBeNull();
  });

  it('prioritizes reps_floor over duration_cap when both would fire', () => {
    const sessions = [session('2026-06-01', 100, 6), session('2026-06-08', 100, 6)];
    const today = new Date('2026-08-01');
    expect(checkEndTrigger(base, sessions, DEFAULT_ADAPTIVE_CONFIG, today)?.type).toBe('reps_floor');
  });
});

describe('consecutiveZoneBreakdown / detectOpenWeakPoint', () => {
  it('consecutiveZoneBreakdown requires the two most recent sessions to match', () => {
    const sessions = [session('2026-06-01', 100, 10, 'stability'), session('2026-06-08', 100, 9, 'lock-out')];
    expect(consecutiveZoneBreakdown(sessions)).toBeNull();
  });

  it('detectOpenWeakPoint counts non-consecutive occurrences within the lifecycle', () => {
    const sessions = [
      session('2026-06-01', 100, 10, 'bottom-range'),
      session('2026-06-08', 102.5, 9, 'stability'),
      session('2026-06-15', 105, 8, 'bottom-range'),
    ];
    expect(detectOpenWeakPoint(sessions)).toBe('bottom-range');
  });

  it('detectOpenWeakPoint returns null with fewer than 2 occurrences of any zone', () => {
    const sessions = [session('2026-06-01', 100, 10, 'bottom-range'), session('2026-06-08', 102.5, 9, 'stability')];
    expect(detectOpenWeakPoint(sessions)).toBeNull();
  });
});

describe('carryover', () => {
  it('computes carryover_out as the load delta over a lifecycle', () => {
    expect(computeCarryoverOut(80, 100)).toBe(20);
  });

  it('never returns negative carryover', () => {
    expect(computeCarryoverOut(100, 90)).toBe(0);
  });

  it('sums carryover_out across closed lifecycles in a pattern, ignoring other patterns and open lifecycles', () => {
    const lifecycles: LifecycleRecord[] = [
      { id: '1', movement_pattern: 'hinge', variation_name: 'Conventional Deadlift', rep_range_low: 5, rep_range_high: 10, start_date: '2026-01-01', end_date: '2026-02-01', starting_load: 100, ending_load: 120, carryover_in: 0, carryover_out: 20, status: 'closed' },
      { id: '2', movement_pattern: 'hinge', variation_name: 'Romanian Deadlift', rep_range_low: 6, rep_range_high: 12, start_date: '2026-02-02', end_date: '2026-03-02', starting_load: 100, ending_load: 115, carryover_in: 20, carryover_out: 15, status: 'closed' },
      { id: '3', movement_pattern: 'squat', variation_name: 'Back Squat', rep_range_low: 5, rep_range_high: 10, start_date: '2026-01-01', end_date: '2026-02-01', starting_load: 100, ending_load: 140, carryover_in: 0, carryover_out: 40, status: 'closed' },
      { id: '4', movement_pattern: 'hinge', variation_name: 'Deficit Deadlift', rep_range_low: 5, rep_range_high: 10, start_date: '2026-03-03', end_date: null, starting_load: 100, ending_load: null, carryover_in: 35, carryover_out: null, status: 'active' },
    ];
    expect(computeCarryoverTotal(lifecycles, 'hinge')).toBe(35);
    expect(computeCarryoverTotal(lifecycles, 'squat')).toBe(40);
  });

  it('conversion factor is 1.0 for identical strength curves', () => {
    const curve = { 'lock-out': 4, 'mid-range': 4, 'bottom-range': 3, stability: 3 };
    expect(deriveConversionFactor(curve, curve)).toBe(1);
  });

  it('conversion factor is lower for very different strength curves', () => {
    const a = { 'lock-out': 5, 'mid-range': 5, 'bottom-range': 1, stability: 1 };
    const b = { 'lock-out': 1, 'mid-range': 1, 'bottom-range': 5, stability: 5 };
    const factor = deriveConversionFactor(a, b);
    expect(factor).toBeLessThan(1);
    expect(factor).toBeGreaterThanOrEqual(0.6);
  });

  it('new starting load combines the new variation baseline with converted carryover', () => {
    expect(computeNewStartingLoad(60, 20, 1)).toBe(80);
    expect(computeNewStartingLoad(60, 20, 0.75)).toBe(75);
  });
});

describe('selectNextVariation - weak-point matching', () => {
  const pattern = MOVEMENT_PATTERNS.vertical_press;

  it('prefers a variation strong exactly where the open weak point is weak', () => {
    const candidates = pattern.variations.map(v => ({ variation: v, lastActiveEndDate: null, resensitising: false }));
    // Landmine Press scores 5/5 at bottom-range - the strongest available.
    const result = selectNextVariation(pattern, candidates, 'Standing Barbell Overhead Press', 'bottom-range');
    expect(result.variation.name).toBe('Landmine Press');
    expect(result.reason).toContain('bottom-range');
  });

  it('excludes the currently active variation from selection', () => {
    const candidates = pattern.variations.map(v => ({ variation: v, lastActiveEndDate: null, resensitising: false }));
    const result = selectNextVariation(pattern, candidates, 'Landmine Press', 'bottom-range');
    expect(result.variation.name).not.toBe('Landmine Press');
  });

  it('falls back to novelty (longest unused) when there is no open weak point', () => {
    const candidates = pattern.variations.map(v => ({
      variation: v,
      lastActiveEndDate: v.name === 'Z Press' ? '2025-01-01' : '2026-06-01',
      resensitising: false,
    }));
    const result = selectNextVariation(pattern, candidates, 'Standing Barbell Overhead Press', null);
    expect(result.variation.name).toBe('Z Press');
  });

  it('never selected variations still resensitising are skipped in favor of eligible ones', () => {
    const candidates = pattern.variations.map(v => ({
      variation: v,
      lastActiveEndDate: null,
      resensitising: v.name === 'Landmine Press', // the best match for bottom-range is locked out
    }));
    const result = selectNextVariation(pattern, candidates, 'Standing Barbell Overhead Press', 'bottom-range');
    expect(result.variation.name).not.toBe('Landmine Press');
  });
});

describe('isResensitised', () => {
  const mkClosed = (id: string, variation: string, endDate: string): LifecycleRecord => ({
    id, movement_pattern: 'squat', variation_name: variation, rep_range_low: 5, rep_range_high: 10,
    start_date: endDate, end_date: endDate, starting_load: 100, ending_load: 110, carryover_in: 0, carryover_out: 10, status: 'closed',
  });

  it('is eligible immediately if never used before', () => {
    expect(isResensitised('Front Squat', [], 'squat')).toBe(true);
  });

  it('is not eligible right after it was the most recently closed lifecycle', () => {
    const lifecycles = [mkClosed('1', 'Back Squat', '2026-01-01'), mkClosed('2', 'Front Squat', '2026-02-01')];
    expect(isResensitised('Front Squat', lifecycles, 'squat')).toBe(false);
  });

  it('becomes eligible again after the configured number of other lifecycles have closed', () => {
    const lifecycles = [
      mkClosed('1', 'Front Squat', '2026-01-01'),
      mkClosed('2', 'Back Squat', '2026-02-01'),
      mkClosed('3', 'Box Squat', '2026-03-01'),
    ];
    expect(isResensitised('Front Squat', lifecycles, 'squat')).toBe(true);
  });
});

describe('leading / back-off set targets', () => {
  it('starts at the lifecycle starting load and top of rep range with no prior session', () => {
    const targets = computeSessionTargets(null, 6, 12, 100);
    expect(targets.leading).toEqual({ load: 100, reps: 12 });
  });

  it('back-off load defaults to 85% of the leading load', () => {
    expect(defaultBackoffLoad(100)).toBe(85);
  });

  it('nudges load up and reps down by one when reps are above the floor', () => {
    const last = session('2026-06-01', 100, 10);
    const targets = computeSessionTargets(last, 6, 12, 100);
    expect(targets.leading.load).toBeGreaterThan(100);
    expect(targets.leading.reps).toBe(9);
  });

  it('holds load steady once reps have hit the floor (the end-trigger check decides rotation, not this function)', () => {
    const last = session('2026-06-01', 100, 6);
    const targets = computeSessionTargets(last, 6, 12, 100);
    expect(targets.leading.load).toBe(100);
  });

  it('back-off set is always lighter than the leading set and in a higher rep range', () => {
    const last = session('2026-06-01', 100, 10);
    const targets = computeSessionTargets(last, 6, 12, 100);
    expect(targets.backoff.load).toBeLessThan(targets.leading.load);
    expect(targets.backoff.reps).toBeGreaterThan(targets.leading.reps);
  });
});
