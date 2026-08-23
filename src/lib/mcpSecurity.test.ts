import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APPROVED_TOOLS, MCP_MODE, WRITE_TOOLS, isPermittedTool, isWriteTool, assertWritableDate, capPayload, categorizeDbError, withRetry, assertDateRange, classifyMuscle, localDayBounds, movingAverage7, setMetrics } from '../../supabase/functions/mcp/core';

describe('MCP tool policy', () => {
  it('contains only the approved fitness and live-session retrieval tools', () => {
    expect(MCP_MODE).toBe('read_write');
    expect(APPROVED_TOOLS).toEqual([
      'get_fitness_profile','get_bodyweight_history','get_workouts','get_exercise_history',
      'get_training_summary','get_nutrition','get_sleep','get_activity',
      'get_progress_summary','get_recent_fitness_data','get_live_workout','list_workout_triggers',
      'get_advanced_snapshot','get_progression_autopilot','get_cut_control','get_weak_point_radar',
      'get_weekly_coach_review','get_goal_runway','get_advanced_config','list_coach_events',
    ]);
    expect(APPROVED_TOOLS.every(name => name.startsWith('get_') || name === 'list_workout_triggers' || name === 'list_coach_events')).toBe(true);
  });

  it('limits writes to logs and scoped live-workout coaching actions', () => {
    expect(WRITE_TOOLS).toEqual([
      'log_meal','update_meal','log_water',
      'log_workout','update_workout',
      'log_activity','update_activity','set_workout_trigger','cancel_workout_trigger','send_coach_note',
    ]);
    expect(WRITE_TOOLS.every(isWriteTool)).toBe(true);
    expect(isPermittedTool('delete_workout')).toBe(false);
    expect(isPermittedTool('log_meal')).toBe(true);
  });

  it('does not register delete or generic execution surfaces', () => {
    const source = readFileSync(resolve('supabase/functions/mcp/index.ts'), 'utf8');
    for (const forbidden of ['delete_workout','delete_meal','execute_sql','shell_access','fetch_url']) {
      expect(source).not.toContain(`registerTool("${forbidden}`);
    }
    expect(source).toContain('destructiveHint:false');
  });

  it('rejects future and stale write dates', () => {
    expect(assertWritableDate('2026-08-10','2026-08-12')).toBe('2026-08-10');
    expect(() => assertWritableDate('2026-08-13','2026-08-12')).toThrow('DATE_IN_FUTURE');
    expect(assertWritableDate('2020-01-01','2026-08-12')).toBe('2020-01-01');
  });

  it('applies no request rate limiting', () => {
    const source = readFileSync(resolve('supabase/functions/mcp/index.ts'), 'utf8');
    expect(source).not.toContain('check_rate_limit');
    expect(source).not.toContain('Rate limit exceeded');
  });
});

describe('MCP calculations and validation', () => {
  it('parses logged set strings and labels calculable metrics', () => {
    expect(setMetrics('10, 8, 6', '50, 55, 60')).toEqual({
      setCount: 3, totalReps: 24, volume: 1300, bestEstimated1rm: 72,
    });
  });

  it('calculates a rolling seven-entry average without inventing entries', () => {
    const rows = Array.from({length:8}, (_,i) => ({date:`2026-08-${String(i+1).padStart(2,'0')}`,bodyweight:70+i}));
    const result = movingAverage7(rows);
    expect(result[0].moving_average_7d).toBe(70);
    expect(result[7].moving_average_7d).toBe(74);
  });

  it('enforces valid bounded date ranges', () => {
    expect(() => assertDateRange('2026-08-01','2026-08-12')).not.toThrow();
    expect(() => assertDateRange('2026-08-12','2026-08-01')).toThrow('INVALID_DATE_RANGE');
    expect(() => assertDateRange('2020-01-01','2026-08-12')).not.toThrow();
  });

  it('uses local calendar boundaries for Asia/Kolkata', () => {
    expect(localDayBounds('2026-08-12','Asia/Kolkata')).toEqual({
      start:'2026-08-11T18:30:00.000Z', end:'2026-08-12T18:30:00.000Z',
    });
  });

  it('uses deterministic maintainable muscle mappings', () => {
    expect(classifyMuscle('Cable Lateral Raise')).toBe('side delts');
    expect(classifyMuscle('Hanging Knee Raise')).toBe('abs/core');
    expect(classifyMuscle('Unknown Movement')).toBe('unmapped');
  });
});

describe('MCP failsafes', () => {
  it('retries transient database failures and fails fast on deterministic ones', async () => {
    let calls = 0;
    const value = await withRetry('flaky', async () => {
      calls++;
      if (calls < 3) throw Object.assign(new Error('fetch failed'), { code: '08006' });
      return 'ok';
    });
    expect(value).toBe('ok');
    expect(calls).toBe(3);

    let hard = 0;
    await expect(withRetry('hard', async () => { hard++; throw Object.assign(new Error('denied'), { code: '42501' }); }))
      .rejects.toThrow('denied');
    expect(hard).toBe(1);
  });

  it('categorizes database errors without leaking internals', () => {
    expect(categorizeDbError({ code: '42501' })).toBe('PERMISSION_DENIED');
    expect(categorizeDbError({ code: '57014' })).toBe('QUERY_TIMEOUT');
    expect(categorizeDbError({ message: 'fetch failed' })).toBe('DATABASE_UNAVAILABLE');
  });

  it('truncates oversized payloads instead of breaking the client', () => {
    const big = { data: Array.from({ length: 500 }, (_, i) => ({ i, blob: 'x'.repeat(1000) })), metadata: {} };
    const { payload, truncated } = capPayload(big, 50_000);
    expect(truncated).toBe(true);
    expect((payload as any).data.length).toBeLessThan(500);
    expect((payload as any).metadata.truncated).toBe(true);
    expect(capPayload({ data: [1, 2, 3] }, 50_000).truncated).toBe(false);
  });
});
