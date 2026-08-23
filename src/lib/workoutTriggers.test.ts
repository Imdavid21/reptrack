import { describe, expect, it } from 'vitest';
import { evaluateTriggers, triggerFires, type SessionSnapshot, type WorkoutTrigger } from './workoutTriggers';

const snapshot: SessionSnapshot = {
  currentExercise: 'Neutral-Grip Lat Pulldown',
  lastSetWeight: 60,
  lastSetReps: 10,
  elapsedMinutes: 35,
  completedSets: 12,
  totalVolume: 8200,
};

const base: WorkoutTrigger = {
  id: 't1', condition_type: 'completed_sets', exercise_name: null, comparator: 'gte',
  threshold: 10, message: 'Halfway. Keep the rest short.', status: 'active', repeat_mode: 'once', fired_count: 0,
};

describe('workout triggers', () => {
  it('fires a numeric condition once the threshold is met', () => {
    expect(triggerFires(base, snapshot)).toBe(true);
    expect(triggerFires({ ...base, threshold: 20 }, snapshot)).toBe(false);
  });

  it('honours the lte comparator', () => {
    expect(triggerFires({ ...base, comparator: 'lte', threshold: 20 }, snapshot)).toBe(true);
    expect(triggerFires({ ...base, comparator: 'lte', threshold: 5 }, snapshot)).toBe(false);
  });

  it('matches exercises loosely so grip variants still count', () => {
    const trigger: WorkoutTrigger = { ...base, condition_type: 'exercise_started', exercise_name: 'Lat Pulldown', threshold: null };
    expect(triggerFires(trigger, snapshot)).toBe(true);
    expect(triggerFires({ ...trigger, exercise_name: 'Deadlift' }, snapshot)).toBe(false);
  });

  it('scopes weight and rep conditions to their exercise', () => {
    const weight: WorkoutTrigger = { ...base, condition_type: 'weight_at_least', exercise_name: 'Lat Pulldown', threshold: 55 };
    expect(triggerFires(weight, snapshot)).toBe(true);
    expect(triggerFires({ ...weight, exercise_name: 'Bench Press' }, snapshot)).toBe(false);
    expect(triggerFires({ ...weight, condition_type: 'reps_at_least', threshold: 12 }, snapshot)).toBe(false);
  });

  it('never refires a once trigger and skips inactive or expired ones', () => {
    expect(triggerFires({ ...base, fired_count: 1 }, snapshot)).toBe(false);
    expect(triggerFires({ ...base, fired_count: 3, repeat_mode: 'always' }, snapshot)).toBe(true);
    expect(triggerFires({ ...base, status: 'cancelled' }, snapshot)).toBe(false);
    expect(triggerFires({ ...base, expires_at: new Date(Date.now() - 1000).toISOString() }, snapshot)).toBe(false);
  });

  it('ignores unknown conditions and missing thresholds', () => {
    expect(triggerFires({ ...base, condition_type: 'phase_of_moon' }, snapshot)).toBe(false);
    expect(triggerFires({ ...base, threshold: null }, snapshot)).toBe(false);
  });

  it('returns every matching cue in order', () => {
    const fired = evaluateTriggers([
      base,
      { ...base, id: 't2', condition_type: 'elapsed_minutes', threshold: 30, message: 'Half an hour in.' },
      { ...base, id: 't3', condition_type: 'session_volume', threshold: 99999, message: 'Not yet.' },
    ], snapshot);
    expect(fired.map(t => t.id)).toEqual(['t1', 't2']);
  });
});
