/**
 * Evidence-based double-progression suggestions.
 *
 * Rule (standard hypertrophy/strength progression):
 *  - If you reached the TOP of the prescribed rep range last time → add weight,
 *    reset to the bottom of the range.
 *  - If you didn't → keep the weight and aim for one more rep toward the top.
 *  - Bodyweight movements progress by reps.
 *  - No history → fall back to the template's starting weight.
 *
 * Every suggestion carries a short, honest rationale so the number is never a
 * black box. Suggestions are starting points; the user can edit them in the log.
 */

export interface LastUsedLite {
  weight: number; // kg; 0 == bodyweight / unweighted
  reps: number; // top set reps last time
}

export interface ProgressionSuggestion {
  /** Display weight, e.g. "82.5kg" or "BW". */
  weight: string;
  /** Display rep target, e.g. "6-8" or "8". */
  reps: string;
  sets: number;
  /** Short rationale, e.g. "+2.5kg - hit 8 reps last time". */
  note: string;
  trend: 'up' | 'hold' | 'new';
}

export function parseRepRange(targetReps: string | undefined): { sets: number; low: number; high: number } {
  const m = targetReps?.match(/^(\d+)\s*x\s*(\d+)(?:\s*-\s*(\d+))?/i);
  if (!m) return { sets: 3, low: 8, high: 12 };
  const sets = parseInt(m[1], 10) || 3;
  const low = parseInt(m[2], 10) || 8;
  const high = m[3] ? parseInt(m[3], 10) : low;
  return { sets, low, high: Math.max(high, low) };
}

/** Heavier compounds jump in bigger steps than isolation work. */
function weightStepKg(name: string): number {
  const n = name.toLowerCase();
  if (/(squat|deadlift|leg press|hip thrust|rdl|romanian|hack)/.test(n)) return 5;
  return 2.5;
}

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export function suggestProgression(
  name: string,
  targetReps: string | undefined,
  lastUsed: LastUsedLite | undefined | null,
  templateWeight?: string,
): ProgressionSuggestion {
  const { sets, low, high } = parseRepRange(targetReps);
  const repLabel = low === high ? `${low}` : `${low}-${high}`;

  if (!lastUsed) {
    return {
      weight: templateWeight || '-',
      reps: repLabel,
      sets,
      note: 'First time - find a solid working weight',
      trend: 'new',
    };
  }

  const { weight: lastWeight, reps: lastReps } = lastUsed;

  // Bodyweight / unweighted → progress on reps.
  if (!lastWeight || lastWeight <= 0) {
    const target = Math.max(lastReps + 1, low);
    return {
      weight: 'BW',
      reps: `${target}`,
      sets,
      note: lastReps > 0 ? `Aim for ${target} reps (last: ${lastReps})` : `Aim for ${repLabel} reps`,
      trend: 'up',
    };
  }

  // Hit the top of the range → add weight.
  if (lastReps >= high) {
    const step = weightStepKg(name);
    const next = lastWeight + step;
    return {
      weight: `${fmt(next)}kg`,
      reps: repLabel,
      sets,
      note: `+${fmt(step)}kg - you hit ${lastReps} reps last time`,
      trend: 'up',
    };
  }

  // Otherwise hold weight, chase reps.
  return {
    weight: `${fmt(lastWeight)}kg`,
    reps: repLabel,
    sets,
    note: `Same weight - push for ${high} reps (last: ${lastReps})`,
    trend: 'hold',
  };
}
