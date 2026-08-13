import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260813190000_personal_energy_engine_v3.sql'),
  'utf8',
);

describe('Personal Energy Engine V3 migration', () => {
  it('preserves raw measurements and adds versioned derived state', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.energy_model_states');
    expect(sql).toContain('energy_model_version integer NOT NULL DEFAULT 3');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.energy_targets');
    expect(sql).not.toContain('UPDATE public.daily_metrics');
    expect(sql).not.toMatch(/UPDATE public\.meals\s+SET\s+(calories|protein)/i);
  });

  it('retains event inputs and provenance needed for reproducibility', () => {
    expect(sql).toContain('nutrition_source text');
    expect(sql).toContain('source_metadata jsonb');
    expect(sql).toContain('calculation_inputs jsonb');
    expect(sql).toContain('effective_weight_kg numeric');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.workout_pauses');
  });

  it('keeps legacy derived activity distinguishable from V3 estimates', () => {
    expect(sql).toContain('energy_model_version integer NOT NULL DEFAULT 2');
    expect(sql).toContain('estimated_net_kcal numeric');
  });
});
