import { describe, expect, it } from 'vitest';
import { progressInterpretation, summarizeSleep, summarizeTraining, summarizeWeight } from './progressSummary';
import type { DailyMetric } from '@/hooks/useDailyMetrics';
import type { Workout } from '@/hooks/useWorkouts';

const metric = (date: string, bodyweight: number | null, sleep: number | null): DailyMetric => ({
  id: date,
  user_id: 'u',
  date,
  pullups: 0,
  notes: null,
  bodyweight,
  sleep_hours: sleep,
});

describe('progress summaries', () => {
  it('keeps missing weight distinct from zero and computes a 7-day average', () => {
    const result = summarizeWeight([
      metric('2026-08-15', 73.2, null),
      metric('2026-08-17', null, null),
      metric('2026-08-20', 72.8, null),
      metric('2026-08-23', 72.5, null),
    ], 30);
    expect(result.latest).toBe(72.5);
    expect(result.average7d).toBe(72.65);
    expect(result.change).toBe(-0.7);
    expect(result.measurements).toBe(3);
  });

  it('averages only actually logged sleep observations', () => {
    const result = summarizeSleep([
      metric('2026-08-20', null, 7),
      metric('2026-08-21', null, null),
      metric('2026-08-22', null, 8),
    ]);
    expect(result.average).toBe(7.5);
    expect(result.observations).toBe(2);
  });

  it('does not count skipped workouts as training', () => {
    const workouts = [
      { id: '1', date: '2026-08-20', completed_at: 'x', workout_duration_minutes: 60, exercises: [], is_skipped: false },
      { id: '2', date: '2026-08-21', completed_at: 'x', workout_duration_minutes: 0, exercises: [], is_skipped: true },
    ] as unknown as Workout[];
    expect(summarizeTraining(workouts, '2026-08-01', '2026-08-23').workouts).toBe(1);
  });

  it('uses cautious factual interpretation', () => {
    const text = progressInterpretation({
      weight: { latest: 72.5, latestDate: '2026-08-23', average7d: 72.7, change: -1, weeklyRate: -0.4, measurements: 8 },
      workouts: 8,
      rangeDays: 14,
      sleepAverage: 7.2,
    });
    expect(text).toContain('trending down');
    expect(text).toContain('sessions/week');
    expect(text).not.toContain('fat');
  });
});
