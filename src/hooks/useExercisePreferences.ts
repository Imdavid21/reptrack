import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  ExercisePrefs,
  EMPTY_PREFS,
  normalizePrefs,
  toggleFavorite as toggleFav,
  isFavorite as isFav,
  recordUsage as record,
  setPreferredVariant as setVariant,
  getPreferredVariant as getVariant,
  sortByPreference as sortByPref,
  topUsed as top,
} from '@/lib/exercisePreferences';

const KEY_PREFIX = 'reptrack_exercise_prefs';

/**
 * Persists per-user exercise preferences (favorites, usage, preferred
 * variations) in localStorage and exposes ergonomic helpers. Per-user keyed so
 * switching accounts on a device doesn't bleed preferences across users.
 */
export function useExercisePreferences() {
  const { user } = useAuth();
  const storageKey = user ? `${KEY_PREFIX}_${user.id}` : `${KEY_PREFIX}_anon`;

  const [prefs, setPrefs] = useState<ExercisePrefs>(EMPTY_PREFS);

  // Load when the user (key) changes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setPrefs(raw ? normalizePrefs(JSON.parse(raw)) : EMPTY_PREFS);
    } catch {
      setPrefs(EMPTY_PREFS);
    }
  }, [storageKey]);

  const persist = useCallback((next: ExercisePrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage full / unavailable - keep in-memory */
    }
  }, [storageKey]);

  const toggleFavorite = useCallback((name: string) => {
    persist(toggleFav(prefs, name));
  }, [prefs, persist]);

  const recordUsage = useCallback((names: string[]) => {
    if (names.length === 0) return;
    persist(record(prefs, names, new Date().toISOString()));
  }, [prefs, persist]);

  const setPreferredVariant = useCallback((base: string, variant: string) => {
    const next = setVariant(prefs, base, variant);
    if (next !== prefs) persist(next);
  }, [prefs, persist]);

  const isFavorite = useCallback((name: string) => isFav(prefs, name), [prefs]);
  const getPreferredVariant = useCallback((base: string) => getVariant(prefs, base), [prefs]);
  const sortByPreference = useCallback(<T extends { name: string }>(items: T[]) => sortByPref(prefs, items), [prefs]);
  const topUsed = useCallback((n: number) => top(prefs, n), [prefs]);

  const preferredVariants = useMemo(() => prefs.preferredVariant, [prefs.preferredVariant]);

  return {
    prefs,
    favorites: prefs.favorites,
    preferredVariants,
    isFavorite,
    toggleFavorite,
    recordUsage,
    setPreferredVariant,
    getPreferredVariant,
    sortByPreference,
    topUsed,
  };
}
