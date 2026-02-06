/**
 * Shared exercise name matching utilities.
 *
 * Used across workout logging, last-used weight look-ups,
 * and personal-record tracking to ensure fuzzy name resolution
 * is consistent everywhere.
 */

/** Normalize an exercise name for fuzzy matching across naming variations. */
export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bdumbbell\b/g, 'db')
    .replace(/\bbarbell\b/g, 'bb')
    .replace(/\boverhead press\b/g, 'ohp')
    .replace(/\bpush-?ups?\b/g, 'pushup')
    .replace(/\bpull-?ups?\b/g, 'pullup')
    .replace(/\bcable rope\b/g, 'cable')
    .replace(/\bseated\b/g, '')
    .replace(/\bstanding\b/g, '')
    .replace(/\bpress\b/g, '')
    .replace(/\bflyes?\b/g, 'fly')
    .replace(/s\b/g, '') // strip trailing s (plurals)
    .replace(/[^a-z0-9]/g, '') // strip non-alphanumeric
    .trim();
}

/**
 * Find the best match for `exerciseName` inside a keyed map.
 *
 * Resolution order:
 *  1. Exact key match
 *  2. Normalised equality
 *  3. Substring containment (only when both normalised strings > 6 chars)
 */
export function findBestMatch<T>(
  exerciseName: string,
  map: Record<string, T> | undefined,
): T | undefined {
  if (!map) return undefined;

  // 1 – exact
  if (map[exerciseName]) return map[exerciseName];

  // 2 – normalised equality
  const target = normalizeExerciseName(exerciseName);
  for (const [key, value] of Object.entries(map)) {
    if (normalizeExerciseName(key) === target) return value;
  }

  // 3 – substring containment (guard against false positives with short strings)
  for (const [key, value] of Object.entries(map)) {
    const keyNorm = normalizeExerciseName(key);
    if (target.length > 6 && keyNorm.length > 6) {
      if (target.includes(keyNorm) || keyNorm.includes(target)) return value;
    }
  }

  return undefined;
}
