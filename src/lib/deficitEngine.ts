/**
 * Deficit-mode guard logic (§2). All of this is gated behind deficit_mode at
 * the call sites; these pure functions just compute the signals:
 *  - weekly session count + the 5-session cap (a 6th in a rolling 7 days warns)
 *  - consecutive training-day streak + the ≥5-day mandatory-rest signal
 *  - protein floor (flag days under 1.6 g/kg; target 1.8-2.2 g/kg)
 *
 * Dates are yyyy-MM-dd local day keys so the logic is deterministic + testable.
 */

const MS_PER_DAY = 86_400_000;

function keyToUTC(key: string): number {
  // Parse as UTC midnight; only differences between keys are used, so DST/tz
  // don't matter — this is purely for day arithmetic.
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

function daysBetween(a: string, b: string): number {
  return Math.round((keyToUTC(a) - keyToUTC(b)) / MS_PER_DAY);
}

export interface DeficitGuards {
  /** Distinct training days within the trailing 7 days (including today). */
  sessionsLast7: number;
  /** Consecutive training days ending today or yesterday. */
  consecutiveDays: number;
  /** True when a further session today would be the 6th in 7 days. */
  overSessionCap: boolean;
  /** True when 5+ consecutive training days have occurred (rest is due). */
  needsRest: boolean;
}

export function computeDeficitGuards(workoutDates: string[], todayKey: string): DeficitGuards {
  const trained = new Set(workoutDates);

  // Distinct training days in [today-6, today].
  let sessionsLast7 = 0;
  for (const key of trained) {
    const diff = daysBetween(todayKey, key);
    if (diff >= 0 && diff <= 6) sessionsLast7 += 1;
  }

  // Consecutive-day streak ending at today (or yesterday if today is untrained).
  let start = trained.has(todayKey) ? 0 : (trained.has(shiftKey(todayKey, -1)) ? 1 : -1);
  let consecutiveDays = 0;
  if (start >= 0) {
    let offset = start;
    while (trained.has(shiftKey(todayKey, -offset))) {
      consecutiveDays += 1;
      offset += 1;
    }
  }

  return {
    sessionsLast7,
    consecutiveDays,
    overSessionCap: sessionsLast7 >= 5,
    needsRest: consecutiveDays >= 5,
  };
}

function shiftKey(key: string, deltaDays: number): string {
  const t = keyToUTC(key) + deltaDays * MS_PER_DAY;
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Protein floor: flag a day whose protein is under 1.6 g per kg bodyweight. */
export function proteinBelowFloor(avgProtein: number, bodyweightKg: number): boolean {
  if (!bodyweightKg || bodyweightKg <= 0 || avgProtein <= 0) return false;
  return avgProtein < 1.6 * bodyweightKg;
}

/** Recommended protein band during a cut (g/day), 1.8-2.2 g/kg. */
export function proteinTarget(bodyweightKg: number): { min: number; max: number } {
  return { min: Math.round(1.8 * bodyweightKg), max: Math.round(2.2 * bodyweightKg) };
}
