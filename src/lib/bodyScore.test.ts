import { describe, it, expect } from 'vitest';
import { computeBodyOverview, normalizeWaterGoalLiters, computeScoreSeries, BodyOverviewInput } from './bodyScore';

const baseGoals = {
  weeklyWorkouts: 4,
  dailyCalories: 2400,
  dailyProtein: 160,
  dailyWaterLiters: 3,
  sleepHours: 8,
  weightGoalType: null as 'lose' | 'gain' | 'maintain' | null,
};

function makeInput(overrides: Partial<BodyOverviewInput> = {}): BodyOverviewInput {
  return {
    rangeDays: 14,
    goals: { ...baseGoals },
    workoutDates: [],
    meals: [],
    waterByDay: {},
    metrics: [],
    ...overrides,
    ...(overrides.goals ? { goals: { ...baseGoals, ...overrides.goals } } : {}),
  };
}

describe('normalizeWaterGoalLiters', () => {
  it('treats values over 100 as milliliters', () => {
    expect(normalizeWaterGoalLiters(3000)).toBe(3);
    expect(normalizeWaterGoalLiters(2500)).toBe(2.5);
  });
  it('treats small values as liters already', () => {
    expect(normalizeWaterGoalLiters(3)).toBe(3);
    expect(normalizeWaterGoalLiters(4.5)).toBe(4.5);
  });
  it('falls back to 3L for missing or invalid values', () => {
    expect(normalizeWaterGoalLiters(null)).toBe(3);
    expect(normalizeWaterGoalLiters(0)).toBe(3);
    expect(normalizeWaterGoalLiters(undefined)).toBe(3);
  });
});

describe('computeBodyOverview', () => {
  it('returns null overall with no data at all in a short range', () => {
    const o = computeBodyOverview(makeInput({ rangeDays: 3 }));
    expect(o.overall).toBeNull();
    expect(o.activeDays).toBe(0);
  });

  it('scores training at 100 when hitting the weekly goal', () => {
    // 8 sessions in 14 days = 4/wk, goal 4/wk
    const dates = ['2026-06-01', '2026-06-02', '2026-06-04', '2026-06-05',
      '2026-06-08', '2026-06-09', '2026-06-11', '2026-06-12'];
    const o = computeBodyOverview(makeInput({ workoutDates: dates }));
    expect(o.pillars.training.score).toBe(100);
  });

  it('does not score fuel with fewer than 3 tracked days', () => {
    const o = computeBodyOverview(makeInput({
      meals: [
        { date: '2026-06-01', calories: 2400, protein: 160 },
        { date: '2026-06-02', calories: 2400, protein: 160 },
      ],
    }));
    expect(o.pillars.fuel.score).toBeNull();
    expect(o.pillars.fuel.daysWithData).toBe(2);
  });

  it('sums multiple meals on the same day before scoring', () => {
    const meals = ['2026-06-01', '2026-06-02', '2026-06-03'].flatMap(date => [
      { date, calories: 1200, protein: 80 },
      { date, calories: 1200, protein: 80 },
    ]);
    const o = computeBodyOverview(makeInput({ rangeDays: 3, meals }));
    // 2400 kcal vs 2400 goal and 160g vs 160g goal: full marks on both,
    // plus 3/3 tracking days → 100.
    expect(o.pillars.fuel.score).toBe(100);
  });

  it('caps hydration at 100 even when over goal', () => {
    const o = computeBodyOverview(makeInput({
      waterByDay: { '2026-06-01': 5, '2026-06-02': 5, '2026-06-03': 5 },
    }));
    expect(o.pillars.hydration.score).toBe(100);
  });

  it('renormalizes the overall score over scored pillars only', () => {
    // Only hydration has data → overall should equal the hydration score.
    const o = computeBodyOverview(makeInput({
      rangeDays: 3, // keep training unscored (null) in the short range
      waterByDay: { '2026-06-01': 1.5, '2026-06-02': 1.5, '2026-06-03': 1.5 },
    }));
    expect(o.pillars.hydration.score).toBe(50);
    expect(o.overall).toBe(50);
  });

  it('recommends the next split day when behind the weekly goal', () => {
    const o = computeBodyOverview(makeInput({
      workoutDates: ['2026-06-01', '2026-06-08'], // 1/wk vs 4/wk goal
      nextDayName: 'Push A',
      nextDayKey: 'Day 1',
    }));
    const step = o.nextSteps.find(s => s.id === 'training-behind');
    expect(step).toBeDefined();
    expect(step!.title).toContain('Push A');
    expect(step!.route).toBe('/app/log?day=Day%201');
  });

  it('asks for the first workout when there is no training history', () => {
    const o = computeBodyOverview(makeInput({ rangeDays: 14 }));
    expect(o.nextSteps[0]?.id).toBe('first-workout');
  });

  it('flags low protein with the gram gap', () => {
    const meals = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04'].map(date => ({
      date, calories: 2400, protein: 100, // 100g vs 160g goal
    }));
    const o = computeBodyOverview(makeInput({ meals }));
    const step = o.nextSteps.find(s => s.id === 'protein-low');
    expect(step).toBeDefined();
    expect(step!.title).toContain('60g');
  });

  it('flags weight moving against a lose goal', () => {
    const o = computeBodyOverview(makeInput({
      goals: { ...baseGoals, weightGoalType: 'lose' },
      metrics: [
        { date: '2026-06-01', sleep_hours: null, bodyweight: 80 },
        { date: '2026-06-04', sleep_hours: null, bodyweight: 80.5 },
        { date: '2026-06-08', sleep_hours: null, bodyweight: 81 },
        { date: '2026-06-12', sleep_hours: null, bodyweight: 81.5 },
      ],
    }));
    const step = o.nextSteps.find(s => s.id === 'weight-direction');
    expect(step).toBeDefined();
    expect(step!.detail).toContain('+1.5kg');
  });

  it('suggests earlier bedtime when sleep is under goal', () => {
    const o = computeBodyOverview(makeInput({
      metrics: [
        { date: '2026-06-01', sleep_hours: 6.5, bodyweight: null },
        { date: '2026-06-02', sleep_hours: 6.5, bodyweight: null },
        { date: '2026-06-03', sleep_hours: 6.5, bodyweight: null },
      ],
    }));
    const step = o.nextSteps.find(s => s.id === 'sleep-short');
    expect(step).toBeDefined();
    expect(step!.title).toContain('90 min');
  });

  it('computes a rolling score per window from the same engine', () => {
    const goals = { ...baseGoals };
    const data = {
      workoutDates: [] as string[],
      meals: [] as BodyOverviewInput['meals'],
      // Hydration is the only scored pillar so we can predict the number.
      waterByDay: {
        '2026-06-01': 1.5, '2026-06-02': 1.5, '2026-06-03': 1.5,
        '2026-06-08': 3, '2026-06-09': 3, '2026-06-10': 3,
      },
      metrics: [] as BodyOverviewInput['metrics'],
    };
    const series = computeScoreSeries(
      [
        { date: '2026-06-03', fromKey: '2026-05-28', toKey: '2026-06-03' },
        { date: '2026-06-10', fromKey: '2026-06-04', toKey: '2026-06-10' },
      ],
      data,
      () => goals,
      7,
    );
    // Each 7-day window has zero workouts → training scores 0 (a week of no
    // training drags the score down). Hydration is 50 then 100.
    // Overall = (0*0.35 + hydration*0.15) / (0.35 + 0.15).
    expect(series.map(p => p.score)).toEqual([15, 30]);
  });

  it('returns a null score for a short window with too little data', () => {
    // 6-day window (< 7) → training is null too, so with only 1 water day
    // no pillar is scorable and the overall is null.
    const series = computeScoreSeries(
      [{ date: '2026-06-03', fromKey: '2026-05-29', toKey: '2026-06-03' }],
      { workoutDates: [], meals: [], waterByDay: { '2026-06-01': 2 }, metrics: [] },
      () => ({ ...baseGoals }),
      6,
    );
    expect(series[0].score).toBeNull();
  });

  it('never returns more than 4 next steps', () => {
    const o = computeBodyOverview(makeInput({
      goals: { ...baseGoals, weightGoalType: 'lose' },
      workoutDates: ['2026-06-01'], // behind goal
      meals: [
        { date: '2026-06-01', calories: 1500, protein: 60 },
        { date: '2026-06-02', calories: 1500, protein: 60 },
        { date: '2026-06-03', calories: 1500, protein: 60 },
      ],
      waterByDay: { '2026-06-01': 1, '2026-06-02': 1, '2026-06-03': 1 },
      metrics: [
        { date: '2026-06-01', sleep_hours: 6, bodyweight: 80 },
        { date: '2026-06-02', sleep_hours: 6, bodyweight: 80.6 },
        { date: '2026-06-03', sleep_hours: 6, bodyweight: 81.2 },
        { date: '2026-06-04', sleep_hours: 6, bodyweight: 81.8 },
      ],
    }));
    expect(o.nextSteps.length).toBeLessThanOrEqual(4);
    expect(o.nextSteps.length).toBeGreaterThan(0);
  });
});
