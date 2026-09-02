import { describe, it, expect } from 'vitest';
import { rateWorkout, type RatingSet } from './workoutRating';

function set(overrides: Partial<RatingSet> = {}): RatingSet {
  return { name: 'Bench Press (Set 1)', category: 'Chest', weight: 60, reps: 10, completed: true, ...overrides };
}

describe('rateWorkout', () => {
  it('returns null when nothing was completed', () => {
    expect(rateWorkout({ dayName: 'Push', sets: [set({ completed: false })] })).toBeNull();
  });

  it('scores a solid push session in a good band', () => {
    const sets = [
      set({ name: 'Bench Press (Set 1)', category: 'Chest', rir: 2 }),
      set({ name: 'Bench Press (Set 2)', category: 'Chest', rir: 1 }),
      set({ name: 'Overhead Press (Set 1)', category: 'Shoulders', weight: 30, reps: 10, rir: 2 }),
      set({ name: 'Tricep Pushdown (Set 1)', category: 'Triceps', weight: 25, reps: 12, rir: 2 }),
      set({ name: 'Tricep Pushdown (Set 2)', category: 'Triceps', weight: 25, reps: 12, rir: 1 }),
    ];
    const rating = rateWorkout({ dayName: 'Push', sets, sleepHours: 7.5 })!;
    expect(rating.score).toBeGreaterThanOrEqual(65);
    expect(rating.dimensions).toHaveLength(7);
    expect(rating.dimensions.reduce((sum, d) => sum + d.max, 0)).toBe(100);
  });

  it('caps the score at 59 when high pain is reported', () => {
    const sets = [
      set({ pain: 8, rir: 1 }),
      set({ name: 'Bench Press (Set 2)', pain: 2, rir: 2 }),
      set({ name: 'Overhead Press (Set 1)', category: 'Shoulders', pain: 1, rir: 2 }),
      set({ name: 'Tricep Pushdown (Set 1)', category: 'Triceps', pain: 0, rir: 2 }),
    ];
    const rating = rateWorkout({ dayName: 'Push', sets, sleepHours: 8 })!;
    expect(rating.score).toBeLessThanOrEqual(59);
    expect(rating.issues.join(' ')).toMatch(/pain/i);
  });

  it('flags missing muscle groups for the day pattern', () => {
    const rating = rateWorkout({ dayName: 'Push', sets: [set(), set({ name: 'Bench Press (Set 2)' })] })!;
    expect(rating.issues.join(' ')).toMatch(/shoulders|triceps/i);
  });

  it('rewards progression against a previous session', () => {
    const previous = [set({ weight: 50, reps: 8 })];
    const current = [set({ weight: 60, reps: 10 }), set({ name: 'Overhead Press (Set 1)', category: 'Shoulders' }), set({ name: 'Tricep Pushdown (Set 1)', category: 'Triceps' })];
    const rating = rateWorkout({ dayName: 'Push', sets: current, previousSets: previous })!;
    const progression = rating.dimensions.find(d => d.key === 'progression')!;
    expect(progression.score).toBeGreaterThanOrEqual(13);
    expect(rating.confidence).not.toBe('low');
  });

  it('penalises regression against a previous session', () => {
    const previous = [set({ weight: 80, reps: 10 })];
    const current = [set({ weight: 50, reps: 8 })];
    const rating = rateWorkout({ dayName: 'Push', sets: current, previousSets: previous })!;
    const progression = rating.dimensions.find(d => d.key === 'progression')!;
    expect(progression.score).toBeLessThan(10);
  });

  it('lowers fatigue score for poor sleep and long sessions', () => {
    const rating = rateWorkout({ dayName: 'Push', sets: [set()], sleepHours: 4.5, durationMinutes: 180 })!;
    const fatigue = rating.dimensions.find(d => d.key === 'fatigue')!;
    expect(fatigue.score).toBeLessThanOrEqual(5);
  });

  it('scores adherence against planned sets', () => {
    const rating = rateWorkout({ dayName: 'Push', sets: [set(), set({ name: 'Bench Press (Set 2)' })], plannedSets: 10 })!;
    const adherence = rating.dimensions.find(d => d.key === 'adherence')!;
    expect(adherence.score).toBeLessThanOrEqual(3);
  });

  it('reports low confidence with no prior session or RIR data', () => {
    const rating = rateWorkout({ dayName: 'Push', sets: [set()] })!;
    expect(rating.confidence).toBe('low');
    expect(rating.provisional).toBe(true);
  });

  it('never exceeds 100 points', () => {
    const sets = Array.from({ length: 12 }, (_, index) => set({ name: `Bench Press (Set ${index + 1})`, rir: 2 }));
    const rating = rateWorkout({ dayName: 'Push', sets, sleepHours: 8, plannedSets: 12 })!;
    expect(rating.score).toBeLessThanOrEqual(100);
  });
});
