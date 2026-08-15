import { describe, it, expect } from 'vitest';
import { isResumableDraft, draftDateKey, DraftWorkout } from './useDraftWorkout';

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
  it('rejects a draft older than 24h', () => {
    const old = new Date(Date.now() - 25 * 3600_000).toISOString();
    expect(isResumableDraft(base({ lastSavedAt: old }))).toBe(false);
  });
});

describe('draftDateKey', () => {
  it('returns the local day of the draft', () => {
    const d = new Date(2026, 5, 6, 10, 0, 0);
    expect(draftDateKey(base({ date: d.toISOString() }))).toBe('2026-06-06');
  });
});
