import { describe, expect, it } from 'vitest';
import { evidenceCoverage, percentDelta, previousComparableRange, summarizeDataroomPeriod } from './overview';

describe('Dataroom period comparison', () => {
  it('builds an immediately preceding equal-length comparison window', () => {
    const current = { from: new Date('2026-08-18T12:00:00'), to: new Date('2026-08-23T12:00:00') };
    const previous = previousComparableRange(current);
    expect(previous.from.toISOString().slice(0, 10)).toBe('2026-08-12');
    expect(previous.to.toISOString().slice(0, 10)).toBe('2026-08-17');
  });

  it('does not produce percentage change from a zero denominator', () => {
    expect(percentDelta(5, 0)).toBeNull();
  });
});

describe('Dataroom period summaries', () => {
  it('keeps missing days out of nutrition averages', () => {
    const summary = summarizeDataroomPeriod({
      range: { from: new Date('2026-08-01T12:00:00'), to: new Date('2026-08-07T12:00:00') },
      metrics: [],
      workouts: [],
      sets: [],
      meals: [
        { date: '2026-08-01', calories: 2000, protein: 150 },
        { date: '2026-08-01', calories: 500, protein: 30 },
        { date: '2026-08-03', calories: 1800, protein: 160 },
      ],
      activities: [],
    });
    expect(summary.nutritionLoggedDays).toBe(2);
    expect(summary.caloriesPerLoggedDay).toBe(2150);
    expect(summary.proteinPerLoggedDay).toBe(170);
  });

  it('counts completed, non-skipped workouts only', () => {
    const summary = summarizeDataroomPeriod({
      range: { from: new Date('2026-08-01T12:00:00'), to: new Date('2026-08-07T12:00:00') },
      metrics: [],
      workouts: [
        { date: '2026-08-01', completed_at: '2026-08-01T10:00:00Z' },
        { date: '2026-08-02', completed_at: null },
        { date: '2026-08-03', completed_at: '2026-08-03T10:00:00Z', is_skipped: true },
      ],
      sets: [], meals: [], activities: [],
    });
    expect(summary.workouts).toBe(1);
  });
});

describe('Evidence coverage', () => {
  it('never exceeds 100 percent even with duplicate or dense source rows', () => {
    const coverage = evidenceCoverage({ days: 7, weightMeasurements: 12, workouts: 5, nutritionLoggedDays: 9, sleepNights: 8, activitySessions: 3 });
    expect(coverage.weight.percent).toBe(100);
    expect(coverage.nutrition.percent).toBe(100);
    expect(coverage.sleep.percent).toBe(100);
  });
});
