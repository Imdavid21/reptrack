import { describe, it, expect } from 'vitest';
import {
  EMPTY_PREFS,
  normalizePrefs,
  toggleFavorite,
  isFavorite,
  recordUsage,
  setPreferredVariant,
  getPreferredVariant,
  sortByPreference,
  topUsed,
} from './exercisePreferences';

describe('normalizePrefs', () => {
  it('returns empty prefs for garbage input', () => {
    expect(normalizePrefs(null)).toEqual(EMPTY_PREFS);
    expect(normalizePrefs({ favorites: 'nope' })).toEqual(EMPTY_PREFS);
  });
  it('keeps valid fields', () => {
    const p = normalizePrefs({ favorites: ['Squat'], usage: { Squat: { count: 2, lastUsed: 'x' } }, preferredVariant: { A: 'B' } });
    expect(p.favorites).toEqual(['Squat']);
    expect(p.usage.Squat.count).toBe(2);
    expect(p.preferredVariant.A).toBe('B');
  });
});

describe('favorites', () => {
  it('toggles on and off without mutating input', () => {
    const a = toggleFavorite(EMPTY_PREFS, 'Bench');
    expect(isFavorite(a, 'Bench')).toBe(true);
    expect(isFavorite(EMPTY_PREFS, 'Bench')).toBe(false); // input untouched
    const b = toggleFavorite(a, 'Bench');
    expect(isFavorite(b, 'Bench')).toBe(false);
  });
});

describe('recordUsage', () => {
  it('increments count and dedupes within a call', () => {
    const p = recordUsage(EMPTY_PREFS, ['Squat', 'Squat', 'Row'], '2026-06-15T10:00:00Z');
    expect(p.usage.Squat.count).toBe(1);
    expect(p.usage.Row.count).toBe(1);
    const p2 = recordUsage(p, ['Squat'], '2026-06-16T10:00:00Z');
    expect(p2.usage.Squat.count).toBe(2);
    expect(p2.usage.Squat.lastUsed).toBe('2026-06-16T10:00:00Z');
  });
  it('ignores empty names', () => {
    const p = recordUsage(EMPTY_PREFS, ['', 'Curl'], '2026-06-15T10:00:00Z');
    expect(Object.keys(p.usage)).toEqual(['Curl']);
  });
});

describe('preferred variant', () => {
  it('stores and reads a preferred variation', () => {
    const p = setPreferredVariant(EMPTY_PREFS, 'Barbell Bench Press', 'Dumbbell Bench Press');
    expect(getPreferredVariant(p, 'Barbell Bench Press')).toBe('Dumbbell Bench Press');
  });
  it('ignores no-op and self-referential sets', () => {
    expect(setPreferredVariant(EMPTY_PREFS, 'X', 'X')).toBe(EMPTY_PREFS);
    expect(setPreferredVariant(EMPTY_PREFS, '', 'Y')).toBe(EMPTY_PREFS);
  });
});

describe('sortByPreference', () => {
  const items = [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }];

  it('puts favorites first, then most-used, preserving order on ties', () => {
    let prefs = EMPTY_PREFS;
    prefs = toggleFavorite(prefs, 'C');
    prefs = recordUsage(prefs, ['B'], '2026-06-15T10:00:00Z');
    prefs = recordUsage(prefs, ['B'], '2026-06-16T10:00:00Z'); // B count 2
    prefs = recordUsage(prefs, ['D'], '2026-06-15T10:00:00Z'); // D count 1
    const sorted = sortByPreference(prefs, items).map(i => i.name);
    // C (favorite), B (count 2), D (count 1), A (untouched, original order)
    expect(sorted).toEqual(['C', 'B', 'D', 'A']);
  });

  it('does not mutate the input array', () => {
    const original = [...items];
    sortByPreference(EMPTY_PREFS, items);
    expect(items).toEqual(original);
  });
});

describe('topUsed', () => {
  it('returns most-used names capped at n', () => {
    let prefs = EMPTY_PREFS;
    prefs = recordUsage(prefs, ['A'], '2026-06-15T10:00:00Z');
    prefs = recordUsage(prefs, ['A'], '2026-06-16T10:00:00Z');
    prefs = recordUsage(prefs, ['B'], '2026-06-17T10:00:00Z');
    expect(topUsed(prefs, 1)).toEqual(['A']);
    expect(topUsed(prefs, 5)).toEqual(['A', 'B']);
  });
});
