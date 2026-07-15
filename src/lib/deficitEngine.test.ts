import { describe, it, expect } from 'vitest';
import { computeDeficitGuards, proteinBelowFloor, proteinTarget } from './deficitEngine';

describe('computeDeficitGuards', () => {
  it('counts distinct training days in the trailing 7 days', () => {
    const g = computeDeficitGuards(
      // diffs from 06-15: 0,1,2,4,6 (all within the 7-day window) + 06-01 (outside)
      ['2026-06-15', '2026-06-14', '2026-06-13', '2026-06-11', '2026-06-09', '2026-06-01'],
      '2026-06-15',
    );
    expect(g.sessionsLast7).toBe(5);
    expect(g.overSessionCap).toBe(true);
  });

  it('does not flag the cap under 5 sessions', () => {
    const g = computeDeficitGuards(['2026-06-15', '2026-06-13', '2026-06-11'], '2026-06-15');
    expect(g.sessionsLast7).toBe(3);
    expect(g.overSessionCap).toBe(false);
  });

  it('measures a consecutive training streak ending today', () => {
    const g = computeDeficitGuards(
      ['2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'],
      '2026-06-15',
    );
    expect(g.consecutiveDays).toBe(5);
    expect(g.needsRest).toBe(true);
  });

  it('counts a streak ending yesterday when today is untrained', () => {
    const g = computeDeficitGuards(
      ['2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14'],
      '2026-06-15',
    );
    expect(g.consecutiveDays).toBe(5);
    expect(g.needsRest).toBe(true);
  });

  it('breaks the streak on a rest day', () => {
    const g = computeDeficitGuards(
      ['2026-06-15', '2026-06-14', '2026-06-12', '2026-06-11'], // gap on 06-13
      '2026-06-15',
    );
    expect(g.consecutiveDays).toBe(2);
    expect(g.needsRest).toBe(false);
  });

  it('handles no history', () => {
    const g = computeDeficitGuards([], '2026-06-15');
    expect(g).toEqual({ sessionsLast7: 0, consecutiveDays: 0, overSessionCap: false, needsRest: false });
  });
});

describe('protein floor', () => {
  it('flags protein under 1.6 g/kg', () => {
    expect(proteinBelowFloor(120, 80)).toBe(true);  // 1.5 g/kg
    expect(proteinBelowFloor(130, 80)).toBe(false); // 1.625 g/kg
  });
  it('ignores missing data', () => {
    expect(proteinBelowFloor(0, 80)).toBe(false);
    expect(proteinBelowFloor(120, 0)).toBe(false);
  });
  it('reports the 1.8-2.2 g/kg band', () => {
    expect(proteinTarget(80)).toEqual({ min: 144, max: 176 });
  });
});
