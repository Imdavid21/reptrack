/**
 * Muscle-intelligence engine — the data-driven growth layer.
 *
 * Pure functions over logged sets (plus logged cardio/activity, which loads
 * muscles too — see ACTIVITY_MUSCLE_LOAD) that answer:
 *  - Which muscles are undertrained / optimal / overreaching / never trained?
 *  - Where am I plateaued, and which variation should I switch to for fresh stimulus?
 *  - Did I just hit a PR? Where is there room to add volume for more growth?
 *
 * Weekly set landmarks are simplified from published hypertrophy volume
 * guidance (MEV / MAV / MRV per muscle per week). They are heuristics, not
 * medical advice, and every insight states the number it came from.
 */

import { getMuscleSubRegions } from './exerciseClassification';
import { exerciseVariants } from './exerciseVariants';

export interface InsightSet {
  exercise_name: string;
  actual_weight: number | null;
  actual_reps: number | null;
  workout_date?: string;
}

export interface InsightActivity {
  /** Matches ActivityLogger's ActivityKind ('walking' | 'running' | 'cycling' | 'boxing'), kept as string here to avoid a UI-layer import. */
  activity_type: string;
  duration_minutes: number;
}

export type VolumeStatus = 'untrained' | 'under' | 'optimal' | 'high' | 'overreaching';

export interface MuscleBalance {
  bodyPart: string;
  weeklySets: number;
  status: VolumeStatus;
  /** Suggested movement to add when a muscle is untrained/undertrained. */
  suggestion?: string;
  /** Weekly-equivalent-sets portion of weeklySets contributed by logged
   *  activity (walk/run/cycle/box) rather than direct lifting. Undefined/0
   *  when the muscle's volume is entirely from tracked sets. */
  fromActivity?: number;
}

export interface PlateauInsight {
  exercise: string;
  /** Best estimated 1RM seen for this lift, in kg. */
  bestE1rm: number;
  /** Sessions since that best was set. */
  sessionsStalled: number;
  /** Variation to switch to for new stimulus, if one is known. */
  switchTo?: string;
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
// Exported so any UI needing the same per-muscle scale (e.g. a volume bar's
// full-scale value) reads it from here instead of hand-copying the numbers —
// MuscleBalanceCard.tsx used to keep its own duplicate that would silently
// drift out of sync with these if one were ever tuned without the other.
export const LANDMARKS: Record<string, { mev: number; mav: number; mrv: number }> = {
  // Chest, Back and Shoulders split into sub-regions (see getMuscleSubRegions)
  // so volume that used to average out across a whole group now shows which
  // part of it is actually under/overtrained. Sub-region landmarks are
  // apportioned from the prior whole-group numbers, not independently sourced.
  'Upper Chest': { mev: 4, mav: 8, mrv: 12 },
  'Mid Chest': { mev: 4, mav: 9, mrv: 13 },
  'Lower Chest': { mev: 3, mav: 6, mrv: 9 },
  Lats: { mev: 6, mav: 11, mrv: 15 },
  Traps: { mev: 3, mav: 7, mrv: 10 },
  'Lower Back': { mev: 3, mav: 6, mrv: 9 },
  'Front Delts': { mev: 3, mav: 7, mrv: 10 },
  'Side Delts': { mev: 4, mav: 9, mrv: 13 },
  'Rear Delts': { mev: 3, mav: 8, mrv: 11 },
  Biceps: { mev: 6, mav: 16, mrv: 24 },
  Triceps: { mev: 6, mav: 14, mrv: 20 },
  Quads: { mev: 8, mav: 16, mrv: 20 },
  Hamstrings: { mev: 6, mav: 14, mrv: 20 },
  Glutes: { mev: 4, mav: 12, mrv: 16 },
  Calves: { mev: 8, mav: 16, mrv: 20 },
  Core: { mev: 6, mav: 16, mrv: 25 },
  Forearms: { mev: 4, mav: 12, mrv: 20 },
};

// Equivalent "hard sets" of hypertrophy stimulus per 30 continuous minutes of
// an activity. Cardio's per-minute stimulus is far below a taxing resistance
// set, so these are deliberately small relative to LANDMARKS — enough that
// e.g. a regular runner's Calves/Quads don't read as "not trained at all",
// not enough to make cardio alone read as sufficient volume. Heuristic, like
// LANDMARKS above; only muscles with a real, primary role in the movement are
// listed, so e.g. boxing's footwork isn't credited with real leg volume.
const ACTIVITY_MUSCLE_LOAD: Record<string, Partial<Record<string, number>>> = {
  walking: { Quads: 0.5, Hamstrings: 0.5, Glutes: 0.5, Calves: 1 },
  running: { Quads: 1, Hamstrings: 1, Glutes: 1, Calves: 1.5, Core: 0.5 },
  cycling: { Quads: 1.5, Hamstrings: 0.5, Glutes: 1, Calves: 0.5 },
  boxing: { 'Front Delts': 0.5, 'Side Delts': 0.5, 'Rear Delts': 0.5, Core: 1.5, Triceps: 1, Biceps: 0.5, Lats: 0.3, Traps: 0.2 },
};

// Movement ideas to surface for a muscle that's missing or low.
const MOVEMENT_IDEAS: Record<string, string> = {
  'Upper Chest': 'Incline Dumbbell Press',
  'Mid Chest': 'Flat Barbell Bench Press',
  'Lower Chest': 'Dips',
  Lats: 'Lat Pulldown',
  Traps: 'Barbell Shrugs',
  'Lower Back': 'Back Extension',
  'Front Delts': 'Dumbbell Shoulder Press',
  'Side Delts': 'Lateral Raises',
  'Rear Delts': 'Face Pulls',
  Biceps: 'Incline Dumbbell Curl',
  Triceps: 'Tricep Pushdown',
  Quads: 'Leg Press',
  Hamstrings: 'Romanian Deadlift',
  Glutes: 'Hip Thrust',
  Calves: 'Standing Calf Raise',
  Core: 'Hanging Leg Raise',
  Forearms: 'Farmer Walks',
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

export function analyzeMuscles(sets: InsightSet[], rangeDays: number, activities: InsightActivity[] = []): MuscleIntelligence {
  const weeks = Math.max(rangeDays / 7, 0.5);

  // --- Weekly set volume per muscle, from direct lifting ---
  const liftSetCount: Record<string, number> = {};
  for (const muscle of TRACKED_MUSCLES) liftSetCount[muscle] = 0;
  for (const s of sets) {
    for (const { region, fraction } of getMuscleSubRegions(s.exercise_name)) {
      if (region in liftSetCount) liftSetCount[region] += fraction;
    }
  }

  // --- Equivalent-set contribution from logged activity (see ACTIVITY_MUSCLE_LOAD) ---
  const activitySetCount: Record<string, number> = {};
  for (const muscle of TRACKED_MUSCLES) activitySetCount[muscle] = 0;
  for (const a of activities) {
    const load = ACTIVITY_MUSCLE_LOAD[a.activity_type];
    if (!load || a.duration_minutes <= 0) continue;
    const factor = a.duration_minutes / 30;
    for (const [muscle, perThirtyMin] of Object.entries(load)) {
      if (muscle in activitySetCount) activitySetCount[muscle] += (perThirtyMin ?? 0) * factor;
    }
  }

  const balance: MuscleBalance[] = TRACKED_MUSCLES.map((bodyPart) => {
    const weeklySets = Math.round(((liftSetCount[bodyPart] + activitySetCount[bodyPart]) / weeks) * 10) / 10;
    const weeklyFromActivity = Math.round((activitySetCount[bodyPart] / weeks) * 10) / 10;
    const status = classifyStatus(weeklySets, LANDMARKS[bodyPart]);
    return {
      bodyPart,
      weeklySets,
      status,
      suggestion: status === 'untrained' || status === 'under' ? MOVEMENT_IDEAS[bodyPart] : undefined,
      fromActivity: weeklyFromActivity > 0 ? weeklyFromActivity : undefined,
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
      });
    }
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
