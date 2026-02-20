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
  // ── Chest ──
  'barbell bench': 'barbell bench press',
  'flat barbell bench': 'barbell bench press',
  'bb bench press': 'barbell bench press',
  'db press': 'dumbbell bench press',
  'flat dumbbell bench press': 'dumbbell bench press',
  'flat db press': 'dumbbell bench press',
  'flat dumbbell bench': 'dumbbell bench press',
  'dumbbell bench press': 'dumbbell bench press',
  'db flat bench': 'dumbbell bench press',
  'incline barbell bench': 'incline barbell bench press',
  'incline bb bench': 'incline barbell bench press',
  'incline db press': 'incline dumbbell press',
  'incline db bench press': 'incline dumbbell press',
  'incline db fly': 'incline dumbbell flyes',
  'incline db flyes': 'incline dumbbell flyes',
  'chest fly': 'cable flyes',
  'chest flyes': 'cable flyes',
  'machine chest fly': 'cable flyes',
  'pec fly': 'cable flyes',
  'pec deck': 'cable flyes',
  'cable fly': 'cable flyes',

  // ── Shoulders ──
  'barbell ohp': 'overhead press',
  'barbell overhead press': 'overhead press',
  'ohp': 'overhead press',
  'overhead press': 'overhead press',
  'military press': 'overhead press',
  'db shoulder press': 'dumbbell shoulder press',
  'db ohp': 'dumbbell shoulder press',
  'seated dumbbell shoulder press': 'dumbbell shoulder press',
  'seated db shoulder press': 'dumbbell shoulder press',
  'lateral raise': 'lateral raises',
  'dumbbell lateral raise': 'lateral raises',
  'dumbbell lateral raises': 'lateral raises',
  'lateral raise machine': 'lateral raises',
  'machine lateral raise': 'lateral raises',
  'face pull': 'face pulls',
  'bent over rear delt fly': 'bent over rear delt flyes',
  'rear delt fly': 'bent over rear delt flyes',
  'rear delt flyes': 'bent over rear delt flyes',
  'reverse fly': 'reverse flyes',

  // ── Back ──
  'barbell rows': 'barbell row',
  'bb row': 'barbell row',
  'bent over row': 'barbell row',
  'bent over barbell row': 'barbell row',
  'pendlay row': 'barbell row',
  'cable row': 'seated cable row',
  'seated row': 'seated cable row',
  'cable seated row': 'seated cable row',
  'seated cable row': 'seated cable row',
  'single arm dumbbell rows': 'single arm dumbbell row',
  'single arm db row': 'single arm dumbbell row',
  'db row': 'single arm dumbbell row',
  'one arm dumbbell row': 'single arm dumbbell row',
  'straight arm pulldowns': 'straight arm pulldown',
  'lat pulldowns': 'lat pulldown',
  'wide grip lat pulldown': 'lat pulldown',
  'close grip lat pulldown': 'lat pulldown',
  'reverse grip lat pulldown': 'lat pulldown',
  'negative pull-ups': 'pull-ups',

  // ── Deadlifts ──
  'deadlift': 'conventional deadlift',
  'deadlifts': 'conventional deadlift',
  'sumo deadlift': 'conventional deadlift',
  'deadlift technique': 'deadlift technique work',
  'rdl': 'romanian deadlift',
  'romanian deadlifts': 'romanian deadlift',
  'db rdl': 'romanian deadlift',
  'dumbbell rdl': 'romanian deadlift',
  'single leg romanian deadlifts': 'romanian deadlift',

  // ── Triceps ──
  'cable tricep pushdowns': 'tricep pushdown',
  'tricep pushdowns': 'tricep pushdown',
  'tricep pushdown': 'tricep pushdown',
  'cable pushdown': 'tricep pushdown',
  'rope pushdown': 'tricep pushdown',
  'dumbbell overhead extension': 'overhead tricep extension',
  'db overhead extension': 'overhead tricep extension',
  'overhead extension': 'overhead tricep extension',
  'dumbbell skull crushers': 'skull crushers',

  // ── Biceps ──
  'barbell curls': 'barbell curl',
  'barbell curl': 'barbell curl',
  'bb curl': 'barbell curl',
  'bb curls': 'barbell curl',
  'ez bar curl': 'barbell curl',
  'ez bar curls': 'barbell curl',
  'ez curl': 'barbell curl',
  'dumbbell bicep curls': 'dumbbell curl',
  'dumbbell curls': 'dumbbell curl',
  'db curl': 'dumbbell curl',
  'db curls': 'dumbbell curl',
  'db bicep curl': 'dumbbell curl',
  'db bicep curls': 'dumbbell curl',
  'bicep curl': 'dumbbell curl',
  'bicep curls': 'dumbbell curl',
  'incline dumbbell curls': 'incline dumbbell curl',
  'incline db curl': 'incline dumbbell curl',
  'cable curls': 'cable curl',
  'rope cable curl': 'cable curl',
  'rope curl': 'cable curl',
  'preacher curls': 'ez bar preacher curls',
  'preacher curl': 'ez bar preacher curls',
  'hammer curl': 'hammer curls',

  // ── Legs ──
  'bb squat': 'barbell squat',
  'back squat': 'barbell squat',
  'squat': 'barbell squat',
  'squats': 'barbell squat',
  'goblet squat': 'goblet squats',
  'bulgarian split squats': 'bulgarian split squat',
  'leg extension': 'leg extensions',
  'leg curls': 'leg curl',
  'lying leg curl': 'leg curl',
  'seated leg curl': 'leg curl',
  'hip thrusts': 'hip thrust',
  'barbell hip thrust': 'hip thrust',
  'glute bridges': 'glute bridge',
  'standing calf raise': 'standing calf raises',
  'calf raise': 'standing calf raises',
  'calf raises': 'standing calf raises',
  'seated calf raises': 'seated calf raise',
  'walking lunge': 'walking lunges',
  'lunges': 'walking lunges',

  // ── Timed ──
  'dead hangs': 'dead hang',
  'planks': 'plank',
  'wall sits': 'wall sit',

  // ── Bodyweight ──
  'close grip push-ups': 'push-ups',
  'diamond push-ups': 'push-ups',
  'wide push-ups': 'push-ups',

  // ── Close Grip Bench ──
  'close grip chest press': 'close grip bench press',
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
