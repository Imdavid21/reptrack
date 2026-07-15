import { describe, it, expect } from 'vitest';
import { buildCoachPrompts, legRatioBehind, categorize, CoachInput } from './coachPrompts';

const baseInput = (over: Partial<CoachInput> = {}): CoachInput => ({
  todayKey: '2026-06-15',
  workouts: [{ date: '2026-06-15', day_name: 'Push A' }], // logged today by default
  metrics: [{ date: '2026-06-15', sleep_hours: 7, bodyweight: 80 }],
  deficitMode: false,
  ...over,
});

describe('categorize', () => {
  it('maps day names to categories', () => {
    expect(categorize('Push A')).toBe('push');
    expect(categorize('Pull B')).toBe('pull');
    expect(categorize('Legs A')).toBe('legs');
    expect(categorize('Freestyle')).toBe('other');
  });
});

describe('legRatioBehind', () => {
  it('flags when legs are under half of push/pull in 14 days', () => {
    const w = [
      { date: '2026-06-14', day_name: 'Push A' },
      { date: '2026-06-13', day_name: 'Pull A' },
      { date: '2026-06-12', day_name: 'Push B' },
      { date: '2026-06-11', day_name: 'Pull B' },
      // 0 legs vs 4 upper → behind
    ];
    expect(legRatioBehind(w, '2026-06-15').behind).toBe(true);
  });
  it('is fine when the ratio is met', () => {
    const w = [
      { date: '2026-06-14', day_name: 'Push A' },
      { date: '2026-06-13', day_name: 'Pull A' },
      { date: '2026-06-12', day_name: 'Legs A' },
    ];
    expect(legRatioBehind(w, '2026-06-15').behind).toBe(false); // 1 leg vs 2 upper
  });
  it('ignores workouts older than 14 days', () => {
    const w = [{ date: '2026-06-05', day_name: 'Push A' }, { date: '2026-05-20', day_name: 'Pull A' }];
    expect(legRatioBehind(w, '2026-06-15').upper).toBe(1); // only 06-05 within 14 days
  });
});

describe('buildCoachPrompts', () => {
  it('nudges when nothing is logged today', () => {
    const p = buildCoachPrompts(baseInput({ workouts: [{ date: '2026-06-14', day_name: 'Push A' }] }));
    expect(p.find(x => x.id === 'no-activity')).toBeTruthy();
  });

  it('does not nudge when today has a workout', () => {
    const p = buildCoachPrompts(baseInput());
    expect(p.find(x => x.id === 'no-activity')).toBeUndefined();
  });

  it('flags sleep/weight gaps over 3 consecutive days', () => {
    const p = buildCoachPrompts(baseInput({
      workouts: [{ date: '2026-06-15', day_name: 'Push A' }],
      metrics: [{ date: '2026-06-10', sleep_hours: 7, bodyweight: 80 }], // nothing in last 3 days
    }));
    expect(p.find(x => x.id === 'log-gaps')).toBeTruthy();
  });

  it('does not flag gaps when a recent day has data', () => {
    const p = buildCoachPrompts(baseInput({
      metrics: [{ date: '2026-06-14', sleep_hours: 7, bodyweight: null }],
    }));
    expect(p.find(x => x.id === 'log-gaps')).toBeUndefined();
  });

  it('suggests a deload after 4+ weeks cutting', () => {
    expect(buildCoachPrompts(baseInput({ deficitMode: true, cutWeeks: 5 })).find(x => x.id === 'deload-due')).toBeTruthy();
    expect(buildCoachPrompts(baseInput({ deficitMode: true, cutWeeks: 2 })).find(x => x.id === 'deload-due')).toBeUndefined();
    expect(buildCoachPrompts(baseInput({ deficitMode: false, cutWeeks: 8 })).find(x => x.id === 'deload-due')).toBeUndefined();
  });

  it('flags the protein floor only in deficit mode', () => {
    const withLowProtein = { avgProtein: 120, bodyweightKg: 80 }; // 1.5 g/kg
    expect(buildCoachPrompts(baseInput({ deficitMode: false, ...withLowProtein })).find(x => x.id === 'protein-floor')).toBeUndefined();
    expect(buildCoachPrompts(baseInput({ deficitMode: true, ...withLowProtein })).find(x => x.id === 'protein-floor')).toBeTruthy();
  });
});
