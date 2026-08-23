/**
 * Canonical Exercise → Exercise Family.
 *
 * `exerciseMatching` unifies spellings of the same physical lift into one
 * canonical identity. Families sit one level above identity: they group
 * related movements for progression context without implying that raw PR
 * numbers are interchangeable across different implements or machines.
 *
 * PR comparability is intentionally handled separately in
 * exerciseRelationships.ts. A 160 kg leg press does not become a 160 kg squat
 * PR merely because both live in the squat family.
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
    label: 'Hinge',
    members: [
      'Conventional Deadlift', 'Sumo Deadlift', 'Romanian Deadlift', 'Smith Romanian Deadlift',
      'Dumbbell Romanian Deadlift', 'Stiff Leg Deadlift', 'Trap Bar Deadlift', 'Rack Pull',
      'Deficit Deadlift', 'Deadlift Technique Work', 'Single Leg Romanian Deadlift', 'Good Mornings',
    ],
  },
  {
    id: 'squat',
    label: 'Squat / leg press',
    members: [
      'Barbell Squat', 'Front Squat', 'Goblet Squats', 'Hack Squat', 'Bodyweight Squats',
      'Box Squat', 'Pause Squat', 'Smith Machine Squat', 'Leg Press', 'Single Leg Press',
      'Cyclist Squat', 'Heel Elevated Goblet Squat',
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
      'Smith Machine Incline Press', 'Incline Push-ups', 'Incline Machine Press',
    ],
  },
  {
    id: 'chest-fly',
    label: 'Chest fly',
    members: [
      'Cable Flyes', 'Cable Crossover', 'Low-to-High Cable Fly', 'High-to-Low Cable Fly',
      'Incline Dumbbell Flyes', 'Dumbbell Flyes', 'Pec Deck',
    ],
  },
  {
    id: 'vertical-press',
    label: 'Overhead press',
    members: [
      'Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press',
      'Smith Machine Overhead Press', 'Machine Shoulder Press', 'Push Press', 'Landmine Press',
    ],
  },
  {
    id: 'vertical-pull',
    label: 'Vertical pull',
    members: [
      'Pull-ups', 'Weighted Pull-ups', 'Chin-ups', 'Lat Pulldown', 'Single-Arm Lat Pulldown',
      'Single-Arm Kneeling Lat Pulldown', 'Assisted Pull-ups', 'Neutral Grip Pulldown',
      'Close Grip Lat Pulldown', 'Wide Grip Lat Pulldown', 'Reverse Grip Lat Pulldown',
      'Iso-Lateral Plate-Loaded Pulldown',
    ],
  },
  {
    id: 'horizontal-pull',
    label: 'Row',
    members: [
      'Barbell Row', 'Pendlay Row', 'Seated Cable Row', 'Single Arm Dumbbell Row',
      'Lever Seated Row Machine', 'Low Row Machine', 'Plate Loaded Row', 'T-Bar Row',
      'Chest Supported Row', 'Chest-Supported Machine Row', 'Machine Row',
    ],
  },
  {
    id: 'biceps',
    label: 'Supinated curl',
    members: [
      'Barbell Curl', 'EZ Bar Curl', 'Dumbbell Curl', 'Cable Curl', 'Incline Dumbbell Curl',
      'EZ Bar Preacher Curls', 'Cable Preacher Curl', 'Machine Preacher Curl', 'Spider Curls',
      'Concentration Curls', 'Close Grip Barbell Curl',
    ],
  },
  {
    id: 'forearm-curl',
    label: 'Brachioradialis / forearm curl',
    members: [
      'Hammer Curl', 'Cross-Body Hammer Curl', 'Reverse Curls', 'Barbell Reverse Curls',
      'EZ Bar Reverse Curls', 'Dumbbell Reverse Curls', 'Cable Reverse Curls', 'Zottman Curls',
    ],
  },
  {
    id: 'wrist-flexion',
    label: 'Wrist flexion',
    members: ['Wrist Curls', 'Dumbbell Wrist Curls', 'Behind-the-Back Wrist Curls', 'Cable Wrist Curl'],
  },
  {
    id: 'wrist-extension',
    label: 'Wrist extension',
    members: ['Reverse Wrist Curls', 'Cable Wrist Extension'],
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
    members: ['Lateral Raises', 'Cable Lateral Raise', 'Lean-Away Cable Lateral Raise', 'Machine Lateral Raise'],
  },
  {
    id: 'rear-delt',
    label: 'Rear delt',
    members: ['Reverse Fly', 'Bent Over Rear Delt Flyes', 'Cable Rear-Delt Fly', 'Reverse Pec Deck', 'Face Pulls'],
  },
  {
    id: 'quad-isolation',
    label: 'Leg extension',
    members: ['Leg Extension'],
  },
  {
    id: 'hamstring-isolation',
    label: 'Leg curl',
    members: ['Leg Curl', 'Seated Leg Curl', 'Lying Leg Curl', 'Nordic Curl'],
  },
  {
    id: 'calf',
    label: 'Calf raise',
    members: ['Standing Calf Raise', 'Seated Calf Raise', 'Leg Press Calf Raise'],
  },
  {
    id: 'glute-bridge',
    label: 'Hip extension',
    members: [
      'Hip Thrust', 'Smith Machine Hip Thrust', 'Glute Bridge', 'Cable Pull Through',
      'Back Extension 90 Degree', 'Hyperextension',
    ],
  },
  {
    id: 'shrug',
    label: 'Shrug',
    members: ['Barbell Shrugs', 'Dumbbell Shrugs', 'Smith Machine Shrugs', 'Cable Shrugs'],
  },
  {
    id: 'lat-isolation',
    label: 'Straight arm pull',
    members: ['Straight Arm Pulldown', 'Cable Pullover', 'Dumbbell Pullover', 'Pullover'],
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
