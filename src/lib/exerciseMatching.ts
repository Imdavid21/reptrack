/**
 * Shared exercise name matching utilities.
 *
 * Used across workout logging, last-used weight look-ups, PR tracking, and
 * growth tracking to ensure fuzzy name resolution is consistent everywhere.
 *
 * This is the single canonical alias table for exercise identity — it used
 * to be two independently-maintained tables (this file's, lowercase-only,
 * matching-purposed; and usePersonalRecords.ts's, Title-Case, PR-purposed)
 * that had drifted apart: 9 aliases existed only in one, 14 only in the
 * other, and a couple actively disagreed on the canonical target. A lift
 * could unify correctly for last-used-weight prefill but still split into
 * two competing PR lines, depending on which UI logged which spelling.
 */

/**
 * Canonical alias map — resolves common abbreviations and legacy naming
 * variations to their unified, properly-cased canonical name. Keys are
 * lowercase for case-insensitive lookup; values are the display-ready
 * canonical form (used directly in PR badges and growth-tracking labels).
 * Add new aliases here to prevent future duplicates.
 */
export const EXERCISE_ALIASES: Record<string, string> = {
  'barbell bench': 'Barbell Bench Press',
  'bb bench press': 'Barbell Bench Press',
  'bench press': 'Barbell Bench Press',
  'flat barbell bench': 'Barbell Bench Press',
  'barbell curls': 'Barbell Curl',
  'bb curl': 'Barbell Curl',
  'bb curls': 'Barbell Curl',
  'ez bar curl': 'Barbell Curl',
  'ez bar curls': 'Barbell Curl',
  'ez curl': 'Barbell Curl',
  'barbell rows': 'Barbell Row',
  'bb row': 'Barbell Row',
  'bent over barbell row': 'Barbell Row',
  'bent over row': 'Barbell Row',
  'pendlay row': 'Barbell Row',
  'back squat': 'Barbell Squat',
  'bb squat': 'Barbell Squat',
  'squat': 'Barbell Squat',
  'squats': 'Barbell Squat',
  'bent over rear delt fly': 'Bent Over Rear Delt Flyes',
  'rear delt fly': 'Bent Over Rear Delt Flyes',
  'rear delt flyes': 'Bent Over Rear Delt Flyes',
  'bulgarian split squats': 'Bulgarian Split Squat',
  'cable curls': 'Cable Curl',
  'rope cable curl': 'Cable Curl',
  'rope curl': 'Cable Curl',
  'cable crossover': 'Cable Flyes',
  'cable fly': 'Cable Flyes',
  'chest fly': 'Cable Flyes',
  'chest flyes': 'Cable Flyes',
  'machine chest fly': 'Cable Flyes',
  'pec deck': 'Cable Flyes',
  'pec fly': 'Cable Flyes',
  'close grip chest press': 'Close Grip Bench Press',
  'deadlift': 'Conventional Deadlift',
  'deadlifts': 'Conventional Deadlift',
  'sumo deadlift': 'Conventional Deadlift',
  'dead hangs': 'Dead Hang',
  'deadlift technique': 'Deadlift Technique Work',
  'db flat bench': 'Dumbbell Bench Press',
  'db press': 'Dumbbell Bench Press',
  'flat db press': 'Dumbbell Bench Press',
  'flat dumbbell bench': 'Dumbbell Bench Press',
  'flat dumbbell bench press': 'Dumbbell Bench Press',
  'bicep curl': 'Dumbbell Curl',
  'bicep curls': 'Dumbbell Curl',
  'db bicep curl': 'Dumbbell Curl',
  'db bicep curls': 'Dumbbell Curl',
  'db curl': 'Dumbbell Curl',
  'db curls': 'Dumbbell Curl',
  'dumbbell bicep curls': 'Dumbbell Curl',
  'dumbbell curls': 'Dumbbell Curl',
  'db ohp': 'Dumbbell Shoulder Press',
  'db shoulder press': 'Dumbbell Shoulder Press',
  'seated db shoulder press': 'Dumbbell Shoulder Press',
  'seated dumbbell shoulder press': 'Dumbbell Shoulder Press',
  'preacher curl': 'EZ Bar Preacher Curls',
  'preacher curls': 'EZ Bar Preacher Curls',
  'face pull': 'Face Pulls',
  'glute bridges': 'Glute Bridge',
  'goblet squat': 'Goblet Squats',
  'hammer curls': 'Hammer Curl',
  'barbell hip thrust': 'Hip Thrust',
  'hip thrusts': 'Hip Thrust',
  'incline barbell bench': 'Incline Barbell Bench Press',
  'incline barbell press': 'Incline Barbell Bench Press',
  'incline bb bench': 'Incline Barbell Bench Press',
  'incline db curl': 'Incline Dumbbell Curl',
  'incline dumbbell curls': 'Incline Dumbbell Curl',
  'incline db fly': 'Incline Dumbbell Flyes',
  'incline db flyes': 'Incline Dumbbell Flyes',
  'incline db bench press': 'Incline Dumbbell Press',
  'incline db press': 'Incline Dumbbell Press',
  'close grip lat pulldown': 'Lat Pulldown',
  'lat pulldowns': 'Lat Pulldown',
  'reverse grip lat pulldown': 'Lat Pulldown',
  'wide grip lat pulldown': 'Lat Pulldown',
  'db lateral raise': 'Lateral Raises',
  'dumbbell lateral raise': 'Lateral Raises',
  'dumbbell lateral raises': 'Lateral Raises',
  'lateral raise': 'Lateral Raises',
  'lateral raise machine': 'Lateral Raises',
  'machine lateral raise': 'Lateral Raises',
  'leg curls': 'Leg Curl',
  'lying leg curl': 'Leg Curl',
  'seated leg curl': 'Leg Curl',
  'leg extensions': 'Leg Extension',
  'barbell ohp': 'Overhead Press',
  'barbell overhead press': 'Overhead Press',
  'military press': 'Overhead Press',
  'ohp': 'Overhead Press',
  'cable rope overhead tricep extension': 'Overhead Tricep Extension',
  'db overhead extension': 'Overhead Tricep Extension',
  'dumbbell overhead extension': 'Overhead Tricep Extension',
  'overhead cable tricep extension': 'Overhead Tricep Extension',
  'overhead extension': 'Overhead Tricep Extension',
  'planks': 'Plank',
  'negative pull-ups': 'Pull-ups',
  'close grip push-ups': 'Push-ups',
  'diamond push-ups': 'Push-ups',
  'wide push-ups': 'Push-ups',
  'reverse flyes': 'Reverse Fly',
  'db rdl': 'Romanian Deadlift',
  'dumbbell rdl': 'Romanian Deadlift',
  'rdl': 'Romanian Deadlift',
  'romanian deadlifts': 'Romanian Deadlift',
  'single leg romanian deadlifts': 'Romanian Deadlift',
  'cable row': 'Seated Cable Row',
  'cable rows': 'Seated Cable Row',
  'cable seated row': 'Seated Cable Row',
  'seated row': 'Seated Cable Row',
  'seated calf raises': 'Seated Calf Raise',
  'db row': 'Single Arm Dumbbell Row',
  'one arm dumbbell row': 'Single Arm Dumbbell Row',
  'single arm db row': 'Single Arm Dumbbell Row',
  'single arm dumbbell rows': 'Single Arm Dumbbell Row',
  'dumbbell skull crushers': 'Skull Crushers',
  'calf raise': 'Standing Calf Raise',
  'calf raises': 'Standing Calf Raise',
  'standing calf raises': 'Standing Calf Raise',
  'straight arm pulldowns': 'Straight Arm Pulldown',
  'cable pushdown': 'Tricep Pushdown',
  'cable tricep pushdowns': 'Tricep Pushdown',
  'rope pushdown': 'Tricep Pushdown',
  'tricep pushdowns': 'Tricep Pushdown',
  'lunges': 'Walking Lunges',
  'walking lunge': 'Walking Lunges',
  'wall sits': 'Wall Sit',
};

/** Strip the "(Set N)" suffix logged exercises are stored with. */
function stripSetNumber(name: string): string {
  return name.replace(/\s*\(Set \d+\)$/, '').trim();
}

/**
 * Resolve a name to its canonical, properly-cased display form (exact
 * case-insensitive alias match), or the input unchanged if unknown. This is
 * the form to use anywhere the result is shown to the user, e.g. PR badges.
 */
export function getCanonicalName(name: string): string {
  const base = stripSetNumber(name);
  return EXERCISE_ALIASES[base.toLowerCase()] ?? base;
}

/** Resolve a name through the canonical alias map, lowercased for matching. */
export function resolveCanonicalName(name: string): string {
  return getCanonicalName(name).toLowerCase();
}

/** Normalize an exercise name for fuzzy matching across naming variations. */
export function normalizeExerciseName(name: string): string {
  // First resolve any known alias to the canonical form
  const resolved = resolveCanonicalName(name);
  const lower = resolved.toLowerCase();
  // For calf raises, "seated" vs "standing" denote genuinely different lifts
  // loaded very differently, so keep the position token instead of stripping it
  // — otherwise both collapse to "calfraise" and findBestMatch pre-fills a
  // seated calf raise with standing-calf-raise weights (and vice versa).
  const isCalf = /\bcalf\b/.test(lower);
  return lower
    .replace(/\bdumbbell\b/g, 'db')
    .replace(/\bbarbell\b/g, 'bb')
    .replace(/\boverhead press\b/g, 'ohp')
    .replace(/\bpush-?ups?\b/g, 'pushup')
    .replace(/\bpull-?ups?\b/g, 'pullup')
    .replace(/\bcable rope\b/g, 'cable')
    .replace(/\bseated\b/g, isCalf ? 'seated' : '')
    .replace(/\bstanding\b/g, isCalf ? 'standing' : '')
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
