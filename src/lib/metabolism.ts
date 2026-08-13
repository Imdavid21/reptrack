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

/**
 * Conservative non-exercise activity multiplier. Deliberately excludes logged
 * workouts/walks/runs because those are added to today's balance separately.
 */
export function baselineMaintenanceMultiplier(activityLevel?: string | null): number {
  switch (activityLevel) {
    case 'light': return 1.3;
    case 'moderate': return 1.4;
    case 'active': return 1.5;
    case 'very_active': return 1.6;
    default: return 1.2;
  }
}

export function estimateBaselineMaintenance(bmr: number, activityLevel?: string | null): number {
  return Math.round(bmr * baselineMaintenanceMultiplier(activityLevel));
}

/** Mifflin-St Jeor basal metabolic rate, in kcal/day. */
export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
}

/** How much of today (0–1) has elapsed as of `now`. */
export function fractionOfDayElapsed(now: Date = new Date()): number {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msElapsed = now.getTime() - startOfDay;
  return Math.min(1, Math.max(0, msElapsed / (24 * 60 * 60 * 1000)));
}

/**
 * Resting calories burned so far today, at the given moment — BMR prorated
 * by how much of the day has elapsed. BMR is a per-day rate; a lifter
 * checking in at 9am has only "spent" roughly 9/24 of it so far, not the
 * full daily figure. Purely a display number (today's totals elsewhere
 * still use the full daily BMR as the maintenance baseline).
 */
export function bmrBurnedSoFarToday(bmr: number, now: Date = new Date()): number {
  return Math.round(bmr * fractionOfDayElapsed(now));
}

/**
 * Same as bmrBurnedSoFarToday but unrounded, to two decimal places — a
 * ~1700 kcal/day BMR only moves ~0.02 kcal per second, so a whole-number
 * "live" counter barely changes for a minute at a time and looks frozen.
 * This is what actually powers a visibly ticking counter.
 */
export function bmrBurnedSoFarTodayPrecise(bmr: number, now: Date = new Date()): number {
  return Math.round(bmr * fractionOfDayElapsed(now) * 100) / 100;
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
