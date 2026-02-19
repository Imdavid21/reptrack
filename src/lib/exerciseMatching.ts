/**
 * Shared exercise name matching utilities.
 *
 * Used across workout logging, last-used weight look-ups,
 * and personal-record tracking to ensure fuzzy name resolution
 * is consistent everywhere.
 */

/**
 * Canonical alias map — resolves common abbreviations and legacy naming
 * variations to their unified canonical name BEFORE normalization.
 * Add new aliases here to prevent future duplicates.
 */
const CANONICAL_ALIASES: Record<string, string> = {
  // Barbell Overhead Press
  'barbell ohp': 'barbell overhead press',
  'overhead press': 'barbell overhead press',
  'ohp': 'barbell overhead press',

  // Deadlifts
  'deadlift': 'deadlifts',
  'conventional deadlift': 'deadlifts',

  // Flat Dumbbell Bench Press
  'flat db bench': 'flat dumbbell bench press',
  'flat db bench press': 'flat dumbbell bench press',
  'flat dumbbell bench': 'flat dumbbell bench press',
  'dumbbell bench press': 'flat dumbbell bench press',

  // Incline Barbell Bench Press
  'incline barbell bench': 'incline barbell bench press',
  'incline bb bench': 'incline barbell bench press',

  // Incline Dumbbell Press
  'incline db press': 'incline dumbbell press',

  // Incline Dumbbell Flyes
  'incline db fly': 'incline dumbbell flyes',
  'incline db flyes': 'incline dumbbell flyes',

  // Dumbbell Shoulder Press
  'db shoulder press': 'dumbbell shoulder press',
  'seated db shoulder press': 'dumbbell shoulder press',
  'seated dumbbell shoulder press': 'dumbbell shoulder press',

  // Cable Seated Row
  'seated cable row': 'cable seated row',

  // Cable Tricep Pushdowns
  'tricep pushdown': 'cable tricep pushdowns',
  'cable pushdown': 'cable tricep pushdowns',
  'tricep pushdowns': 'cable tricep pushdowns',

  // Barbell Curls
  'barbell curl': 'barbell curls',

  // Hammer Curls
  'hammer curl': 'hammer curls',

  // Leg Extensions
  'leg extension': 'leg extensions',

  // Lateral Raises
  'dumbbell lateral raises': 'lateral raises',
  'dumbbell lateral raise': 'lateral raises',

  // Close Grip Bench Press
  'close grip chest press': 'close grip bench press',

  // Dumbbell Bicep Curls
  'db bicep curl': 'dumbbell bicep curls',
  'db bicep curls': 'dumbbell bicep curls',
};

/** Resolve a name through the canonical alias map (exact lowercase match). */
export function resolveCanonicalName(name: string): string {
  const lower = name.toLowerCase().trim();
  return CANONICAL_ALIASES[lower] ?? name;
}

/** Normalize an exercise name for fuzzy matching across naming variations. */
export function normalizeExerciseName(name: string): string {
  // First resolve any known alias to the canonical form
  const resolved = resolveCanonicalName(name);
  return resolved
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
