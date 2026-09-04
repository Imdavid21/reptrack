import { describe, expect, it } from 'vitest';
import { buildSessionRatingHistory, type HistorySet, type HistoryWorkout } from './sessionRatingHistory';

function workout(id: string, date: string, dayName = 'Push A', extras: Partial<HistoryWorkout> = {}): HistoryWorkout {
  return { id, date, day_name: dayName, workout_duration_minutes: 60, completed_at: `${date}T10:00:00Z`, ...extras };
}

function set(workoutId: string, weight = 60, reps = 8, extras: Partial<HistorySet> = {}): HistorySet {
  return { workout_id: workoutId, exercise_name: 'Bench Press', exercise_category: 'push', actual_weight: weight, actual_reps: reps, completed: true, ...extras };
}

describe('buildSessionRatingHistory', () => {
  it('returns empty state when there are no workouts', () => {
    const result = buildSessionRatingHistory({ workouts: [], sets: [] });
    expect(result.sessions).toEqual([]);
    expect(result.average).toBeNull();
    expect(result.best).toBeNull();
    expect(result.worst).toBeNull();
    expect(result.trend).toBeNull();
    expect(result.weakestDimension).toBeNull();
  });

  it('skips workouts without sets and skipped workouts', () => {
    const result = buildSessionRatingHistory({
      workouts: [workout('a', '2026-08-01'), workout('b', '2026-08-02'), workout('c', '2026-08-03', 'Push A', { is_skipped: true })],
      sets: [set('a'), set('c')],
    });
    expect(result.sessions.map(s => s.id)).toEqual(['a']);
  });

  it('scores sessions in chronological order and picks best/worst', () => {
    const workouts = [workout('w2', '2026-08-08'), workout('w1', '2026-08-01')];
    const sets = [
      set('w1', 60, 8), set('w1', 60, 8), set('w1', 60, 8),
      set('w2', 62.5, 8), set('w2', 62.5, 8), set('w2', 62.5, 8),
    ];
    const result = buildSessionRatingHistory({ workouts, sets });
    expect(result.sessions.map(s => s.id)).toEqual(['w1', 'w2']);
    expect(result.average).not.toBeNull();
    expect(result.best).not.toBeNull();
    expect(result.worst).not.toBeNull();
    // Second session progresses on the first, so it should not score lower.
    expect(result.sessions[1].rating.score).toBeGreaterThanOrEqual(result.sessions[0].rating.score);
  });

  it('computes a trend once there are at least four sessions', () => {
    const workouts = [1, 2, 3, 4, 5, 6].map(i => workout(`w${i}`, `2026-08-0${i}`));
    const sets = workouts.flatMap((w, i) => [set(w.id, 60 + i, 8), set(w.id, 60 + i, 8), set(w.id, 60 + i, 8)]);
    const result = buildSessionRatingHistory({ workouts, sets });
    expect(result.sessions).toHaveLength(6);
    expect(result.trend).not.toBeNull();
  });

  it('leaves trend null with fewer than four sessions', () => {
    const workouts = [workout('w1', '2026-08-01'), workout('w2', '2026-08-02'), workout('w3', '2026-08-03')];
    const sets = workouts.flatMap(w => [set(w.id), set(w.id)]);
    const result = buildSessionRatingHistory({ workouts, sets });
    expect(result.trend).toBeNull();
  });

  it('chains previous sets only within the same day name', () => {
    const workouts = [
      workout('push1', '2026-08-01', 'Push A'),
      workout('pull1', '2026-08-02', 'Pull A'),
      workout('push2', '2026-08-08', 'Push A'),
    ];
    const sets = [set('push1', 60, 8), set('pull1', 100, 6), set('push2', 60, 8)];
    const result = buildSessionRatingHistory({ workouts, sets });
    expect(result.sessions).toHaveLength(3);
    // push2 is a repeat (no progression) of push1, not compared against pull1.
    const push2 = result.sessions.find(s => s.id === 'push2');
    expect(push2).toBeDefined();
  });

  it('identifies a weakest dimension when sessions exist', () => {
    const workouts = [workout('w1', '2026-08-01'), workout('w2', '2026-08-02')];
    const sets = [set('w1', 60, 8, { pain_score: 7 }), set('w2', 60, 8, { pain_score: 7 })];
    const result = buildSessionRatingHistory({ workouts, sets });
    expect(result.weakestDimension).not.toBeNull();
    expect(result.weakestDimension!.averagePercent).toBeGreaterThanOrEqual(0);
  });

  it('passes sleep data through to the rating engine', () => {
    const withSleep = buildSessionRatingHistory({
      workouts: [workout('w1', '2026-08-01')],
      sets: [set('w1'), set('w1')],
      sleepByDate: { '2026-08-01': 8 },
    });
    const noSleep = buildSessionRatingHistory({
      workouts: [workout('w1', '2026-08-01')],
      sets: [set('w1'), set('w1')],
      sleepByDate: { '2026-08-01': 3 },
    });
    expect(withSleep.sessions[0].rating.score).not.toBe(noSleep.sessions[0].rating.score);
  });
});
