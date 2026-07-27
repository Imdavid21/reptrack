/**
 * Automated basal metabolic rate — the number Deficit Mode's "maintenance
 * calories" is built from instead of a manually-typed guess.
 *
 * Mifflin-St Jeor is the single source of truth for this formula —
 * previously duplicated ad hoc in useCalorieBurn.ts and OnboardingFlow.tsx,
 * which risked the two drifting apart. Both now import from here.
 *
 * Deliberately BMR only, not BMR + an activity estimate: the app's
 * net-deficit formula (maintenance − eaten + burned) already adds TODAY's
 * real logged burn back on top — the standard "eat back your exercise
 * calories" model. Folding an activity estimate into maintenance on top of
 * that would double-count it on a typical day (once as an assumption here,
 * again for real via today's logged burn) and credit activity that never
 * happened on a day with nothing logged.
 */

export type Gender = 'male' | 'female' | string | null | undefined;

/** Mifflin-St Jeor basal metabolic rate, in kcal/day. */
export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
}

/**
 * Resting calories burned so far today, at the given moment — BMR prorated
 * by how much of the day has elapsed. BMR is a per-day rate; a lifter
 * checking in at 9am has only "spent" roughly 9/24 of it so far, not the
 * full daily figure. Purely a display number (today's totals elsewhere
 * still use the full daily BMR as the maintenance baseline) — this is what
 * powers a live "burned right now" counter on the dashboard.
 */
export function bmrBurnedSoFarToday(bmr: number, now: Date = new Date()): number {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msElapsed = now.getTime() - startOfDay;
  const fractionOfDay = Math.min(1, Math.max(0, msElapsed / (24 * 60 * 60 * 1000)));
  return Math.round(bmr * fractionOfDay);
}

/**
 * A stored `maintenance_calories` of 0 must NOT be treated as a real
 * override — 0 kcal maintenance is nonsensical and previously zeroed out
 * the whole deficit calculation, since `??` only falls back to auto-calc on
 * null/undefined, not 0. Anywhere the manual override is read, it should go
 * through this instead of a raw `??`.
 */
export function resolveMaintenanceOverride(value: number | null | undefined): number | null {
  return value && value > 0 ? value : null;
}
