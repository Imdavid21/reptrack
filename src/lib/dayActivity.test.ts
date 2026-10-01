import { describe, expect, it } from 'vitest';
import { estimateDayActivity, workoutNetKcal, timingFromWorkout } from './dayActivity';
import { estimateActivity, netActivityKcal } from './energyEngineV3';

const weight = 75;

const workout = {
  id: 'w1',
  date: '2026-08-10',
  day_name: 'Legs',
  started_at: '2026-08-10T08:00:00.000Z',
  completed_at: '2026-08-10T09:25:00.000Z',
  explicit_pause_seconds: 0,
  workout_duration_minutes: 85,
  is_skipped: false,
  exercises: [
    { category: 'compound', completed: true },
    { category: 'compound', completed: true },
    { category: 'accessory', completed: true },
    { category: 'accessory', completed: false },
  ],
};

const walk = { date: '2026-08-10', source: 'manual', activity_type: 'walking', calories: 260, duration_minutes: 60, distance_km: 5 };
const cachedWorkoutBurn = { date: '2026-08-10', source: 'workout', activity_type: 'workout:w1', calories: 900, duration_minutes: 85, distance_km: null };

describe('estimateDayActivity', () => {
  it('produces the same total for the dashboard and the history page', () => {
    // Both screens call this helper with the same rows, which is the whole
    // point of the shared module: they cannot drift apart again.
    const dashboard = estimateDayActivity({ date: '2026-08-10', workouts: [workout], burns: [walk, cachedWorkoutBurn], weight });
    const history = estimateDayActivity({ date: '2026-08-10', workouts: [workout], burns: [cachedWorkoutBurn, walk], weight });
    expect(history.total).toBeCloseTo(dashboard.total, 6);
    expect(history.categories).toEqual(dashboard.categories);
  });

  it('ignores the persisted workout burn row so the session is not counted twice', () => {
    const withCache = estimateDayActivity({ date: '2026-08-10', workouts: [workout], burns: [cachedWorkoutBurn], weight });
    const withoutCache = estimateDayActivity({ date: '2026-08-10', workouts: [workout], burns: [], weight });
    expect(withCache.total).toBeCloseTo(withoutCache.total, 6);
    expect(withCache.categories.workout).toBeCloseTo(workoutNetKcal(workout, weight), 6);
  });

  it('recomputes manual activity instead of trusting a stored gross-MET figure', () => {
    const result = estimateDayActivity({ date: '2026-08-10', workouts: [], burns: [walk], weight });
    const expected = estimateActivity({ kind: 'walking', date: '2026-08-10', weight, distanceKm: 5, durationMinutes: 60 }).netKcal;
    expect(result.categories.walking).toBeCloseTo(expected, 6);
    // The stored 260 kcal was a gross figure; the net answer must be lower.
    expect(result.categories.walking).toBeLessThan(walk.calories);
  });

  it('keeps activity net of rest so it can be added to a maintenance baseline', () => {
    const result = estimateDayActivity({ date: '2026-08-10', workouts: [], burns: [walk], weight });
    const met = estimateActivity({ kind: 'walking', date: '2026-08-10', weight, distanceKm: 5, durationMinutes: 60 }).met;
    expect(result.categories.walking).toBeCloseTo(netActivityKcal(met, weight, 60), 0);
  });

  it('falls back to the stored value only when there is nothing to recompute from', () => {
    const odd = { date: '2026-08-10', source: 'steps', activity_type: 'steps', calories: 120, duration_minutes: null, distance_km: null };
    const result = estimateDayActivity({ date: '2026-08-10', workouts: [], burns: [odd], weight });
    expect(result.categories.other).toBe(120);
  });

  it('excludes skipped and unfinished workouts', () => {
    expect(estimateDayActivity({ date: '2026-08-10', workouts: [{ ...workout, is_skipped: true }], burns: [], weight }).total).toBe(0);
    expect(estimateDayActivity({ date: '2026-08-10', workouts: [{ ...workout, completed_at: null }], burns: [], weight }).total).toBe(0);
  });

  it('uses the saved active duration and never subtracts a pause twice', () => {
    expect(timingFromWorkout(workout).elapsedMinutes).toBeCloseTo(85, 6);
    expect(timingFromWorkout({ ...workout, started_at: null, completed_at: null, workout_duration_minutes: 40 })).toEqual({ elapsedMinutes: 40, pausedSeconds: 0 });
    const corrected = { ...workout, workout_duration_minutes: 76, explicit_pause_seconds: 2828, completed_at: '2026-08-10T09:36:00.000Z' };
    expect(timingFromWorkout(corrected)).toEqual({ elapsedMinutes: 76, pausedSeconds: 0 });
    expect(workoutNetKcal(corrected, 70.02)).toBeCloseTo(netActivityKcal(3.5, 70.02, 76), 1);
    expect(timingFromWorkout({ ...workout, workout_duration_minutes: null, explicit_pause_seconds: 300 })).toEqual({ elapsedMinutes: 85, pausedSeconds: 300 });
  });
});
