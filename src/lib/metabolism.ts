/**
 * Automated basal/total energy expenditure — the numbers Deficit Mode's
 * "maintenance calories" should be built from instead of a manually-typed
 * guess.
 *
 * BMR (Mifflin-St Jeor) is the single source of truth for this formula —
 * previously duplicated ad hoc in useCalorieBurn.ts and OnboardingFlow.tsx,
 * which risked the two drifting apart. Both now import from here.
 */

export type Gender = 'male' | 'female' | string | null | undefined;

/** Mifflin-St Jeor basal metabolic rate, in kcal/day. */
export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
}

export interface DailyBurnEntry {
  date: string;
  calories: number;
}

/**
 * Average daily calories burned through logged activity/workouts over a
 * trailing window — dividing by the full window length (not just days with
 * an entry) so rest days correctly pull the average down, the way a real
 * TDEE accounts for days you didn't train.
 */
export function averageDailyActivityBurn(entries: DailyBurnEntry[], windowDays: number): number {
  if (windowDays <= 0) return 0;
  const total = entries.reduce((sum, e) => sum + (e.calories || 0), 0);
  return Math.round(total / windowDays);
}

export interface AutoMaintenanceInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityBurnEntries: DailyBurnEntry[];
  /** Trailing window (days) the activity burn average is computed over. */
  windowDays: number;
}

export interface AutoMaintenanceResult {
  /** Resting energy expenditure. */
  bmr: number;
  /** Trailing average daily burn from actual logged workouts/activity. */
  avgActivityBurn: number;
  /** BMR + avgActivityBurn — the body-based, auto-updating maintenance estimate. */
  maintenance: number;
}

/**
 * Full auto-maintenance calculation: BMR from the user's own body (latest
 * weigh-in, profile height/age/gender) plus a trailing average of their own
 * logged activity burn, instead of a fixed "activity level" multiplier or a
 * static manually-entered number. Recomputing this on every render means it
 * updates automatically as new weigh-ins and workouts are logged — nothing
 * to remember to re-enter.
 */
export function computeAutoMaintenance(input: AutoMaintenanceInput): AutoMaintenanceResult {
  const bmr = calculateBMR(input.weightKg, input.heightCm, input.age, input.gender);
  const avgActivityBurn = averageDailyActivityBurn(input.activityBurnEntries, input.windowDays);
  return { bmr, avgActivityBurn, maintenance: bmr + avgActivityBurn };
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
