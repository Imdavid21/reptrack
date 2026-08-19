/**
 * Per-user exercise preferences - favorites, usage frequency/recency, and the
 * user's preferred variation of a movement. Pure transforms over a plain object
 * so the logic is unit-tested; the React hook handles localStorage + the user
 * key. "Remembering" a user's exercise choices means: surface what they
 * actually use, let them pin favorites, and reuse their chosen variation.
 */

export interface UsageStat {
  count: number;
  lastUsed: string; // ISO timestamp
}

export interface ExercisePrefs {
  favorites: string[];
  usage: Record<string, UsageStat>;
  /** base exercise name → the variation the user prefers for it */
  preferredVariant: Record<string, string>;
}

export const EMPTY_PREFS: ExercisePrefs = {
  favorites: [],
  usage: {},
  preferredVariant: {},
};

/** Defensive normalizer for whatever comes back from storage. */
export function normalizePrefs(raw: unknown): ExercisePrefs {
  const r = (raw ?? {}) as Partial<ExercisePrefs>;
  return {
    favorites: Array.isArray(r.favorites) ? r.favorites.filter(x => typeof x === 'string') : [],
    usage: r.usage && typeof r.usage === 'object' ? r.usage : {},
    preferredVariant: r.preferredVariant && typeof r.preferredVariant === 'object' ? r.preferredVariant : {},
  };
}

export function isFavorite(prefs: ExercisePrefs, name: string): boolean {
  return prefs.favorites.includes(name);
}

export function toggleFavorite(prefs: ExercisePrefs, name: string): ExercisePrefs {
  const favorites = prefs.favorites.includes(name)
    ? prefs.favorites.filter(n => n !== name)
    : [name, ...prefs.favorites];
  return { ...prefs, favorites };
}

/** Record that a set of exercises was used (deduped) at the given time. */
export function recordUsage(prefs: ExercisePrefs, names: string[], nowISO: string): ExercisePrefs {
  const usage = { ...prefs.usage };
  for (const name of new Set(names.filter(Boolean))) {
    const prev = usage[name];
    usage[name] = { count: (prev?.count ?? 0) + 1, lastUsed: nowISO };
  }
  return { ...prefs, usage };
}

export function setPreferredVariant(prefs: ExercisePrefs, base: string, variant: string): ExercisePrefs {
  if (!base || !variant || base === variant) return prefs;
  return { ...prefs, preferredVariant: { ...prefs.preferredVariant, [base]: variant } };
}

export function getPreferredVariant(prefs: ExercisePrefs, base: string): string | undefined {
  return prefs.preferredVariant[base];
}

/**
 * Sort items (anything with a `name`) by preference: favorites first, then by
 * usage count, then recency, then original order (stable). Never mutates input.
 */
export function sortByPreference<T extends { name: string }>(prefs: ExercisePrefs, items: T[]): T[] {
  const favRank = (n: string) => (prefs.favorites.includes(n) ? 1 : 0);
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const fa = favRank(a.item.name);
      const fb = favRank(b.item.name);
      if (fa !== fb) return fb - fa;
      const ua = prefs.usage[a.item.name];
      const ub = prefs.usage[b.item.name];
      const ca = ua?.count ?? 0;
      const cb = ub?.count ?? 0;
      if (ca !== cb) return cb - ca;
      const la = ua?.lastUsed ?? '';
      const lb = ub?.lastUsed ?? '';
      if (la !== lb) return lb.localeCompare(la);
      return a.index - b.index; // stable
    })
    .map(({ item }) => item);
}

/** Names the user uses most (count desc, then recency), capped at `n`. */
export function topUsed(prefs: ExercisePrefs, n: number): string[] {
  return Object.entries(prefs.usage)
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return b[1].lastUsed.localeCompare(a[1].lastUsed);
    })
    .slice(0, n)
    .map(([name]) => name);
}
