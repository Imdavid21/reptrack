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
 * A stored `maintenance_calories` of 0 must NOT be treated as a real
 * override — 0 kcal maintenance is nonsensical and previously zeroed out
 * the whole deficit calculation, since `??` only falls back to auto-calc on
 * null/undefined, not 0. Anywhere the manual override is read, it should go
 * through this instead of a raw `??`.
 */
export function resolveMaintenanceOverride(value: number | null | undefined): number | null {
  return value && value > 0 ? value : null;
}
