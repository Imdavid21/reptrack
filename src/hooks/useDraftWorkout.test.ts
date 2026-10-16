import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { isResumableDraft, draftDateKey, recoveryConflict, DraftWorkout, useDraftWorkout } from './useDraftWorkout';

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'recovery-test-account' }, loading: false },
  from: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('./useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

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

describe('ongoing workout recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.auth.user = { id: 'recovery-test-account' };
    mocks.rpc.mockResolvedValue({ error: null });
  });

  function accountSnapshot(snapshot: DraftWorkout) {
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: { save_id: snapshot.saveId, snapshot, status: 'active' }, error: null });
    mocks.from.mockReturnValue(query);
  }

  it('keeps active sets and saves silently when auth refreshes with a lagging account copy', async () => {
    const original = base({ saveId: 'workout-active' });
    localStorage.setItem('fittrack_draft_workout_recovery-test-account', JSON.stringify(original));
    accountSnapshot(original);
    const { result, rerender, unmount } = renderHook(() => useDraftWorkout());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const save = result.current.saveDraft;
    const progressed = { ...original, currentSetIndex: 1, exercises: [{ ...original.exercises[0], sets: [{ completed: true }, { completed: true }] }] } as DraftWorkout;
    act(() => result.current.saveDraft(progressed));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    mocks.auth.user = { id: 'recovery-test-account' };
    rerender();
    expect(result.current.saveDraft).toBe(save);
    expect(result.current.loaded).toBe(true);
    expect(result.current.conflict).toBeNull();
    expect(result.current.draft?.currentSetIndex).toBe(1);
    expect(result.current.draft?.exercises[0].sets).toHaveLength(2);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('still asks at recovery when device and account contain genuinely different sets', async () => {
    const local = base({ saveId: 'workout-active' });
    const cloud = { ...local, exercises: [{ ...local.exercises[0], sets: [{ completed: true }, { completed: true }] }] } as DraftWorkout;
    localStorage.setItem('fittrack_draft_workout_recovery-test-account', JSON.stringify(local));
    accountSnapshot(cloud);
    const { result, unmount } = renderHook(() => useDraftWorkout());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.conflict?.local.exercises[0].sets).toHaveLength(1);
    expect(result.current.conflict?.cloud.exercises[0].sets).toHaveLength(2);
    act(() => result.current.chooseDraft('account'));
    expect(result.current.conflict).toBeNull();
    expect(result.current.draft?.exercises[0].sets).toHaveLength(2);
    unmount();
  });
});
