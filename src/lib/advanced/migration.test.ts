import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve('supabase/migrations/20260823181000_advanced_mode_v2.sql'), 'utf8').toLowerCase();

describe('Advanced Mode migration', () => {
  it('creates only additive Advanced Mode storage', () => {
    for (const table of ['advanced_settings','gym_profiles','training_blocks','training_experiments','coach_events']) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
    expect(migration).not.toMatch(/\bdrop\s+(table|column|schema)\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
    expect(migration).not.toMatch(/\bupdate\s+public\./);
  });

  it('keeps every Advanced Mode table user-scoped with RLS', () => {
    for (const table of ['advanced_settings','gym_profiles','training_blocks','training_experiments','coach_events']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`auth.uid() = user_id`);
    }
  });
});
