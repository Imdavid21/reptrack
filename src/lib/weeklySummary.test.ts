import { describe, it, expect } from 'vitest';
import { computeWeeklySummary } from './weeklySummary';

describe('computeWeeklySummary', () => {
  it('counts sessions and push/pull/legs', () => {
    const s = computeWeeklySummary({
      weekDayNames: ['Push A', 'Pull A', 'Legs A', 'Push B'],
      loggedExerciseNames: [],
      mandatoryNames: [],
      sessionGoal: 5,
      stalledCount: 0,
    });
    expect(s.sessions).toBe(4);
    expect(s.push).toBe(2);
    expect(s.pull).toBe(1);
    expect(s.legs).toBe(1);
  });

  it('flags leg volume behind push/pull', () => {
    const s = computeWeeklySummary({
      weekDayNames: ['Push A', 'Pull A', 'Push B', 'Pull B'], // 0 legs vs 4 upper
      loggedExerciseNames: [], mandatoryNames: [], sessionGoal: 5, stalledCount: 0,
    });
    expect(s.legBehind).toBe(true);
  });

  it('is balanced with a leg day', () => {
    const s = computeWeeklySummary({
      weekDayNames: ['Push A', 'Pull A', 'Legs A'],
      loggedExerciseNames: [], mandatoryNames: [], sessionGoal: 5, stalledCount: 0,
    });
    expect(s.legBehind).toBe(false);
  });

  it('measures mandatory-accessory completion with loose matching', () => {
    const s = computeWeeklySummary({
      weekDayNames: ['Pull A', 'Pull B'],
      loggedExerciseNames: ['Face Pulls', 'Farmer Walk', 'Barbell Row'], // Dead Hang missing; Farmer Walk ~ Farmer Walks
      mandatoryNames: ['Face Pulls', 'Dead Hang', 'Farmer Walks'],
      sessionGoal: 5,
      stalledCount: 0,
    });
    expect(s.mandatoryTotal).toBe(3);
    expect(s.mandatoryDone).toBe(2);
  });
});
