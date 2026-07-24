/**
 * Adaptive Mode decision engine — the Infinite Progression (IP) method.
 *
 * Pure functions only: given a lifecycle's logged sessions and the static
 * roster (adaptiveRoster.ts), decide whether to keep progressing, when to
 * rotate variations, which variation to rotate to, how much strength carries
 * forward, and what today's leading/back-off targets should be. No Supabase
 * or React here — useAdaptiveMode.ts is the thin data-fetching layer that
 * feeds these functions real rows and writes their output back.
 */

import { MovementPatternDef, RosterVariation, StrengthCurveProfile, StrengthZone } from './adaptiveRoster';

export interface AdaptiveConfig {
  /** Hard cap on lifecycle duration in weeks — forces rotation even if progress continues. */
  lifecycleMaxWeeks: number;
  /** Back-off set load as a fraction of the leading set's load. */
  backoffPercent: number;
  /** How many other lifecycles in the same pattern must close before a
   *  resensitising variation becomes selectable again. */
  resensitiseMinOtherLifecycles: number;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  lifecycleMaxWeeks: 7,
  backoffPercent: 0.85,
  resensitiseMinOtherLifecycles: 2,
};

export interface SessionLogEntry {
  session_date: string; // yyyy-MM-dd
  leading_load: number;
  leading_reps: number;
  backoff_load?: number | null;
  backoff_reps?: number | null;
  weak_point_zone?: StrengthZone | null;
}

export interface LifecycleRecord {
  id: string;
  movement_pattern: string;
  variation_name: string;
  rep_range_low: number;
  rep_range_high: number;
  start_date: string;
  end_date: string | null;
  starting_load: number | null;
  ending_load: number | null;
  carryover_in: number;
  carryover_out: number | null;
  status: 'active' | 'closed';
}

// ── End-of-lifecycle trigger detection ───────────────────────────────────────

export type EndTriggerType = 'reps_floor' | 'load_stall' | 'form_breakdown' | 'duration_cap';

export interface EndTriggerResult {
  type: EndTriggerType;
  detail: string;
}

function sortByDate(sessions: SessionLogEntry[]): SessionLogEntry[] {
  return [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date));
}

/** Same weak-point zone flagged in the two most recent (consecutive) sessions. */
export function consecutiveZoneBreakdown(sessions: SessionLogEntry[]): StrengthZone | null {
  const sorted = sortByDate(sessions);
  if (sorted.length < 2) return null;
  const [prev, last] = sorted.slice(-2);
  if (prev.weak_point_zone && prev.weak_point_zone === last.weak_point_zone) return prev.weak_point_zone;
  return null;
}

/**
 * Checks all four end-of-lifecycle triggers in the spec's priority order.
 * Returns the first that fires, or null if the lifecycle should continue.
 */
export function checkEndTrigger(
  lifecycle: Pick<LifecycleRecord, 'start_date' | 'rep_range_low'>,
  sessions: SessionLogEntry[],
  config: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG,
  today: Date = new Date(),
): EndTriggerResult | null {
  const sorted = sortByDate(sessions);

  // 1. Reps at the rep-range floor for 2 consecutive sessions with no load increase.
  if (sorted.length >= 2) {
    const [prev, last] = sorted.slice(-2);
    const bothAtFloor = prev.leading_reps <= lifecycle.rep_range_low && last.leading_reps <= lifecycle.rep_range_low;
    const noLoadIncrease = last.leading_load <= prev.leading_load;
    if (bothAtFloor && noLoadIncrease) {
      return {
        type: 'reps_floor',
        detail: `Reps have been stuck at the ${lifecycle.rep_range_low}-rep floor for 2 sessions with no load increase.`,
      };
    }
  }

  // 2. Load stalled (no increase) for 2+ consecutive sessions.
  if (sorted.length >= 3) {
    const [a, b, c] = sorted.slice(-3);
    if (b.leading_load <= a.leading_load && c.leading_load <= b.leading_load) {
      return { type: 'load_stall', detail: 'Leading-set load has not increased for 2 consecutive sessions.' };
    }
  }

  // 3. Form breakdown logged in the same zone for 2+ consecutive sessions.
  const zone = consecutiveZoneBreakdown(sorted);
  if (zone) {
    return { type: 'form_breakdown', detail: `Form breakdown logged in the ${zone} zone for 2 consecutive sessions.` };
  }

  // 4. Hard cap on lifecycle duration, even if progress is still being made.
  const weeksElapsed = (today.getTime() - new Date(lifecycle.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000);
  if (weeksElapsed >= config.lifecycleMaxWeeks) {
    return {
      type: 'duration_cap',
      detail: `This lifecycle has run ${Math.floor(weeksElapsed)} weeks — rotating for novelty even though progress continued.`,
    };
  }

  return null;
}

// ── Weak-point detection ─────────────────────────────────────────────────────

/**
 * Any zone flagged in 2+ sessions within the lifecycle (not necessarily
 * consecutive) counts as an open weak point — broader than the end-trigger's
 * "2 consecutive sessions" rule, per spec Section 4. Ties broken by most
 * recent occurrence.
 */
export function detectOpenWeakPoint(sessions: SessionLogEntry[]): StrengthZone | null {
  const counts = new Map<StrengthZone, { count: number; lastDate: string }>();
  for (const s of sortByDate(sessions)) {
    if (!s.weak_point_zone) continue;
    const entry = counts.get(s.weak_point_zone) ?? { count: 0, lastDate: s.session_date };
    entry.count += 1;
    entry.lastDate = s.session_date;
    counts.set(s.weak_point_zone, entry);
  }
  const open = [...counts.entries()].filter(([, v]) => v.count >= 2);
  if (open.length === 0) return null;
  open.sort((a, b) => b[1].lastDate.localeCompare(a[1].lastDate));
  return open[0][0];
}

// ── Carryover ─────────────────────────────────────────────────────────────────

export function computeCarryoverOut(startingLoad: number | null, endingLoad: number | null): number {
  if (startingLoad == null || endingLoad == null) return 0;
  return Math.max(0, Math.round((endingLoad - startingLoad) * 10) / 10);
}

/** Cumulative strength gained in a pattern, from every closed lifecycle regardless of variation. */
export function computeCarryoverTotal(lifecycles: LifecycleRecord[], movementPattern: string): number {
  return lifecycles
    .filter(l => l.movement_pattern === movementPattern && l.status === 'closed')
    .reduce((sum, l) => sum + (l.carryover_out ?? 0), 0);
}

const ZONES: StrengthZone[] = ['lock-out', 'mid-range', 'bottom-range', 'stability'];

/**
 * How much of a pattern's carryover_total transfers 1:1 into a new
 * variation's starting load. Identical strength-curve profiles transfer at
 * 1.0; variations with very different resistance profiles (e.g. banded vs.
 * barbell) transfer less, since the raw kg number doesn't mean the same
 * thing on a different curve.
 */
export function deriveConversionFactor(fromCurve: StrengthCurveProfile, toCurve: StrengthCurveProfile): number {
  const dot = ZONES.reduce((s, z) => s + fromCurve[z] * toCurve[z], 0);
  const magA = Math.sqrt(ZONES.reduce((s, z) => s + fromCurve[z] ** 2, 0));
  const magB = Math.sqrt(ZONES.reduce((s, z) => s + toCurve[z] ** 2, 0));
  const similarity = magA && magB ? dot / (magA * magB) : 1;
  // Cosine similarity across these curves realistically ranges ~0.5–1.0;
  // map that onto a 0.6–1.0 conversion factor so even a very different
  // variation still carries forward most of the accumulated strength.
  return Math.round(Math.max(0.6, Math.min(1, 0.6 + (similarity - 0.5) * 0.8)) * 100) / 100;
}

/**
 * new_starting_load = new_variation_baseline + carryover_total, adjusted by
 * the conversion factor between the prior and new variation's curves.
 */
export function computeNewStartingLoad(
  variationBaseline: number,
  carryoverTotal: number,
  conversionFactor: number,
): number {
  return Math.round((variationBaseline + carryoverTotal * conversionFactor) * 10) / 10;
}

// ── Variation selection (weak-point matching) ────────────────────────────────

export interface VariationCandidate {
  variation: RosterVariation;
  /** Null if this variation has never been used for this user/pattern. */
  lastActiveEndDate: string | null;
  /** True while inside its post-lifecycle resensitisation window. */
  resensitising: boolean;
}

export interface SelectionResult {
  variation: RosterVariation;
  reason: string;
}

/**
 * Picks the next variation for a pattern. Priority: a variation whose curve
 * is strong exactly where the user's open weak point is weak (and isn't
 * itself weak there); falling back to whichever eligible variation has gone
 * longest without being trained, to maximize novelty/resensitisation.
 */
export function selectNextVariation(
  pattern: MovementPatternDef,
  candidates: VariationCandidate[],
  currentVariationName: string,
  openWeakPoint: StrengthZone | null,
): SelectionResult {
  const notCurrent = candidates.filter(c => c.variation.name !== currentVariationName);
  const eligible = notCurrent.filter(c => !c.resensitising);
  // If every other variation is still resensitising (small roster / early on),
  // fall back to the full non-current pool rather than getting stuck.
  const pool = eligible.length > 0 ? eligible : notCurrent;

  if (openWeakPoint) {
    const strongThere = pool.filter(c => c.variation.curve[openWeakPoint] >= 4);
    const atLeastAdequate = pool.filter(c => c.variation.curve[openWeakPoint] >= 3);
    const ranked = [...(strongThere.length > 0 ? strongThere : atLeastAdequate.length > 0 ? atLeastAdequate : pool)]
      .sort((a, b) => b.variation.curve[openWeakPoint] - a.variation.curve[openWeakPoint]);
    if (ranked.length > 0) {
      const chosen = ranked[0];
      return {
        variation: chosen.variation,
        reason: `Selected because your last lifecycles flagged a ${openWeakPoint} weak point in ${pattern.name} — ${chosen.variation.name} scores ${chosen.variation.curve[openWeakPoint]}/5 there.`,
      };
    }
  }

  const byNovelty = [...pool].sort((a, b) => {
    if (a.lastActiveEndDate === null && b.lastActiveEndDate === null) return 0;
    if (a.lastActiveEndDate === null) return -1;
    if (b.lastActiveEndDate === null) return 1;
    return a.lastActiveEndDate.localeCompare(b.lastActiveEndDate);
  });
  const chosen = byNovelty[0];
  return {
    variation: chosen.variation,
    reason: chosen.lastActiveEndDate
      ? `No open weak point — rotating to ${chosen.variation.name} for novelty (last trained ${chosen.lastActiveEndDate}).`
      : `No open weak point — rotating to ${chosen.variation.name}, which hasn't been trained in this pattern yet.`,
  };
}

/** True once `resensitiseMinOtherLifecycles` other lifecycles have closed in the pattern since this variation last ran. */
export function isResensitised(
  variationName: string,
  lifecycles: LifecycleRecord[],
  movementPattern: string,
  config: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG,
): boolean {
  const closedInPattern = lifecycles
    .filter(l => l.movement_pattern === movementPattern && l.status === 'closed')
    .sort((a, b) => (a.end_date ?? a.start_date).localeCompare(b.end_date ?? b.start_date));

  const lastIdxFromEnd = [...closedInPattern].reverse().findIndex(l => l.variation_name === variationName);
  if (lastIdxFromEnd === -1) return true; // never used — always eligible
  // Lifecycles closed *after* this variation's last run, in any other variation.
  const otherLifecyclesSince = lastIdxFromEnd;
  return otherLifecyclesSince >= config.resensitiseMinOtherLifecycles;
}

// ── Leading & back-off set programming ───────────────────────────────────────

export interface SetTarget {
  load: number;
  reps: number;
}

export interface SessionTargets {
  leading: SetTarget;
  backoff: SetTarget;
}

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * Today's leading-set target (the progression check) and back-off target
 * (the hypertrophy/stimulation volume), derived from the most recent logged
 * session. With no session yet, the lifecycle's starting load and the top
 * of its rep range are the first targets.
 */
export function computeSessionTargets(
  lastSession: SessionLogEntry | null,
  repRangeLow: number,
  repRangeHigh: number,
  startingLoad: number,
  backoffPercent: number = DEFAULT_ADAPTIVE_CONFIG.backoffPercent,
): SessionTargets {
  if (!lastSession) {
    const leading: SetTarget = { load: startingLoad, reps: repRangeHigh };
    return { leading, backoff: { load: roundToHalf(leading.load * backoffPercent), reps: repRangeHigh } };
  }

  // Reps still above the floor → nudge load up and let reps drift down one.
  // Reps already at the floor → hold load; the end-trigger check (not this
  // function) is what decides whether that means the lifecycle is done.
  const aboveFloor = lastSession.leading_reps > repRangeLow;
  const nextLoad = aboveFloor ? roundToHalf(lastSession.leading_load * 1.025) : lastSession.leading_load;
  const nextReps = aboveFloor ? Math.max(repRangeLow, lastSession.leading_reps - 1) : repRangeLow;

  const leading: SetTarget = { load: nextLoad, reps: nextReps };
  const backoff: SetTarget = {
    load: roundToHalf(leading.load * backoffPercent),
    reps: Math.min(repRangeHigh + 3, leading.reps + 4),
  };
  return { leading, backoff };
}

export function defaultBackoffLoad(leadingLoad: number, backoffPercent: number = DEFAULT_ADAPTIVE_CONFIG.backoffPercent): number {
  return roundToHalf(leadingLoad * backoffPercent);
}
