/**
 * Canonical Exercise → Exercise Family → Variant.
 *
 * `exerciseMatching` already unifies spellings of the *same* movement into
 * one canonical name (identity). This module sits one level above that: it
 * groups canonical movements that share a training pattern into a family, so
 * related variations can share progression context without ever merging
 * their records.
 *
 * The contract everything downstream relies on:
 *  - Exact PR   → keyed by canonical name. Never overwritten by a sibling.
 *  - Family PR  → best performance anywhere in the family, used purely as
 *                 context ("you pulled 140 kg conventional") when the exact
 *                 variation has little or no history.
 */
import { resolveCanonicalName } from './exerciseMatching';

export interface ExerciseFamily {
  id: string;
  label: string;
  /** Canonical member names. Matched through resolveCanonicalName. */
  members: string[];
}

export const EXERCISE_FAMILIES: ExerciseFamily[] = [
  {
    id: 'deadlift',
    label: 'Deadlift',
    members: [
      'Conventional Deadlift', 'Sumo Deadlift', 'Romanian Deadlift', 'Stiff Leg Deadlift',
      'Trap Bar Deadlift', 'Rack Pull', 'Deficit Deadlift', 'Deadlift Technique Work',
      'Single Leg Romanian Deadlift', 'Good Mornings',
    ],
  },
  {
    id: 'squat',
    label: 'Squat',
    members: [
      'Barbell Squat', 'Front Squat', 'Goblet Squats', 'Hack Squat', 'Bodyweight Squats',
      'Box Squat', 'Pause Squat', 'Smith Machine Squat', 'Leg Press',
    ],
  },
  {
    id: 'lunge',
    label: 'Split stance',
    members: ['Bulgarian Split Squat', 'Walking Lunges', 'Reverse Lunge', 'Step Ups', 'Split Squat'],
  },
  {
    id: 'horizontal-press',
    label: 'Flat press',
    members: [
      'Barbell Bench Press', 'Dumbbell Bench Press', 'Close Grip Bench Press',
      'Machine Chest Press', 'Push-ups', 'Dips', 'Smith Machine Bench Press',
    ],
  },
  {
    id: 'incline-press',
    label: 'Incline press',
    members: [
      'Incline Barbell Bench Press', 'Incline Dumbbell Press', 'Incline Chest Press',
      'Incline Push-ups', 'Incline Machine Press',
    ],
  },
  {
    id: 'chest-fly',
    label: 'Chest fly',
    members: ['Cable Flyes', 'Incline Dumbbell Flyes', 'Dumbbell Flyes', 'Pec Deck'],
  },
  {
    id: 'vertical-press',
    label: 'Overhead press',
    members: [
      'Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press',
      'Smith Machine Overhead Press', 'Machine Shoulder Press', 'Push Press',
    ],
  },
  {
    id: 'vertical-pull',
    label: 'Vertical pull',
    members: [
      'Pull-ups', 'Chin-ups', 'Lat Pulldown', 'Single-Arm Lat Pulldown',
      'Assisted Pull-ups', 'Neutral Grip Pulldown',
    ],
  },
  {
    id: 'horizontal-pull',
    label: 'Row',
    members: [
      'Barbell Row', 'Seated Cable Row', 'Single Arm Dumbbell Row',
      'Lever Seated Row Machine', 'T-Bar Row', 'Chest Supported Row', 'Machine Row',
    ],
  },
  {
    id: 'biceps',
    label: 'Curl',
    members: [
      'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Cable Curl', 'Incline Dumbbell Curl',
      'EZ Bar Preacher Curls', 'Cable Preacher Curl', 'Machine Preacher Curl', 'Spider Curls',
      'Concentration Curls', 'Reverse Curls', 'Close Grip Barbell Curl',
    ],
  },
  {
    id: 'triceps',
    label: 'Triceps extension',
    members: [
      'Skull Crushers', 'Overhead Tricep Extension', 'Tricep Pushdown',
      'Single Arm Dumbbell Extensions', 'Bench Tricep Dips', 'Tricep Kickback',
    ],
  },
  {
    id: 'lateral-raise',
    label: 'Lateral raise',
    members: ['Lateral Raises', 'Cable Lateral Raise', 'Machine Lateral Raise'],
  },
  {
    id: 'rear-delt',
    label: 'Rear delt',
    members: ['Reverse Fly', 'Bent Over Rear Delt Flyes', 'Reverse Pec Deck', 'Face Pulls'],
  },
  {
    id: 'quad-isolation',
    label: 'Leg extension',
    members: ['Leg Extension'],
  },
  {
    id: 'hamstring-isolation',
    label: 'Leg curl',
    members: ['Leg Curl', 'Nordic Curl'],
  },
  {
    id: 'calf',
    label: 'Calf raise',
    members: ['Standing Calf Raise', 'Seated Calf Raise', 'Leg Press Calf Raise'],
  },
  {
    id: 'glute-bridge',
    label: 'Hip extension',
    members: ['Hip Thrust', 'Glute Bridge', 'Back Extension 90 Degree', 'Hyperextension'],
  },
  {
    id: 'shrug',
    label: 'Shrug',
    members: ['Barbell Shrugs', 'Dumbbell Shrugs'],
  },
  {
    id: 'lat-isolation',
    label: 'Straight arm pull',
    members: ['Straight Arm Pulldown', 'Pullover'],
  },
];

const familyByCanonical = new Map<string, ExerciseFamily>();
for (const family of EXERCISE_FAMILIES) {
  for (const member of family.members) {
    familyByCanonical.set(resolveCanonicalName(member), family);
  }
}

/** The family an exercise belongs to, or undefined when it stands alone. */
export function getExerciseFamily(exerciseName: string): ExerciseFamily | undefined {
  return familyByCanonical.get(resolveCanonicalName(exerciseName));
}

/** Stable family key for grouping. Falls back to the canonical name itself. */
export function getFamilyKey(exerciseName: string): string {
  return getExerciseFamily(exerciseName)?.id ?? resolveCanonicalName(exerciseName);
}

/** True when two names train the same pattern (but are not necessarily equal). */
export function isSameFamily(a: string, b: string): boolean {
  return getFamilyKey(a) === getFamilyKey(b);
}
