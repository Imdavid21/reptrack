import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APPROVED_TOOLS, MCP_MODE, assertDateRange, classifyMuscle, localDayBounds, movingAverage7, setMetrics } from '../../supabase/functions/mcp/core';

describe('MCP read-only policy', () => {
  it('contains exactly the ten approved retrieval tools', () => {
    expect(MCP_MODE).toBe('read_only');
    expect(APPROVED_TOOLS).toEqual([
      'get_fitness_profile','get_bodyweight_history','get_workouts','get_exercise_history',
      'get_training_summary','get_nutrition','get_sleep','get_activity',
      'get_progress_summary','get_recent_fitness_data',
    ]);
    expect(APPROVED_TOOLS.every(name => name.startsWith('get_'))).toBe(true);
  });

  it('does not register mutation or generic execution surfaces', () => {
    const source = readFileSync(resolve('supabase/functions/mcp/index.ts'), 'utf8');
    for (const forbidden of ['create_workout','update_workout','delete_workout','execute_sql','shell_access','fetch_url']) {
      expect(source).not.toContain(`registerTool("${forbidden}`);
    }
    expect(source).toContain('readOnlyHint:true');
    expect(source).toContain('destructiveHint:false');
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
    expect(() => assertDateRange('2020-01-01','2026-08-12',365)).toThrow('DATE_RANGE_TOO_LARGE');
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
