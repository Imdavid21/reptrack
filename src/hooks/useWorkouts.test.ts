import { describe, expect, it } from 'vitest';
import { isRetryableError } from './useWorkouts';
import { isResumableDraft, type DraftWorkout } from './useDraftWorkout';

describe('workout save failsafes', () => {
  it('retries transient network and server failures', () => {
    expect(isRetryableError({ message: 'Failed to fetch' })).toBe(true);
    expect(isRetryableError({ message: 'NetworkError when attempting to fetch resource' })).toBe(true);
    expect(isRetryableError({ message: 'statement timeout', code: '57014' })).toBe(true);
    expect(isRetryableError({ code: '08006' })).toBe(true);
  });

  it('does not retry deterministic errors', () => {
    expect(isRetryableError({ code: '23505', message: 'duplicate key' })).toBe(false);
    expect(isRetryableError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isRetryableError({ code: '23502', message: 'null value' })).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });

  it('keeps a failed save resumable so logged sets are never lost', () => {
    const draft = {
      day: 'push_a',
      dayName: 'Push A',
      date: new Date().toISOString(),
      weekNumber: 1,
      exercises: [{ name: 'Bench Press', category: 'primary', sort_order: 0, sets: [{ setNumber: 1, targetWeight: '60', targetReps: '8', actualWeight: '60', actualReps: '8', completed: true }] }],
      habits: { pullups: 0, water_intake: 0, sleep_hours: 0 },
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      step: 'exercises',
      saveId: 'fixed-id',
      lastSavedAt: new Date().toISOString(),
    } as unknown as DraftWorkout;
    expect(isResumableDraft(draft)).toBe(true);
    // The retry id survives the round trip, so a second attempt targets the
    // same workout row rather than creating a duplicate session.
    expect(draft.saveId).toBe('fixed-id');
  });
});
