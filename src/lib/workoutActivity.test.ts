import { describe, it, expect, vi } from 'vitest';
import { saveWorkoutActivity, validWorkoutMinutes } from './workoutActivity';

describe('workout activity identity', () => {
  it('updates the same activity ID when the workout date changes', async () => {
    const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    const insert = vi.fn();
    const lookup: any = { eq: vi.fn(() => lookup), maybeSingle: vi.fn(async () => ({ data: { id: 'original-burn' }, error: null })) };
    const db = { from: vi.fn(() => ({ select: () => lookup, update, insert })) };
    const payload = { user_id: 'owner', source: 'workout', activity_type: 'workout:c7461d8e-fd48-46e5-a1a4-91b6ee0c7dbe', date: '2026-10-08', duration_minutes: 50, calories: 271 };
    await saveWorkoutActivity(db, payload);
    expect(update).toHaveBeenCalledWith(payload);
    expect(update.mock.results[0].value.eq).toHaveBeenCalledWith('id', 'original-burn');
    expect(insert).not.toHaveBeenCalled();
  });
  it('rejects nonfinite and excessive durations', () => {
    expect(validWorkoutMinutes(Infinity)).toBe(0);
    expect(validWorkoutMinutes(5736)).toBe(0);
    expect(validWorkoutMinutes(50)).toBe(50);
  });
});