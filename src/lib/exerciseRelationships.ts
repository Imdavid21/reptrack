import { getCanonicalName, resolveCanonicalName } from './exerciseMatching';
import { getExerciseFamily } from './exerciseFamilies';

export type ExerciseRelationshipKind = 'variation' | 'alternative';
export type PrTransferability = 'shared' | 'comparable' | 'context' | 'none';

export interface ExerciseRelationshipOption {
  name: string;
  kind: ExerciseRelationshipKind;
  prTransfer: Exclude<PrTransferability, 'shared'>;
  note?: string;
}

/**
 * Curated swaps for the current bodybuilding roster.
 *
 * variation  = same training role/pattern, but the exact lift keeps its own PR
 * alternative = acceptable replacement when equipment/recovery requires it
 *
 * Raw machine/free-weight numbers are deliberately not declared comparable
 * just because two exercises train the same muscle. `comparable` is reserved
 * for cases where the loading system and movement are close enough that a PR
 * can be useful as an actual starting reference.
 */
export const EXERCISE_RELATIONSHIPS: Record<string, ExerciseRelationshipOption[]> = {
  'Incline Barbell Bench Press': [
    { name: 'Incline Dumbbell Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Smith Machine Incline Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Incline Machine Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Machine Chest Press', kind: 'alternative', prTransfer: 'none' },
  ],
  'Barbell Bench Press': [
    { name: 'Dumbbell Bench Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Smith Machine Bench Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Machine Chest Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Dips', kind: 'alternative', prTransfer: 'none' },
  ],
  'Low-to-High Cable Fly': [
    { name: 'Cable Flyes', kind: 'variation', prTransfer: 'context' },
    { name: 'Cable Crossover', kind: 'variation', prTransfer: 'context' },
    { name: 'Pec Deck', kind: 'variation', prTransfer: 'context' },
    { name: 'Incline Dumbbell Flyes', kind: 'alternative', prTransfer: 'context' },
  ],
  'Dumbbell Shoulder Press': [
    { name: 'Smith Machine Overhead Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Overhead Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Machine Shoulder Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Landmine Press', kind: 'alternative', prTransfer: 'none' },
  ],
  'Cable Lateral Raise': [
    { name: 'Lean-Away Cable Lateral Raise', kind: 'variation', prTransfer: 'context' },
    { name: 'Lateral Raises', kind: 'variation', prTransfer: 'context' },
    { name: 'Machine Lateral Raise', kind: 'variation', prTransfer: 'context' },
  ],
  'Overhead Tricep Extension': [
    { name: 'Dumbbell Overhead Extension', kind: 'variation', prTransfer: 'context' },
    { name: 'Skull Crushers', kind: 'alternative', prTransfer: 'context' },
    { name: 'Tricep Pushdown', kind: 'alternative', prTransfer: 'context' },
  ],
  'Cable Crunch': [
    { name: 'Hanging Knee Raises', kind: 'alternative', prTransfer: 'none' },
    { name: 'Reverse Crunch', kind: 'alternative', prTransfer: 'none' },
  ],
  'Barbell Row': [
    { name: 'T-Bar Row', kind: 'variation', prTransfer: 'context' },
    { name: 'Lever Seated Row Machine', kind: 'variation', prTransfer: 'context' },
    { name: 'Low Row Machine', kind: 'variation', prTransfer: 'context' },
    { name: 'Chest Supported Row', kind: 'variation', prTransfer: 'context' },
    { name: 'Seated Cable Row', kind: 'variation', prTransfer: 'context' },
  ],
  'Pull-ups': [
    { name: 'Weighted Pull-ups', kind: 'variation', prTransfer: 'none', note: 'Added-load PR uses a different metric.' },
    { name: 'Assisted Pull-ups', kind: 'variation', prTransfer: 'none', note: 'Assistance load is inverse: more weight is easier.' },
    { name: 'Lat Pulldown', kind: 'alternative', prTransfer: 'none' },
  ],
  'Single-Arm Lat Pulldown': [
    { name: 'Single-Arm Kneeling Lat Pulldown', kind: 'variation', prTransfer: 'comparable' },
    { name: 'Lat Pulldown', kind: 'alternative', prTransfer: 'none' },
    { name: 'Neutral Grip Pulldown', kind: 'alternative', prTransfer: 'none' },
  ],
  'Lat Pulldown': [
    { name: 'Neutral Grip Pulldown', kind: 'variation', prTransfer: 'comparable' },
    { name: 'Close Grip Lat Pulldown', kind: 'variation', prTransfer: 'comparable' },
    { name: 'Wide Grip Lat Pulldown', kind: 'variation', prTransfer: 'comparable' },
    { name: 'Reverse Grip Lat Pulldown', kind: 'variation', prTransfer: 'comparable' },
    { name: 'Pull-ups', kind: 'alternative', prTransfer: 'none' },
  ],
  'Reverse Pec Deck': [
    { name: 'Cable Rear-Delt Fly', kind: 'variation', prTransfer: 'context' },
    { name: 'Reverse Fly', kind: 'variation', prTransfer: 'context' },
    { name: 'Face Pulls', kind: 'alternative', prTransfer: 'context' },
  ],
  'Barbell Curl': [
    { name: 'EZ Bar Curl', kind: 'variation', prTransfer: 'context' },
    { name: 'Dumbbell Curl', kind: 'variation', prTransfer: 'context' },
    { name: 'Cable Curl', kind: 'variation', prTransfer: 'context' },
  ],
  'Hammer Curl': [
    { name: 'Cross-Body Hammer Curl', kind: 'variation', prTransfer: 'context' },
    { name: 'Cable Reverse Curls', kind: 'alternative', prTransfer: 'context' },
  ],
  'Barbell Squat': [
    { name: 'Smith Machine Squat', kind: 'variation', prTransfer: 'context' },
    { name: 'Front Squat', kind: 'variation', prTransfer: 'context' },
    { name: 'Leg Press', kind: 'alternative', prTransfer: 'none' },
  ],
  'Romanian Deadlift': [
    { name: 'Smith Romanian Deadlift', kind: 'variation', prTransfer: 'context' },
    { name: 'Dumbbell Romanian Deadlift', kind: 'variation', prTransfer: 'context' },
    { name: 'Cable Pull Through', kind: 'alternative', prTransfer: 'none' },
    { name: 'Good Mornings', kind: 'alternative', prTransfer: 'context' },
  ],
  'Leg Press': [
    { name: 'Single Leg Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Smith Machine Squat', kind: 'alternative', prTransfer: 'none' },
    { name: 'Barbell Squat', kind: 'alternative', prTransfer: 'none' },
  ],
  'Bulgarian Split Squat': [
    { name: 'Split Squat', kind: 'variation', prTransfer: 'context' },
    { name: 'Reverse Lunge', kind: 'variation', prTransfer: 'context' },
    { name: 'Walking Lunges', kind: 'variation', prTransfer: 'context' },
    { name: 'Single Leg Press', kind: 'alternative', prTransfer: 'none' },
  ],
  'Seated Leg Curl': [
    { name: 'Lying Leg Curl', kind: 'variation', prTransfer: 'context' },
    { name: 'Nordic Curl', kind: 'alternative', prTransfer: 'none' },
    { name: 'Romanian Deadlift', kind: 'alternative', prTransfer: 'none' },
  ],
  'Leg Extension': [
    { name: 'Cyclist Squat', kind: 'alternative', prTransfer: 'none' },
    { name: 'Heel Elevated Goblet Squat', kind: 'alternative', prTransfer: 'none' },
  ],
  'Standing Calf Raise': [
    { name: 'Seated Calf Raise', kind: 'alternative', prTransfer: 'none' },
    { name: 'Leg Press Calf Raise', kind: 'alternative', prTransfer: 'none' },
  ],
  'Incline Dumbbell Press': [
    { name: 'Incline Barbell Bench Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Smith Machine Incline Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Machine Chest Press', kind: 'alternative', prTransfer: 'none' },
  ],
  'Machine Chest Press': [
    { name: 'Barbell Bench Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Dumbbell Bench Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Smith Machine Bench Press', kind: 'variation', prTransfer: 'context' },
  ],
  'Pec Deck': [
    { name: 'Cable Flyes', kind: 'variation', prTransfer: 'context' },
    { name: 'Cable Crossover', kind: 'variation', prTransfer: 'context' },
    { name: 'Low-to-High Cable Fly', kind: 'variation', prTransfer: 'context' },
  ],
  'Smith Machine Overhead Press': [
    { name: 'Dumbbell Shoulder Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Overhead Press', kind: 'variation', prTransfer: 'context' },
    { name: 'Machine Shoulder Press', kind: 'variation', prTransfer: 'context' },
  ],
  'Lateral Raises': [
    { name: 'Cable Lateral Raise', kind: 'variation', prTransfer: 'context' },
    { name: 'Machine Lateral Raise', kind: 'variation', prTransfer: 'context' },
  ],
  'Cable Rear-Delt Fly': [
    { name: 'Reverse Pec Deck', kind: 'variation', prTransfer: 'context' },
    { name: 'Reverse Fly', kind: 'variation', prTransfer: 'context' },
  ],
  'Skull Crushers': [
    { name: 'Overhead Tricep Extension', kind: 'alternative', prTransfer: 'context' },
    { name: 'Tricep Pushdown', kind: 'alternative', prTransfer: 'context' },
  ],
  'Neutral Grip Pulldown': [
    { name: 'Lat Pulldown', kind: 'variation', prTransfer: 'comparable' },
    { name: 'Close Grip Lat Pulldown', kind: 'variation', prTransfer: 'comparable' },
    { name: 'Wide Grip Lat Pulldown', kind: 'variation', prTransfer: 'comparable' },
  ],
  'Lever Seated Row Machine': [
    { name: 'Low Row Machine', kind: 'variation', prTransfer: 'context' },
    { name: 'T-Bar Row', kind: 'variation', prTransfer: 'context' },
    { name: 'Chest Supported Row', kind: 'variation', prTransfer: 'context' },
    { name: 'Barbell Row', kind: 'variation', prTransfer: 'context' },
  ],
  'Straight Arm Pulldown': [
    { name: 'Cable Pullover', kind: 'variation', prTransfer: 'comparable' },
    { name: 'Dumbbell Pullover', kind: 'alternative', prTransfer: 'none' },
  ],
  'EZ Bar Preacher Curls': [
    { name: 'Cable Preacher Curl', kind: 'variation', prTransfer: 'context' },
    { name: 'Machine Preacher Curl', kind: 'variation', prTransfer: 'context' },
    { name: 'Barbell Curl', kind: 'alternative', prTransfer: 'context' },
  ],
  'Cable Reverse Curls': [
    { name: 'EZ Bar Reverse Curls', kind: 'variation', prTransfer: 'context' },
    { name: 'Dumbbell Reverse Curls', kind: 'variation', prTransfer: 'context' },
    { name: 'Hammer Curl', kind: 'alternative', prTransfer: 'context' },
  ],
  'Cable Wrist Curl': [
    { name: 'Wrist Curls', kind: 'variation', prTransfer: 'context' },
    { name: 'Dumbbell Wrist Curls', kind: 'variation', prTransfer: 'context' },
  ],
  'Cable Wrist Extension': [
    { name: 'Reverse Wrist Curls', kind: 'variation', prTransfer: 'context' },
  ],
  'Hip Thrust': [
    { name: 'Smith Machine Hip Thrust', kind: 'variation', prTransfer: 'context' },
    { name: 'Glute Bridge', kind: 'variation', prTransfer: 'context' },
    { name: 'Cable Pull Through', kind: 'alternative', prTransfer: 'none' },
  ],
  'Cable Pull Through': [
    { name: 'Hip Thrust', kind: 'alternative', prTransfer: 'none' },
    { name: 'Romanian Deadlift', kind: 'alternative', prTransfer: 'none' },
  ],
  'Seated Calf Raise': [
    { name: 'Standing Calf Raise', kind: 'alternative', prTransfer: 'none' },
    { name: 'Leg Press Calf Raise', kind: 'alternative', prTransfer: 'none' },
  ],
  'Reverse Crunch': [
    { name: 'Hanging Knee Raises', kind: 'variation', prTransfer: 'context' },
    { name: 'Cable Crunch', kind: 'alternative', prTransfer: 'none' },
  ],
};

/**
 * PRs can only be compared numerically across members of one of these groups.
 * Everything else in a family remains context-only because machine ratios,
 * implement type, bodyweight/assistance semantics, or leverage differ.
 */
const COMPARABLE_PR_GROUPS: Record<string, string[]> = {
  'lat-pulldown-stack': [
    'Lat Pulldown', 'Neutral Grip Pulldown', 'Close Grip Lat Pulldown',
    'Wide Grip Lat Pulldown', 'Reverse Grip Lat Pulldown',
  ],
  'single-arm-lat-cable': ['Single-Arm Lat Pulldown', 'Single-Arm Kneeling Lat Pulldown'],
  'straight-arm-cable': ['Straight Arm Pulldown', 'Cable Pullover'],
};

const comparableGroupByCanonical = new Map<string, string>();
for (const [groupId, members] of Object.entries(COMPARABLE_PR_GROUPS)) {
  for (const member of members) comparableGroupByCanonical.set(resolveCanonicalName(member), groupId);
}

export function getExerciseRelationships(exerciseName: string): ExerciseRelationshipOption[] {
  const canonical = getCanonicalName(exerciseName);
  return EXERCISE_RELATIONSHIPS[canonical] ?? [];
}

export function getComparablePrGroup(exerciseName: string): string | undefined {
  return comparableGroupByCanonical.get(resolveCanonicalName(exerciseName));
}

export function getPrTransferability(a: string, b: string): PrTransferability {
  if (resolveCanonicalName(a) === resolveCanonicalName(b)) return 'shared';

  const aGroup = getComparablePrGroup(a);
  if (aGroup && aGroup === getComparablePrGroup(b)) return 'comparable';

  const explicit = getExerciseRelationships(a).find(option =>
    resolveCanonicalName(option.name) === resolveCanonicalName(b));
  if (explicit) return explicit.prTransfer;

  const familyA = getExerciseFamily(a);
  const familyB = getExerciseFamily(b);
  if (familyA && familyB && familyA.id === familyB.id) return 'context';
  return 'none';
}
