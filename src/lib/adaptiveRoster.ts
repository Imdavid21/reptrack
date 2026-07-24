/**
 * Adaptive Mode static content — the six movement patterns and their curated
 * exercise-variation rosters, each rated 1–5 across the four strength-curve
 * zones the Infinite Progression method rotates around: lock-out, mid-range,
 * bottom-range, stability. This is fixed reference content (like
 * exerciseClassification.ts's exercise table), not per-user data, so it
 * ships in code rather than a database table.
 *
 * Scores are coaching heuristics, not biomechanics measurements: they
 * describe where each variation's resistance profile makes a lifter *work
 * hardest* relative to the pattern's other variations, which is exactly what
 * variation-selection (adaptiveEngine.ts) needs to match against a detected
 * weak point.
 */

import { stripSetSuffix } from './exerciseClassification';

export type MovementPatternKey = 'vertical_pull' | 'horizontal_pull' | 'vertical_press' | 'horizontal_press' | 'squat' | 'hinge';

export type StrengthZone = 'lock-out' | 'mid-range' | 'bottom-range' | 'stability';

export interface StrengthCurveProfile {
  'lock-out': number;
  'mid-range': number;
  'bottom-range': number;
  stability: number;
}

export interface RosterVariation {
  name: string;
  /** Matches this variation to logged sets — see exerciseClassification.ts naming. */
  exerciseNameHints: string[];
  curve: StrengthCurveProfile;
}

export interface MovementPatternDef {
  key: MovementPatternKey;
  name: string;
  /** The reference lift used to measure the pattern's overall progression. */
  keyMovement: string;
  variations: RosterVariation[];
}

export const MOVEMENT_PATTERNS: Record<MovementPatternKey, MovementPatternDef> = {
  vertical_press: {
    key: 'vertical_press',
    name: 'Vertical Press',
    keyMovement: 'Standing Barbell Overhead Press',
    variations: [
      { name: 'Standing Barbell Overhead Press', exerciseNameHints: ['overhead press', 'barbell overhead press', 'ohp'],
        curve: { 'lock-out': 4, 'mid-range': 4, 'bottom-range': 3, stability: 3 } },
      { name: 'Banded Overhead Press', exerciseNameHints: ['banded overhead press'],
        curve: { 'lock-out': 5, 'mid-range': 4, 'bottom-range': 2, stability: 4 } },
      { name: 'Landmine Press', exerciseNameHints: ['landmine press'],
        curve: { 'lock-out': 2, 'mid-range': 3, 'bottom-range': 5, stability: 2 } },
      { name: 'Smith Machine Shoulder Press', exerciseNameHints: ['smith machine overhead press', 'machine shoulder press'],
        curve: { 'lock-out': 3, 'mid-range': 5, 'bottom-range': 3, stability: 2 } },
      { name: 'Z Press', exerciseNameHints: ['z press'],
        curve: { 'lock-out': 2, 'mid-range': 3, 'bottom-range': 4, stability: 5 } },
    ],
  },
  horizontal_press: {
    key: 'horizontal_press',
    name: 'Horizontal Press',
    keyMovement: 'Barbell Bench Press',
    variations: [
      { name: 'Barbell Bench Press', exerciseNameHints: ['barbell bench press', 'flat barbell bench', 'bench press'],
        curve: { 'lock-out': 4, 'mid-range': 4, 'bottom-range': 3, stability: 2 } },
      { name: 'Board Press', exerciseNameHints: ['board press'],
        curve: { 'lock-out': 5, 'mid-range': 3, 'bottom-range': 1, stability: 2 } },
      { name: 'Spoto Press', exerciseNameHints: ['spoto press'],
        curve: { 'lock-out': 2, 'mid-range': 4, 'bottom-range': 5, stability: 3 } },
      { name: 'Dumbbell Bench Press', exerciseNameHints: ['dumbbell bench press', 'db bench press'],
        curve: { 'lock-out': 3, 'mid-range': 3, 'bottom-range': 4, stability: 5 } },
      { name: 'Close-Grip Bench Press', exerciseNameHints: ['close grip bench press'],
        curve: { 'lock-out': 5, 'mid-range': 3, 'bottom-range': 2, stability: 2 } },
    ],
  },
  vertical_pull: {
    key: 'vertical_pull',
    name: 'Vertical Pull',
    keyMovement: 'Weighted Pull-Up',
    variations: [
      { name: 'Weighted Pull-Up', exerciseNameHints: ['weighted pull-ups', 'pull-ups', 'pull ups'],
        curve: { 'lock-out': 3, 'mid-range': 4, 'bottom-range': 4, stability: 5 } },
      { name: 'Lat Pulldown', exerciseNameHints: ['lat pulldown', 'wide grip lat pulldown'],
        curve: { 'lock-out': 3, 'mid-range': 5, 'bottom-range': 3, stability: 2 } },
      { name: 'Banded Pull-Up', exerciseNameHints: ['banded pull-up'],
        curve: { 'lock-out': 5, 'mid-range': 3, 'bottom-range': 1, stability: 3 } },
      { name: 'Straight-Arm Pulldown', exerciseNameHints: ['straight arm pulldown'],
        curve: { 'lock-out': 1, 'mid-range': 4, 'bottom-range': 5, stability: 2 } },
      { name: 'Kneeling Single-Arm Lat Pulldown', exerciseNameHints: ['kneeling single arm lat pulldown'],
        curve: { 'lock-out': 3, 'mid-range': 4, 'bottom-range': 3, stability: 5 } },
    ],
  },
  horizontal_pull: {
    key: 'horizontal_pull',
    name: 'Horizontal Pull',
    keyMovement: 'Barbell Row',
    variations: [
      { name: 'Barbell Row', exerciseNameHints: ['barbell row', 'bent over row'],
        curve: { 'lock-out': 3, 'mid-range': 4, 'bottom-range': 3, stability: 3 } },
      { name: 'Chest-Supported Row', exerciseNameHints: ['chest supported row'],
        curve: { 'lock-out': 3, 'mid-range': 5, 'bottom-range': 3, stability: 2 } },
      { name: 'Pendlay Row', exerciseNameHints: ['pendlay row'],
        curve: { 'lock-out': 2, 'mid-range': 3, 'bottom-range': 5, stability: 3 } },
      { name: 'Seated Cable Row', exerciseNameHints: ['seated cable row', 'cable row'],
        curve: { 'lock-out': 4, 'mid-range': 4, 'bottom-range': 2, stability: 2 } },
      { name: 'Single-Arm Dumbbell Row', exerciseNameHints: ['single arm dumbbell row', 'dumbbell row'],
        curve: { 'lock-out': 3, 'mid-range': 3, 'bottom-range': 4, stability: 5 } },
    ],
  },
  squat: {
    key: 'squat',
    name: 'Squat',
    keyMovement: 'Back Squat',
    variations: [
      { name: 'Back Squat', exerciseNameHints: ['back squat', 'barbell squat'],
        curve: { 'lock-out': 4, 'mid-range': 4, 'bottom-range': 3, stability: 3 } },
      { name: 'Front Squat', exerciseNameHints: ['front squat'],
        curve: { 'lock-out': 2, 'mid-range': 4, 'bottom-range': 4, stability: 4 } },
      { name: 'Box Squat', exerciseNameHints: ['box squat'],
        curve: { 'lock-out': 3, 'mid-range': 2, 'bottom-range': 5, stability: 2 } },
      { name: 'Safety-Bar Squat', exerciseNameHints: ['safety bar squat'],
        curve: { 'lock-out': 3, 'mid-range': 3, 'bottom-range': 3, stability: 5 } },
      { name: 'Pause Squat', exerciseNameHints: ['pause squat'],
        curve: { 'lock-out': 2, 'mid-range': 3, 'bottom-range': 5, stability: 3 } },
    ],
  },
  hinge: {
    key: 'hinge',
    name: 'Hinge',
    keyMovement: 'Conventional Deadlift',
    variations: [
      { name: 'Conventional Deadlift', exerciseNameHints: ['conventional deadlift', 'deadlift'],
        curve: { 'lock-out': 4, 'mid-range': 3, 'bottom-range': 4, stability: 3 } },
      { name: 'Romanian Deadlift', exerciseNameHints: ['romanian deadlift', 'rdl'],
        curve: { 'lock-out': 2, 'mid-range': 4, 'bottom-range': 4, stability: 3 } },
      { name: 'Deficit Deadlift', exerciseNameHints: ['deficit deadlift'],
        curve: { 'lock-out': 2, 'mid-range': 2, 'bottom-range': 5, stability: 3 } },
      { name: 'Rack Pull', exerciseNameHints: ['rack pull', 'rack pulls'],
        curve: { 'lock-out': 5, 'mid-range': 3, 'bottom-range': 1, stability: 2 } },
      { name: 'Single-Leg Romanian Deadlift', exerciseNameHints: ['single leg romanian deadlift', 'single leg rdl'],
        curve: { 'lock-out': 2, 'mid-range': 3, 'bottom-range': 3, stability: 5 } },
    ],
  },
};

export const MOVEMENT_PATTERN_LIST: MovementPatternDef[] = Object.values(MOVEMENT_PATTERNS);

export function getVariation(patternKey: MovementPatternKey, variationName: string): RosterVariation | undefined {
  return MOVEMENT_PATTERNS[patternKey]?.variations.find(v => v.name === variationName);
}

export interface RosterMatch {
  patternKey: MovementPatternKey;
  variationName: string;
}

/**
 * Matches an already-logged exercise name to a roster variation, so Adaptive
 * Mode can seed a pattern's first lifecycle from real training history
 * instead of a blank manual-entry form. Exact hint matches win; a substring
 * fallback catches close variants (e.g. a user's own "DB OHP" shorthand
 * against the "overhead press" hint).
 */
export function matchExerciseToPattern(exerciseName: string): RosterMatch | null {
  const stripped = stripSetSuffix(exerciseName).toLowerCase().trim();
  if (!stripped) return null;

  for (const pattern of MOVEMENT_PATTERN_LIST) {
    for (const variation of pattern.variations) {
      if (variation.exerciseNameHints.some(h => h.toLowerCase() === stripped)) {
        return { patternKey: pattern.key, variationName: variation.name };
      }
    }
  }
  for (const pattern of MOVEMENT_PATTERN_LIST) {
    for (const variation of pattern.variations) {
      if (variation.exerciseNameHints.some(h => stripped.includes(h.toLowerCase()))) {
        return { patternKey: pattern.key, variationName: variation.name };
      }
    }
  }
  return null;
}

export interface HistoricalSet {
  exercise_name: string;
  actual_weight: number | null;
  actual_reps: number | null;
  workout_date?: string;
  completed?: boolean;
}

export interface HistorySeed {
  variationName: string;
  startingLoad: number;
  startingReps: number;
}

/**
 * Seeds a pattern's first lifecycle from already-logged sets: the heaviest
 * completed set, on the most recent date the user trained a variation of
 * this pattern. Returns null when nothing in the pattern has ever been
 * logged, so the caller falls back to manual entry.
 */
export function detectPatternSeed(patternKey: MovementPatternKey, sets: HistoricalSet[]): HistorySeed | null {
  const matched = sets
    .filter((s): s is HistoricalSet & { workout_date: string; actual_weight: number; actual_reps: number } =>
      s.completed !== false && !!s.actual_weight && !!s.actual_reps && !!s.workout_date)
    .map(s => ({ set: s, match: matchExerciseToPattern(s.exercise_name) }))
    .filter((x): x is { set: HistoricalSet & { workout_date: string; actual_weight: number; actual_reps: number }; match: RosterMatch } =>
      x.match?.patternKey === patternKey);
  if (matched.length === 0) return null;

  const mostRecentDate = [...matched].sort((a, b) => b.set.workout_date.localeCompare(a.set.workout_date))[0].set.workout_date;
  const sameDay = matched.filter(m => m.set.workout_date === mostRecentDate);
  const heaviest = [...sameDay].sort((a, b) => b.set.actual_weight - a.set.actual_weight)[0];

  return { variationName: heaviest.match.variationName, startingLoad: heaviest.set.actual_weight, startingReps: heaviest.set.actual_reps };
}
