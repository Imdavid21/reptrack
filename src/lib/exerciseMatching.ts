/**
 * Shared exercise name matching utilities.
 *
 * Used across workout logging, last-used weight look-ups, PR tracking, and
 * growth tracking to ensure fuzzy name resolution is consistent everywhere.
 *
 * IMPORTANT: aliases in this file mean identity, not merely "same muscle".
 * Two names should resolve to one canonical exercise only when their logged
 * load/reps describe the same lift. Equipment or leverage changes that make
 * raw PRs non-comparable belong in exerciseFamilies/exerciseRelationships,
 * not here.
 */

/**
 * Canonical alias map - resolves common abbreviations and legacy naming
 * variations to their unified, properly-cased canonical name. Keys are
 * lowercase for case-insensitive lookup; values are display-ready canonical
 * names used directly in PR badges and progression history.
 */
export const EXERCISE_ALIASES: Record<string, string> = {
  'barbell bench': 'Barbell Bench Press',
  'bb bench press': 'Barbell Bench Press',
  'bench press': 'Barbell Bench Press',
  'flat barbell bench': 'Barbell Bench Press',
  'flat barbell bench press': 'Barbell Bench Press',
  'barbell flat bench press': 'Barbell Bench Press',
  'flat bench press': 'Barbell Bench Press',
  'flat bench': 'Barbell Bench Press',
  'olympic flat bench press': 'Barbell Bench Press',
  'olympic flat bench': 'Barbell Bench Press',

  'barbell curls': 'Barbell Curl',
  'bb curl': 'Barbell Curl',
  'bb curls': 'Barbell Curl',
  'ez bar curls': 'EZ Bar Curl',
  'ez curl': 'EZ Bar Curl',

  'barbell rows': 'Barbell Row',
  'bb row': 'Barbell Row',
  'bent over barbell row': 'Barbell Row',
  'bent over row': 'Barbell Row',
  'pendlay rows': 'Pendlay Row',
  'low row': 'Lever Seated Row Machine',
  'low row machine': 'Lever Seated Row Machine',
  'selectorized low row': 'Lever Seated Row Machine',
  't bar lever row machine': 'T-Bar Row',
  't-bar lever row machine': 'T-Bar Row',

  'back squat': 'Barbell Squat',
  'front squats': 'Front Squat',
  'bb squat': 'Barbell Squat',
  'squat': 'Barbell Squat',
  'squats': 'Barbell Squat',
  '45° plate-loaded leg press': 'Leg Press',
  '45 degree plate-loaded leg press': 'Leg Press',
  '45-degree plate-loaded leg press': 'Leg Press',
  'plate-loaded leg press': 'Leg Press',

  'bent over rear delt fly': 'Bent Over Rear Delt Flyes',
  'rear delt fly': 'Bent Over Rear Delt Flyes',
  'rear delt flyes': 'Bent Over Rear Delt Flyes',
  'reverse flyes': 'Reverse Fly',
  'reverse pec deck fly': 'Reverse Pec Deck',
  'rear delt machine': 'Reverse Pec Deck',
  'reverse fly machine': 'Reverse Pec Deck',
  'reverse fly rear delt machine': 'Reverse Pec Deck',
  'reverse cable fly': 'Cable Rear-Delt Fly',
  'cable reverse fly': 'Cable Rear-Delt Fly',
  'cable rear delt fly': 'Cable Rear-Delt Fly',
  'cable rear delt flyes': 'Cable Rear-Delt Fly',

  'bulgarian split squats': 'Bulgarian Split Squat',
  'cable curls': 'Cable Curl',
  'rope cable curl': 'Cable Curl',
  'rope curl': 'Cable Curl',
  'cable fly': 'Cable Flyes',
  'chest fly': 'Cable Flyes',
  'chest flyes': 'Cable Flyes',
  'machine chest fly': 'Pec Deck',
  'pec fly': 'Pec Deck',
  'chest fly machine': 'Pec Deck',
  'pec deck chest fly machine': 'Pec Deck',
  'close grip chest press': 'Close Grip Bench Press',
  'selectorized chest press': 'Machine Chest Press',
  'selectorized chest press machine': 'Machine Chest Press',
  'chest press machine': 'Machine Chest Press',

  'deadlift': 'Conventional Deadlift',
  'deadlifts': 'Conventional Deadlift',
  'sumo deadlifts': 'Sumo Deadlift',
  'dead hangs': 'Dead Hang',
  'deadlift technique': 'Deadlift Technique Work',
  'db rdl': 'Dumbbell Romanian Deadlift',
  'dumbbell rdl': 'Dumbbell Romanian Deadlift',
  'dumbbell romanian deadlifts': 'Dumbbell Romanian Deadlift',
  'smith rdl': 'Smith Romanian Deadlift',
  'smith machine rdl': 'Smith Romanian Deadlift',
  'smith romanian deadlifts': 'Smith Romanian Deadlift',
  'rdl': 'Romanian Deadlift',
  'romanian deadlifts': 'Romanian Deadlift',
  'single leg romanian deadlifts': 'Single Leg Romanian Deadlift',
  'single leg rdl': 'Single Leg Romanian Deadlift',

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
  // Legacy programs stored the dumbbell version under the shorter label.
  'seated shoulder press': 'Dumbbell Shoulder Press',
  'seated shoulder presses': 'Dumbbell Shoulder Press',

  'preacher curl': 'EZ Bar Preacher Curls',
  'preacher curls': 'EZ Bar Preacher Curls',
  'face pull': 'Face Pulls',
  'glute bridges': 'Glute Bridge',
  'goblet squat': 'Goblet Squats',
  'hammer curls': 'Hammer Curl',
  'cross body hammer curl': 'Cross-Body Hammer Curl',
  'cross body hammer curls': 'Cross-Body Hammer Curl',
  'barbell hip thrust': 'Hip Thrust',
  'hip thrusts': 'Hip Thrust',
  'smith hip thrust': 'Smith Machine Hip Thrust',
  'smith machine hip thrusts': 'Smith Machine Hip Thrust',

  'incline barbell bench': 'Incline Barbell Bench Press',
  'incline barbell press': 'Incline Barbell Bench Press',
  'incline bb bench': 'Incline Barbell Bench Press',
  'olympic incline bench press': 'Incline Barbell Bench Press',
  'olympic incline bench': 'Incline Barbell Bench Press',
  'incline db curl': 'Incline Dumbbell Curl',
  'incline dumbbell curls': 'Incline Dumbbell Curl',
  'incline db fly': 'Incline Dumbbell Flyes',
  'incline db flyes': 'Incline Dumbbell Flyes',
  'incline db bench press': 'Incline Dumbbell Press',
  'incline db press': 'Incline Dumbbell Press',

  'lat pulldowns': 'Lat Pulldown',
  'lat pull down': 'Lat Pulldown',
  'lat pull downs': 'Lat Pulldown',
  'close grip lat pulldowns': 'Close Grip Lat Pulldown',
  'wide grip lat pulldowns': 'Wide Grip Lat Pulldown',
  'reverse grip lat pulldowns': 'Reverse Grip Lat Pulldown',
  'neutral grip lat pulldown': 'Neutral Grip Pulldown',
  'neutral grip lat pulldowns': 'Neutral Grip Pulldown',
  'single arm kneeling lat pulldown': 'Single-Arm Kneeling Lat Pulldown',
  'kneeling single arm lat pulldown': 'Single-Arm Kneeling Lat Pulldown',
  'iso lateral plate loaded lat pulldown': 'Iso-Lateral Plate-Loaded Pulldown',
  'iso-lateral plate-loaded lat pulldown': 'Iso-Lateral Plate-Loaded Pulldown',
  'plate loaded lat pulldown': 'Iso-Lateral Plate-Loaded Pulldown',
  'plate-loaded lat pulldown': 'Iso-Lateral Plate-Loaded Pulldown',

  'db lateral raise': 'Lateral Raises',
  'dumbbell lateral raise': 'Lateral Raises',
  'dumbbell lateral raises': 'Lateral Raises',
  'lateral raise': 'Lateral Raises',
  'lateral raise machine': 'Machine Lateral Raise',
  'machine lateral raises': 'Machine Lateral Raise',
  'lean away cable lateral raise': 'Lean-Away Cable Lateral Raise',
  'lean-away cable lateral raises': 'Lean-Away Cable Lateral Raise',

  'leg curls': 'Leg Curl',
  'lying leg curls': 'Lying Leg Curl',
  'seated leg curls': 'Seated Leg Curl',
  'seated leg curl machine': 'Seated Leg Curl',
  'leg extensions': 'Leg Extension',
  'leg extension machine': 'Leg Extension',
  'seated leg extension': 'Leg Extension',

  'barbell ohp': 'Overhead Press',
  'barbell overhead press': 'Overhead Press',
  'military press': 'Overhead Press',
  'ohp': 'Overhead Press',
  'overhead barbell press': 'Overhead Press',
  'standing barbell press': 'Overhead Press',

  'cable rope overhead tricep extension': 'Overhead Cable Tricep Extension',
  'overhead cable tricep extension': 'Overhead Cable Tricep Extension',
  'overhead cable extension': 'Overhead Cable Tricep Extension',
  'db overhead extension': 'Dumbbell Overhead Extension',
  'dumbbell overhead extension': 'Dumbbell Overhead Extension',
  'tricep extension dumbbell': 'Dumbbell Overhead Extension',
  'dumbbell tricep extension': 'Dumbbell Overhead Extension',
  'overhead extension': 'Overhead Tricep Extension',
  'tricep extension': 'Overhead Tricep Extension',

  'planks': 'Plank',
  'negative pull-ups': 'Pull-ups',
  'close grip push-ups': 'Push-ups',
  'diamond push-ups': 'Push-ups',
  'wide push-ups': 'Push-ups',

  'cable row': 'Seated Cable Row',
  'cable rows': 'Seated Cable Row',
  'cable seated row': 'Seated Cable Row',
  'seated row': 'Seated Cable Row',
  'seated calf raises': 'Seated Calf Raise',
  'seated calf raise machine': 'Seated Calf Raise',
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

  // --- Naming fragments found in existing history (2026-08 exercise audit) ---
  'dumbbell skullcrusher': 'Skull Crushers',
  'dumbbell skullcrushers': 'Skull Crushers',
  'skullcrusher': 'Skull Crushers',
  'skull crusher': 'Skull Crushers',
  'lying tricep extension': 'Skull Crushers',
  'spider curl': 'Spider Curls',
  'reverse curl': 'Reverse Curls',
  'reverse curls': 'Reverse Curls',
  'ez reverse curl': 'EZ Bar Reverse Curls',
  'ez reverse curls': 'EZ Bar Reverse Curls',
  'ez bar reverse curl': 'EZ Bar Reverse Curls',
  'reverse barbell curl': 'Barbell Reverse Curls',
  'barbell reverse curl': 'Barbell Reverse Curls',
  'dumbbell reverse curl': 'Dumbbell Reverse Curls',
  'reverse dumbbell curl': 'Dumbbell Reverse Curls',
  'cable reverse curl': 'Cable Reverse Curls',
  'reverse cable curl': 'Cable Reverse Curls',
  'cable wrist curls': 'Cable Wrist Curl',
  'cable wrist flexion': 'Cable Wrist Curl',
  'cable wrist extensions': 'Cable Wrist Extension',
  'reverse cable wrist curl': 'Cable Wrist Extension',
  'reverse cable wrist curls': 'Cable Wrist Extension',
  'inclined chest press': 'Incline Chest Press',
  'incline chest press machine': 'Incline Chest Press',
  'inclined dumbbell press': 'Incline Dumbbell Press',
  'stiff leg deadlifts': 'Stiff Leg Deadlift',
  'stiff legged deadlift': 'Stiff Leg Deadlift',
  'close grip bench': 'Close Grip Bench Press',
};

/**
 * Morphological key: lowercase, hyphen/punctuation-insensitive, singularised
 * per word. "Close-grip Bench Presses", "close grip bench press" and
 * "Close Grip Bench Press" all collapse to the same key, so a plural or
 * hyphenated spelling can never fork a second progress history.
 */
function morphKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      if (word.length <= 3) return word;
      if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
      if (/(sh|ch|ss|x)es$/.test(word)) return word.slice(0, -2);
      if (word.endsWith('ss')) return word;
      if (word.endsWith('s')) return word.slice(0, -1);
      return word;
    })
    .join(' ');
}

/**
 * Alias lookup by morphological key. Includes every canonical target mapped
 * to itself, so an unseen inflection of a known canonical name still lands on
 * the canonical spelling instead of becoming a brand-new exercise.
 */
const ALIASES_BY_MORPH: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const canonical of new Set(Object.values(EXERCISE_ALIASES))) {
    map[morphKey(canonical)] = canonical;
  }
  for (const [alias, canonical] of Object.entries(EXERCISE_ALIASES)) {
    map[morphKey(alias)] = canonical;
  }
  return map;
})();

/** Strip the "(Set N)" suffix logged exercises are stored with. */
function stripSetNumber(name: string): string {
  return name.replace(/\s*\(Set \d+\)$/, '').trim();
}

/** Resolve a name to its canonical, properly-cased display form. */
export function getCanonicalName(name: string): string {
  const base = stripSetNumber(name);
  return EXERCISE_ALIASES[base.toLowerCase()] ?? ALIASES_BY_MORPH[morphKey(base)] ?? base;
}

/** Resolve a name through the canonical alias map, lowercased for matching. */
export function resolveCanonicalName(name: string): string {
  return getCanonicalName(name).toLowerCase();
}

/** Normalize an exercise name for fuzzy matching across naming variations. */
export function normalizeExerciseName(name: string): string {
  const resolved = resolveCanonicalName(name);
  const lower = resolved.toLowerCase();
  // Position changes are meaningful for calves and leg curls because the same
  // selected load can represent a materially different machine/mechanical PR.
  const preservePosition = /\b(calf|leg curl)\b/.test(lower);
  return lower
    .replace(/\bdumbbell\b/g, 'db')
    .replace(/\bbarbell\b/g, 'bb')
    .replace(/\boverhead press\b/g, 'ohp')
    .replace(/\bpush-?ups?\b/g, 'pushup')
    .replace(/\bpull-?ups?\b/g, 'pullup')
    .replace(/\bcable rope\b/g, 'cable')
    .replace(/\bseated\b/g, preservePosition ? 'seated' : '')
    .replace(/\bstanding\b/g, preservePosition ? 'standing' : '')
    .replace(/\blying\b/g, preservePosition ? 'lying' : '')
    .replace(/\bpress\b/g, '')
    .replace(/\bflyes?\b/g, 'fly')
    .replace(/s\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Find the best match for `exerciseName` inside a keyed map.
 * Resolution order: exact, normalised equality, then guarded containment.
 */
export function findBestMatch<T>(
  exerciseName: string,
  map: Record<string, T> | undefined,
): T | undefined {
  if (!map) return undefined;
  if (map[exerciseName]) return map[exerciseName];

  const target = normalizeExerciseName(exerciseName);
  for (const [key, value] of Object.entries(map)) {
    if (normalizeExerciseName(key) === target) return value;
  }

  for (const [key, value] of Object.entries(map)) {
    const keyNorm = normalizeExerciseName(key);
    if (target.length > 6 && keyNorm.length > 6) {
      if (target.includes(keyNorm) || keyNorm.includes(target)) return value;
    }
  }

  return undefined;
}
