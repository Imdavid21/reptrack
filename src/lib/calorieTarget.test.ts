import { describe, it, expect } from 'vitest';
import { computeCalorieTarget } from './calorieTarget';

const base = { dailyGoal: 2000, deficitMode: false, deficitTarget: 500, maintenance: null };

describe('computeCalorieTarget', () => {
  it('shows burn needed when net exceeds the goal', () => {
    const r = computeCalorieTarget({ ...base, eaten: 2400, burned: 100 });
    // net = 2300, goal = 2000 → burn 300, no budget
    expect(r.net).toBe(2300);
    expect(r.goal).toBe(2000);
    expect(r.burnNeeded).toBe(300);
    expect(r.remainingBudget).toBe(0);
    expect(r.onTrack).toBe(false);
  });

  it('shows remaining budget when net is under the goal', () => {
    const r = computeCalorieTarget({ ...base, eaten: 1500, burned: 200 });
    // net = 1300, goal = 2000 → budget 700, no burn
    expect(r.burnNeeded).toBe(0);
    expect(r.remainingBudget).toBe(700);
    expect(r.onTrack).toBe(true);
  });

  it('counts burned calories against net', () => {
    const r = computeCalorieTarget({ ...base, eaten: 2200, burned: 400 });
    // net = 1800 → under 2000
    expect(r.net).toBe(1800);
    expect(r.burnNeeded).toBe(0);
    expect(r.remainingBudget).toBe(200);
  });

  it('uses the deficit-adjusted goal when deficit mode is on', () => {
    // maintenance defaults to dailyGoal+deficitTarget = 2500; cap = 2500-500 = 2000
    const r = computeCalorieTarget({ ...base, deficitMode: true, eaten: 2200, burned: 0 });
    expect(r.goal).toBe(2000);
    expect(r.burnNeeded).toBe(200);
  });

  it('uses explicit maintenance when provided (deficit mode)', () => {
    // maintenance 3000, deficit 500 → cap 2500
    const r = computeCalorieTarget({ ...base, deficitMode: true, maintenance: 3000, eaten: 2600, burned: 0 });
    expect(r.goal).toBe(2500);
    expect(r.burnNeeded).toBe(100);
  });

  it('floors the deficit cap at 800', () => {
    const r = computeCalorieTarget({ dailyGoal: 1000, deficitMode: true, deficitTarget: 900, maintenance: 1000, eaten: 900, burned: 0 });
    expect(r.goal).toBe(800); // max(1000-900, 800)
  });
});
