/**
 * Programming Engine - derives personalized sets, reps, weight, rest, and RIR
 * for a single exercise, based on the day's bias, the user's training focus,
 * exercise category, and their own logged history.
 *
 * This is the ONE place that decides "what should I actually do today" - it
 * composes two concerns:
 *  1. What's the target rep range / set count / rest for this exercise today
 *     (driven by day bias + training focus + exercise category)?
 *  2. Given that target and what the user actually did last time, what weight
 *     and rep count should they aim for (double progression via
 *     suggestProgression)?
 */

import type { Exercise, WorkoutDay } from './workoutPresets';
import type { LastUsedData } from '@/hooks/useLastUsedWeights';
import type { TrainingFocus } from '@/hooks/useUserPreferences';
import { suggestProgression, ProgressionSuggestion } from './progression';

export type { TrainingFocus };

export interface ProgrammingResult {
  sets: number;
  /** Target rep label to display, e.g. "6-8" or "6". */
  reps: string;
  restSeconds: number;
  rir: string;
  /** Suggested weight for this session, e.g. "82.5kg", "BW", "10kg". */
  weight: string;
  /** Short rationale for the weight/rep suggestion, e.g. "+2.5kg - hit 8 reps last time". */
  note: string;
  trend: ProgressionSuggestion['trend'];
}

// ── Default programming tables (used for 'mix' focus as the day-bias fallback,
// and as the seed before any per-exercise template override) ──────────────

const HEAVY_DEFAULTS: Record<string, { sets: number; reps: string; rest: number; rir: string }> = {
  primary:   { sets: 4, reps: '4-6',  rest: 180, rir: '2-3' },
  accessory: { sets: 3, reps: '8-10', rest: 120, rir: '1-2' },
};

const VOLUME_DEFAULTS: Record<string, { sets: number; reps: string; rest: number; rir: string }> = {
  primary:   { sets: 4, reps: '8-10',  rest: 120, rir: '1-2' },
  accessory: { sets: 3, reps: '12-15', rest: 90,  rir: '1-2' },
};

// ── Focus-driven tables. Unlike 'mix' (which alternates per the day's own
// heavy/volume bias, and defers to whatever the template prescribes), picking
// 'strength' or 'volume' OVERRIDES every exercise's rep range regardless of
// day bias or the template's own numbers - that's the whole point of the
// setting: "set the sets and reps" for me, consistently, toward one goal. ──

const STRENGTH_TABLE: Record<string, { sets: number; reps: string; rest: number; rir: string }> = {
  primary:   { sets: 5, reps: '3-5', rest: 210, rir: '2-3' },
  accessory: { sets: 3, reps: '6-8', rest: 120, rir: '1-2' },
};

const VOLUME_TABLE: Record<string, { sets: number; reps: string; rest: number; rir: string }> = {
  primary:   { sets: 4, reps: '8-12',  rest: 90, rir: '1-2' },
  accessory: { sets: 4, reps: '12-20', rest: 60, rir: '0-1' },
};

// Isolation-style single-joint movements that can go to 0-1 RIR on volume work
const ISOLATION_PATTERNS = [
  'lateral raise', 'rear delt', 'flye', 'fly', 'curl', 'extension',
  'pushdown', 'kickback', 'calf raise', 'wrist', 'shrug',
  'face pull', 'concentration', 'preacher',
];

function isIsolation(exerciseName: string): boolean {
  const lower = exerciseName.toLowerCase();
  return ISOLATION_PATTERNS.some(p => lower.includes(p));
}

// ── Goal-based adjustments (fitness_goal free text - rest time only) ──────

function goalAdjust(
  defaults: { sets: number; reps: string; rest: number; rir: string },
  fitnessGoal?: string | null,
): { sets: number; reps: string; rest: number; rir: string } {
  if (!fitnessGoal) return defaults;

  const goal = fitnessGoal.toLowerCase();

  // Strength-focused → slightly more rest
  if (goal.includes('strength') || goal.includes('power')) {
    return { ...defaults, rest: Math.min(defaults.rest + 30, 240) };
  }

  // Endurance-focused → less rest
  if (goal.includes('endurance') || goal.includes('conditioning')) {
    return { ...defaults, rest: Math.max(defaults.rest - 30, 45) };
  }

  return defaults;
}

// ── Main derivation function ──────────────────────────────────────

/**
 * Derive personalised programming for a single exercise.
 *
 * Priority for sets/reps/rest/rir:
 *  1. Training focus table (strength/volume) - always wins when explicitly set.
 *  2. 'mix' (default/unset) - the day's own heavy/volume bias, then the
 *     template's own explicit "SxR" prescription if it has one (preserves the
 *     original template-authored behavior exactly when no focus is chosen).
 *  3. User's logged set count overlays the result when it's in a sane 2-8
 *     range (a session cut short or padded doesn't get re-programmed forever).
 *  4. Template-level restSeconds/rir overrides (e.g. AI-generated routines)
 *     always take final priority.
 *
 * Weight and the displayed rep number then come from suggestProgression:
 * evidence-based double progression against the user's own last session.
 */
export function derivePersonalizedProgramming(
  exercise: Exercise,
  dayBias: 'heavy' | 'volume' | undefined,
  lastUsed: LastUsedData | undefined,
  fitnessGoal?: string | null,
  trainingFocus?: TrainingFocus | null,
): ProgrammingResult {
  const bias = dayBias || 'volume'; // default to volume if unset
  const cat = exercise.category === 'primary' ? 'primary' : 'accessory';
  const focus: TrainingFocus = trainingFocus || 'mix';

  // 1 - Base sets/reps/rest/rir for the chosen focus
  let raw: { sets: number; reps: string; rest: number; rir: string };
  if (focus === 'strength') {
    raw = { ...STRENGTH_TABLE[cat] };
  } else if (focus === 'volume') {
    raw = { ...VOLUME_TABLE[cat] };
  } else {
    const table = bias === 'heavy' ? HEAVY_DEFAULTS : VOLUME_DEFAULTS;
    raw = { ...table[cat] };
  }

  // 2 - For higher-rep isolation work, allow 0-1 RIR on the last set. Skipped
  // for strength focus - turning heavy accessory work into a 15-20 rep
  // burnout defeats the point of a strength-oriented session.
  const volumeLike = focus === 'volume' || (focus === 'mix' && bias === 'volume');
  if (focus !== 'strength' && volumeLike && cat === 'accessory' && isIsolation(exercise.name)) {
    raw.reps = '15-20';
    raw.rest = 60;
    raw.rir = '0-1';
  }

  // 3 - Apply fitness-goal rest adjustment
  const adjusted = goalAdjust(raw, fitnessGoal);

  let finalSets = adjusted.sets;
  let finalReps = adjusted.reps;

  // 4 - 'mix' only: the template's own explicit "SxR" prescription wins, so a
  // user who never touches this setting sees exactly the original,
  // hand-curated per-exercise behavior. Strength/volume focus intentionally
  // skip this - overriding the template's numbers IS the setting's purpose.
  if (focus === 'mix') {
    const templateMatch = exercise.targetReps.match(/^\d+x(.+)$/);
    if (templateMatch) {
      finalReps = templateMatch[1];
      const templateSets = parseInt(exercise.targetReps, 10);
      if (!isNaN(templateSets)) finalSets = templateSets;
    }
  }

  // 5 - Overlay the user's own logged set count, bounded to a sane range so a
  // session cut short (1 set) or padded (12 sets) doesn't get re-programmed.
  if (lastUsed && lastUsed.sets >= 2 && lastUsed.sets <= 8) {
    finalSets = lastUsed.sets;
  }

  // 6 - Template-level overrides always take final priority
  const finalRest = exercise.restSeconds ?? adjusted.rest;
  const finalRir = exercise.rir ?? adjusted.rir;

  // 7 - Weight & displayed reps: evidence-based double progression against the
  // user's actual last session, targeting the range just derived above. Strip
  // a leading '+' from the template weight (weighted_bw exercises, e.g.
  // "+10kg") before handing it to suggestProgression as the no-history
  // fallback - the UI re-adds that '+' cosmetically for weighted_bw exercises,
  // so leaving it in the stored value would double it up ("++10kg").
  const templateWeight = exercise.targetWeight.replace(/^\+/, '');
  const lastUsedLite = lastUsed ? { weight: lastUsed.weight, reps: lastUsed.reps } : undefined;
  const suggestion = suggestProgression(exercise.name, `${finalSets}x${finalReps}`, lastUsedLite, templateWeight);

  return {
    sets: finalSets,
    reps: suggestion.reps,
    restSeconds: finalRest,
    rir: finalRir,
    weight: suggestion.weight,
    note: suggestion.note,
    trend: suggestion.trend,
  };
}
