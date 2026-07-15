/**
 * Muscle-intelligence engine — the data-driven growth layer.
 *
 * Pure functions over logged sets that answer:
 *  - Which muscles are undertrained / optimal / overreaching / never trained?
 *  - Where am I plateaued, and which variation should I switch to for fresh stimulus?
 *  - Did I just hit a PR? Where is there room to add volume for more growth?
 *
 * Weekly set landmarks are simplified from published hypertrophy volume
 * guidance (MEV / MAV / MRV per muscle per week). They are heuristics, not
 * medical advice, and every insight states the number it came from.
 */

import { getBodyPart } from './exerciseClassification';
import { exerciseVariants } from './exerciseVariants';

export interface InsightSet {
  exercise_name: string;
  actual_weight: number | null;
  actual_reps: number | null;
  workout_date?: string;
}

export type VolumeStatus = 'untrained' | 'under' | 'optimal' | 'high' | 'overreaching';

export interface MuscleBalance {
  bodyPart: string;
  weeklySets: number;
  status: VolumeStatus;
  /** Suggested movement to add when a muscle is untrained/undertrained. */
  suggestion?: string;
}

export type InterventionLevel = 'mini-deload' | 'stimulus-change' | 'deload-week';

export interface PlateauInsight {
  exercise: string;
  /** Best estimated 1RM seen for this lift, in kg. */
  bestE1rm: number;
  /** Sessions since that best was set. */
  sessionsStalled: number;
  /** Variation to switch to for new stimulus, if one is known. */
  switchTo?: string;
  /** Escalation step to try next (§4). */
  intervention: InterventionLevel;
  /** One-line description of that step. */
  interventionAction: string;
}

/**
 * Escalation ladder for a stalled lift (§4):
 *  - 3-4 stalled sessions → mini-deload (drop 1-2 reps for one session, then resume)
 *  - 5+ stalled sessions  → stimulus change (variation swap or rep-range change)
 *  - 2+ lifts stalled at once → deload week (systemic fatigue, not one lift)
 */
export function recommendIntervention(
  sessionsStalled: number,
  simultaneousStalls: number,
  switchTo?: string,
): { level: InterventionLevel; action: string } {
  if (simultaneousStalls >= 2) {
    return { level: 'deload-week', action: 'Multiple lifts stalled — take a deload week (volume −40-50% for 5-7 days).' };
  }
  if (sessionsStalled >= 5) {
    return switchTo
      ? { level: 'stimulus-change', action: `Mini-deload didn't take — switch to ${switchTo} or change the rep range for 3 weeks.` }
      : { level: 'stimulus-change', action: 'Mini-deload didn\'t take — change the rep range for 3 weeks or swap the variation.' };
  }
  return { level: 'mini-deload', action: 'Drop 1-2 reps per set for one session, then resume the progression.' };
}

export interface PRInsight {
  exercise: string;
  /** New best estimated 1RM, in kg. */
  e1rm: number;
  weight: number;
  reps: number;
}

export interface MuscleIntelligence {
  balance: MuscleBalance[];
  untrained: string[];
  plateaus: PlateauInsight[];
  prs: PRInsight[];
  /** Muscles with room to add a set or two for more growth. */
  growthRoom: string[];
  weeks: number;
}

// Weekly hard-set landmarks per muscle (sets/week). Conservative, evidence-based.
const LANDMARKS: Record<string, { mev: number; mav: number; mrv: number }> = {
  Chest: { mev: 8, mav: 16, mrv: 22 },
  Back: { mev: 10, mav: 18, mrv: 25 },
  Shoulders: { mev: 8, mav: 18, mrv: 26 },
  Biceps: { mev: 6, mav: 16, mrv: 24 },
  Triceps: { mev: 6, mav: 14, mrv: 20 },
  Quads: { mev: 8, mav: 16, mrv: 20 },
  Hamstrings: { mev: 6, mav: 14, mrv: 20 },
  Glutes: { mev: 4, mav: 12, mrv: 16 },
  Calves: { mev: 8, mav: 16, mrv: 20 },
  Core: { mev: 6, mav: 16, mrv: 25 },
  Forearms: { mev: 4, mav: 12, mrv: 20 },
};

// Movement ideas to surface for a muscle that's missing or low.
const MOVEMENT_IDEAS: Record<string, string> = {
  Chest: 'Incline Dumbbell Press',
  Back: 'Lat Pulldown',
  Shoulders: 'Lateral Raises',
  Biceps: 'Incline Dumbbell Curl',
  Triceps: 'Tricep Pushdown',
  Quads: 'Leg Press',
  Hamstrings: 'Romanian Deadlift',
  Glutes: 'Hip Thrust',
  Calves: 'Standing Calf Raise',
  Core: 'Hanging Leg Raise',
  Forearms: 'Farmer Carry',
};

const TRACKED_MUSCLES = Object.keys(LANDMARKS);

/** Epley estimated 1RM. Caps reps influence so a 20-rep set isn't overweighted. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  const r = Math.min(reps, 12);
  return weight * (1 + r / 30);
}

function classifyStatus(weeklySets: number, l: { mev: number; mav: number; mrv: number }): VolumeStatus {
  if (weeklySets <= 0) return 'untrained';
  if (weeklySets < l.mev) return 'under';
  if (weeklySets <= l.mav) return 'optimal';
  if (weeklySets <= l.mrv) return 'high';
  return 'overreaching';
}

export function analyzeMuscles(sets: InsightSet[], rangeDays: number): MuscleIntelligence {
  const weeks = Math.max(rangeDays / 7, 0.5);

  // --- Weekly set volume per muscle ---
  const setCount: Record<string, number> = {};
  for (const muscle of TRACKED_MUSCLES) setCount[muscle] = 0;
  for (const s of sets) {
    const bp = getBodyPart(s.exercise_name);
    if (bp in setCount) setCount[bp] += 1;
  }

  const balance: MuscleBalance[] = TRACKED_MUSCLES.map((bodyPart) => {
    const weeklySets = Math.round((setCount[bodyPart] / weeks) * 10) / 10;
    const status = classifyStatus(weeklySets, LANDMARKS[bodyPart]);
    return {
      bodyPart,
      weeklySets,
      status,
      suggestion: status === 'untrained' || status === 'under' ? MOVEMENT_IDEAS[bodyPart] : undefined,
    };
  });

  const untrained = balance.filter(b => b.status === 'untrained').map(b => b.bodyPart);
  const growthRoom = balance
    .filter(b => b.status === 'under' || (b.status === 'optimal' && b.weeklySets < LANDMARKS[b.bodyPart].mav - 2))
    .map(b => b.bodyPart);

  // --- Per-exercise session history for PRs + plateaus ---
  const byExercise = new Map<string, Map<string, number>>(); // exercise -> date -> best e1rm that day
  for (const s of sets) {
    if (s.actual_weight == null || s.actual_reps == null || !s.workout_date) continue;
    const e1rm = estimateOneRepMax(s.actual_weight, s.actual_reps);
    if (e1rm <= 0) continue;
    const dayMap = byExercise.get(s.exercise_name) ?? new Map<string, number>();
    dayMap.set(s.workout_date, Math.max(dayMap.get(s.workout_date) ?? 0, e1rm));
    byExercise.set(s.exercise_name, dayMap);
  }

  const plateaus: PlateauInsight[] = [];
  const prs: PRInsight[] = [];

  for (const [exercise, dayMap] of byExercise) {
    const sessions = [...dayMap.entries()]
      .map(([date, e1rm]) => ({ date, e1rm }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (sessions.length < 2) continue;

    // Running best + how many sessions since it was last beaten.
    let best = 0;
    let bestIdx = 0;
    sessions.forEach((sess, i) => {
      if (sess.e1rm > best + 0.01) {
        best = sess.e1rm;
        bestIdx = i;
      }
    });
    const sessionsStalled = sessions.length - 1 - bestIdx;

    // PR: the most recent session set a new best.
    if (bestIdx === sessions.length - 1 && sessions.length >= 2) {
      const prSets = sets
        .filter(s => s.exercise_name === exercise && s.workout_date === sessions[bestIdx].date && s.actual_weight && s.actual_reps)
        .map(s => ({ w: s.actual_weight as number, r: s.actual_reps as number, e: estimateOneRepMax(s.actual_weight as number, s.actual_reps as number) }))
        .sort((a, b) => b.e - a.e)[0];
      if (prSets) {
        prs.push({ exercise, e1rm: Math.round(best * 10) / 10, weight: prSets.w, reps: prSets.r });
      }
    }

    // Plateau: 3+ sessions stuck below the best → suggest a variation switch.
    if (sessionsStalled >= 3) {
      plateaus.push({
        exercise,
        bestE1rm: Math.round(best * 10) / 10,
        sessionsStalled,
        switchTo: pickVariation(exercise),
        intervention: 'mini-deload',
        interventionAction: '',
      });
    }
  }

  // Attach the escalation step now that we know how many lifts are stalled at once.
  for (const p of plateaus) {
    const rec = recommendIntervention(p.sessionsStalled, plateaus.length, p.switchTo);
    p.intervention = rec.level;
    p.interventionAction = rec.action;
  }

  plateaus.sort((a, b) => b.sessionsStalled - a.sessionsStalled);
  prs.sort((a, b) => b.e1rm - a.e1rm);

  return { balance, untrained, plateaus, prs, growthRoom, weeks };
}

/** Pick a different-equipment variation of the same lift, if we know one. */
export function pickVariation(exercise: string): string | undefined {
  const variants = exerciseVariants[exercise];
  if (!variants || variants.length === 0) return undefined;
  const alt = variants.find(v => v.name.toLowerCase() !== exercise.toLowerCase());
  return alt?.name;
}
