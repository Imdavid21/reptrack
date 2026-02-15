/**
 * Programming Engine — derives personalized sets, reps, rest, and RIR
 * based on the day's bias, exercise category, user history, and goals.
 */

import type { Exercise, WorkoutDay } from './workoutPresets';
import type { LastUsedData } from '@/hooks/useLastUsedWeights';

export interface ProgrammingResult {
  sets: number;
  reps: string;
  restSeconds: number;
  rir: string;
}

// ── Default programming tables ────────────────────────────────────

const HEAVY_DEFAULTS: Record<string, { sets: number; reps: string; rest: number; rir: string }> = {
  primary:   { sets: 4, reps: '4-6',  rest: 180, rir: '2-3' },
  accessory: { sets: 3, reps: '8-10', rest: 120, rir: '1-2' },
};

const VOLUME_DEFAULTS: Record<string, { sets: number; reps: string; rest: number; rir: string }> = {
  primary:   { sets: 4, reps: '8-10',  rest: 120, rir: '1-2' },
  accessory: { sets: 3, reps: '12-15', rest: 90,  rir: '1-2' },
};

// Isolation-style single-joint movements that can go to 0-1 RIR on volume day
const ISOLATION_PATTERNS = [
  'lateral raise', 'rear delt', 'flye', 'fly', 'curl', 'extension',
  'pushdown', 'kickback', 'calf raise', 'wrist', 'shrug',
  'face pull', 'concentration', 'preacher',
];

function isIsolation(exerciseName: string): boolean {
  const lower = exerciseName.toLowerCase();
  return ISOLATION_PATTERNS.some(p => lower.includes(p));
}

// ── Goal-based adjustments ────────────────────────────────────────

function goalAdjust(
  defaults: { sets: number; reps: string; rest: number; rir: string },
  fitnessGoal?: string | null,
): { sets: number; reps: string; rest: number; rir: string } {
  if (!fitnessGoal) return defaults;

  const goal = fitnessGoal.toLowerCase();

  // Strength-focused → slightly fewer reps, more rest
  if (goal.includes('strength') || goal.includes('power')) {
    return { ...defaults, rest: Math.min(defaults.rest + 30, 240) };
  }

  // Endurance-focused → more reps, less rest
  if (goal.includes('endurance') || goal.includes('conditioning')) {
    return { ...defaults, rest: Math.max(defaults.rest - 30, 45) };
  }

  return defaults;
}

// ── Main derivation function ──────────────────────────────────────

/**
 * Derive personalised programming for a single exercise.
 *
 * Priority:
 *  1. Template-level overrides (exercise.restSeconds, exercise.rir) always win
 *  2. User's last-used data adjusts set count
 *  3. Best-practice defaults fill remaining gaps
 */
export function derivePersonalizedProgramming(
  exercise: Exercise,
  dayBias: 'heavy' | 'volume' | undefined,
  lastUsed: LastUsedData | undefined,
  fitnessGoal?: string | null,
): ProgrammingResult {
  const bias = dayBias || 'volume'; // default to volume if unset
  const cat = exercise.category === 'primary' ? 'primary' : 'accessory';

  // 1 — Start with bias defaults
  const table = bias === 'heavy' ? HEAVY_DEFAULTS : VOLUME_DEFAULTS;
  const raw = { ...table[cat] };

  // 2 — For volume-day isolations, allow 0-1 RIR on last set
  if (bias === 'volume' && cat === 'accessory' && isIsolation(exercise.name)) {
    raw.reps = '15-20';
    raw.rest = 60;
    raw.rir = '0-1';
  }

  // 3 — Apply goal adjustments
  const adjusted = goalAdjust(raw, fitnessGoal);

  // 4 — Overlay user history (set count only — reps and rest stay programmed)
  let finalSets = adjusted.sets;
  if (lastUsed && lastUsed.sets >= 2 && lastUsed.sets <= 8) {
    finalSets = lastUsed.sets;
  }

  // 5 — Template-level overrides always take priority
  const finalRest = exercise.restSeconds ?? adjusted.rest;
  const finalRir = exercise.rir ?? adjusted.rir;

  // For reps, parse from template targetReps if it has a SxR pattern
  let finalReps = adjusted.reps;
  const templateMatch = exercise.targetReps.match(/^\d+x(.+)$/);
  if (templateMatch) {
    finalReps = templateMatch[1];
    // Also take template set count
    const templateSets = parseInt(exercise.targetReps);
    if (!isNaN(templateSets)) {
      finalSets = lastUsed?.sets ?? templateSets;
    }
  }

  return {
    sets: finalSets,
    reps: finalReps,
    restSeconds: finalRest,
    rir: finalRir,
  };
}
