import { describe, it, expect } from 'vitest';
import { isResumableDraft, draftDateKey, recoveryConflict, DraftWorkout } from './useDraftWorkout';

const base = (over: Partial<DraftWorkout> = {}): DraftWorkout => ({
  day: 'push_a',
  dayName: 'Push A',
  date: new Date().toISOString(),
  weekNumber: 1,
  exercises: [{ name: 'Bench', sets: [{ completed: true }] } as any],
  habits: { pullups: 0, water_intake: 0, sleep_hours: 0 } as any,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  step: 'exercises',
  lastSavedAt: new Date().toISOString(),
  ...over,
});

describe('isResumableDraft', () => {
  it('accepts a fresh in-progress draft', () => {
    expect(isResumableDraft(base())).toBe(true);
  });
  it('rejects null and empty drafts', () => {
    expect(isResumableDraft(null)).toBe(false);
    expect(isResumableDraft(base({ exercises: [] }))).toBe(false);
  });
  it('rejects a day-picker draft', () => {
    expect(isResumableDraft(base({ step: 'select-day' }))).toBe(false);
  });
  it('rejects a draft older than seven days', () => {
    const old = new Date(Date.now() - 8 * 24 * 3600_000).toISOString();
    expect(isResumableDraft(base({ lastSavedAt: old }))).toBe(false);
  });
  it('can recover a workout after more than 24 hours', () => {
    expect(isResumableDraft(base({ lastSavedAt: new Date(Date.now() - 25 * 3600_000).toISOString() }))).toBe(true);
  });
});

describe('recoveryConflict', () => {
  it('does not ask when both copies have the same saved sets', () => {
    const draft = base({ saveId: 'workout-one' });
    expect(recoveryConflict(draft, { ...draft })).toBe(false);
  });
  it('asks before overwriting sets from another saved copy', () => {
    expect(recoveryConflict(base({ saveId: 'workout-one' }), base({ saveId: 'workout-two' }))).toBe(true);
  });
});

describe('draftDateKey', () => {
  it('returns the local day of the draft', () => {
    const d = new Date(2026, 5, 6, 10, 0, 0);
    expect(draftDateKey(base({ date: d.toISOString() }))).toBe('2026-06-06');
  });
});
