import { describe, expect, it } from 'vitest';
import { buildTemporalAnalysis } from './temporal';

const meal = (date: string, protein: number) => ({ date, calories: 2000, protein, fiber: 25, carbs: 200, fat: 65, sugar: 30, sodium: 2000, potassium: 3000 });

describe('Data Room temporal decisions', () => {
  it('keeps day-to-day scale movement descriptive rather than prescriptive', () => {
    const result = buildTemporalAnalysis({
      endDate: '2026-08-21', proteinGoal: 160, sleepGoal: 8,
      metrics: [
        { date: '2026-08-20', bodyweight: 74, sleep: 8 },
        { date: '2026-08-21', bodyweight: 74.8, sleep: 7.8 },
      ],
      meals: [meal('2026-08-21', 100)], sets: [], workouts: [],
    });
    const weight = result.today.metrics.find(metric => metric.key === 'bodyweight');
    expect(weight?.delta).toBe('+0.8 kg');
    expect(weight?.tone).toBe('neutral');
    expect(result.today.decision).toContain('Reserve programme and calorie changes');
  });

  it('compares rolling seven-day windows instead of calendar-week fragments', () => {
    const metrics = Array.from({ length: 14 }, (_, index) => {
      const day = String(index + 8).padStart(2, '0');
      return { date: `2026-08-${day}`, bodyweight: index < 7 ? 75 : 74, sleep: index < 7 ? 7 : 8 };
    });
    const meals = Array.from({ length: 14 }, (_, index) => meal(`2026-08-${String(index + 8).padStart(2, '0')}`, index < 7 ? 120 : 165));
    const result = buildTemporalAnalysis({ endDate: '2026-08-21', proteinGoal: 160, sleepGoal: 8, metrics, meals, sets: [], workouts: [] });
    expect(result.week.metrics.find(metric => metric.key === 'bodyweight')?.delta).toBe('-1 kg');
    expect(result.week.metrics.find(metric => metric.key === 'protein')?.tone).toBe('positive');
  });

  it('only compares strength using exercises present in both windows', () => {
    const sets = [
      { exercise: 'Bench', date: '2026-08-01', weight: 80, reps: 8 },
      { exercise: 'Bench', date: '2026-08-18', weight: 82.5, reps: 8 },
      { exercise: 'Deadlift', date: '2026-08-18', weight: 150, reps: 5 },
    ];
    const result = buildTemporalAnalysis({ endDate: '2026-08-21', proteinGoal: 160, sleepGoal: 8, metrics: [], meals: [], sets, workouts: [] });
    const strength = result.month?.metrics.find(metric => metric.key === 'strength');
    expect(strength?.detail).toContain('1 exercises');
  });

  it('does not turn incomplete current-day protein into a negative intervention', () => {
    const result = buildTemporalAnalysis({ endDate: '2026-08-21', proteinGoal: 160, sleepGoal: 8, metrics: [], meals: [meal('2026-08-21', 40)], sets: [], workouts: [] });
    expect(result.today.metrics.find(metric => metric.key === 'protein')?.tone).toBe('neutral');
  });

  it('adds a selected-range comparison for 60 and 90 day views', () => {
    const sixty = buildTemporalAnalysis({ endDate: '2026-08-21', proteinGoal: 160, sleepGoal: 8, metrics: [], meals: [], sets: [], workouts: [] }, 60);
    const ninety = buildTemporalAnalysis({ endDate: '2026-08-21', proteinGoal: 160, sleepGoal: 8, metrics: [], meals: [], sets: [], workouts: [] }, 90);
    expect(sixty.range?.title).toBe('Last 60 days');
    expect(sixty.range?.subtitle).toContain('Latest 30 days');
    expect(ninety.range?.title).toBe('Last 90 days');
    expect(ninety.range?.subtitle).toContain('Latest 45 days');
  });

  it('does not show a month panel when the selected range is shorter than 28 days', () => {
    const result = buildTemporalAnalysis({ endDate: '2026-08-21', proteinGoal: 160, sleepGoal: 8, metrics: [], meals: [], sets: [], workouts: [] }, 14);
    expect(result.month).toBeUndefined();
    expect(result.range?.title).toBe('Last 14 days');
  });
});
