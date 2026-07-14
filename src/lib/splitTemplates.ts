import { WorkoutDay } from './workoutPresets';

export type TrainingSplit = 'ppl6' | 'upper_lower4' | 'full_body3' | 'ppl5' | 'custom';

export interface SplitTemplate {
  id: TrainingSplit;
  name: string;
  description: string;
  daysPerWeek: number;
  days: Record<string, WorkoutDay>;
}

export const SPLIT_TEMPLATES: Record<TrainingSplit, SplitTemplate> = {
  ppl6: {
    id: 'ppl6',
    name: 'Push/Pull/Legs (6-day)',
    description: 'Heaviest/most technical first, isolation next, mandatory correctives last. No two lifts share a primary target in a session.',
    daysPerWeek: 6,
    days: {
      'Day 1': {
        name: 'Push A',
        focus: 'Upper chest, front/side delts, triceps',
        bias: 'heavy',
        exercises: [
          { name: 'Incline Barbell Bench Press', category: 'primary', targetWeight: '55kg', targetReps: '4x8', progression: '+1 rep/set, then +2.5kg once all 4x8' },
          { name: 'Weighted Dips', category: 'primary', targetWeight: '+10kg', targetReps: '3x10', progression: 'Reps before weight' },
          { name: 'Cable Flyes', category: 'accessory', targetWeight: '12kg', targetReps: '3x15', progression: 'Add reps' },
          { name: 'Lateral Raises', category: 'accessory', targetWeight: '8kg', targetReps: '3x20', progression: 'Add reps' },
          { name: 'Overhead Cable Tricep Extension', category: 'accessory', targetWeight: '20kg', targetReps: '3x15', progression: 'Add reps' },
        ],
      },
      'Day 2': {
        name: 'Pull A',
        focus: 'Back thickness, lats, biceps, rear delts',
        bias: 'heavy',
        exercises: [
          { name: 'Conventional Deadlift', category: 'primary', targetWeight: '100kg', targetReps: '4x6', progression: 'Hold 4x6 @ 1 RIR, then +2.5-5kg' },
          { name: 'Barbell Row', category: 'primary', targetWeight: '60kg', targetReps: '4x10', progression: 'Reps before weight' },
          { name: 'Lat Pulldown', category: 'accessory', targetWeight: '55kg', targetReps: '3x15', progression: 'Add reps' },
          { name: 'Barbell Curl', category: 'accessory', targetWeight: '25kg', targetReps: '3x10', progression: 'Add reps' },
          { name: 'Face Pulls', category: 'accessory', targetWeight: '20kg', targetReps: '4x20', mandatory: true, progression: 'Rear delts + external rotators — do not skip' },
        ],
      },
      'Day 3': {
        name: 'Legs A',
        focus: 'Quads, core',
        bias: 'heavy',
        exercises: [
          { name: 'Barbell Squat', category: 'primary', targetWeight: '80kg', targetReps: '4x8', progression: 'Reintroduce light, reps before weight' },
          { name: 'Leg Press', category: 'primary', targetWeight: '150kg', targetReps: '4x12', progression: 'Reps before weight, no 1RM tests' },
          { name: 'Leg Extension', category: 'accessory', targetWeight: '45kg', targetReps: '3x20', progression: 'Add reps' },
          { name: 'Standing Calf Raise', category: 'accessory', targetWeight: '60kg', targetReps: '4x20', progression: 'Add reps' },
          { name: 'Hanging Knee Raises', category: 'accessory', targetWeight: 'BW', targetReps: '3x12', progression: 'Add reps' },
        ],
      },
      'Day 4': {
        name: 'Push B',
        focus: 'Mid chest, front/side delts, triceps',
        bias: 'volume',
        exercises: [
          { name: 'Overhead Press', category: 'primary', targetWeight: '40kg', targetReps: '4x8', progression: 'Reps before weight' },
          { name: 'Dumbbell Bench Press', category: 'primary', targetWeight: '24kg', targetReps: '3x10', progression: 'Reps before weight' },
          { name: 'Dumbbell Lateral Raises', category: 'accessory', targetWeight: '8kg', targetReps: '3x15', progression: 'Add reps' },
          { name: 'Close Grip Bench Press', category: 'accessory', targetWeight: '50kg', targetReps: '3x12', progression: 'Add reps' },
          { name: 'Cable Rope Overhead Tricep Extension', category: 'accessory', targetWeight: '20kg', targetReps: '3x15', progression: 'Add reps' },
        ],
      },
      'Day 5': {
        name: 'Pull B',
        focus: 'Back width, unilateral back, arms, grip',
        bias: 'volume',
        exercises: [
          { name: 'Weighted Pull-ups', category: 'primary', targetWeight: '+10kg', targetReps: '4x6', progression: 'Toward 4x8, then add weight' },
          { name: 'Single Arm Dumbbell Row', category: 'primary', targetWeight: '30kg', targetReps: '3x12 each', progression: 'Reps before weight' },
          { name: 'Straight Arm Pulldown', category: 'accessory', targetWeight: '25kg', targetReps: '3x15', progression: 'Add reps' },
          { name: 'EZ Bar Preacher Curls', category: 'accessory', targetWeight: '25kg', targetReps: '3x10', progression: 'Add reps' },
          { name: 'Dead Hang', category: 'accessory', targetWeight: 'BW', targetReps: '3x45', mandatory: true, progression: 'Grip + shoulder decompression — do not skip' },
          { name: 'Farmer Walks', category: 'accessory', targetWeight: '30kg', targetReps: '4x40', mandatory: true, progression: 'Grip, traps, core under load — do not skip' },
        ],
      },
      'Day 6': {
        name: 'Legs B',
        focus: 'Hamstrings, glutes',
        bias: 'volume',
        exercises: [
          { name: 'Romanian Deadlift', category: 'primary', targetWeight: '70kg', targetReps: '4x10', progression: 'Reps before weight' },
          { name: 'Hip Thrust', category: 'primary', targetWeight: '80kg', targetReps: '4x15', progression: 'Add reps' },
          { name: 'Leg Curl', category: 'accessory', targetWeight: '40kg', targetReps: '3x15', progression: 'Add reps' },
          { name: 'Walking Lunges', category: 'accessory', targetWeight: '20kg', targetReps: '3x12 each', progression: 'Add reps' },
          { name: 'Seated Calf Raise', category: 'accessory', targetWeight: '40kg', targetReps: '4x25', progression: 'Add reps' },
        ],
      },
    },
  },
  
  ppl5: {
    id: 'ppl5',
    name: 'Push/Pull/Legs (5-day)',
    description: 'PPL with one rest day mid-week',
    daysPerWeek: 5,
    days: {
      'Day 1': {
        name: 'Push A',
        focus: 'Chest & Shoulders',
        exercises: [
          { name: 'Barbell Bench Press', category: 'primary', targetWeight: '60kg', targetReps: '4x6-8' },
          { name: 'Incline DB Press', category: 'primary', targetWeight: '18kg', targetReps: '3x8-10' },
          { name: 'Overhead Press', category: 'primary', targetWeight: '40kg', targetReps: '3x8-10' },
          { name: 'Cable Crossover', category: 'accessory', targetWeight: '10kg', targetReps: '3x12-15' },
          { name: 'DB Lateral Raise', category: 'accessory', targetWeight: '8kg', targetReps: '3x12-15' },
          { name: 'Tricep Pushdown', category: 'accessory', targetWeight: '20kg', targetReps: '3x12-15' },
        ],
      },
      'Day 2': {
        name: 'Pull A',
        focus: 'Back & Biceps',
        exercises: [
          { name: 'Barbell Row', category: 'primary', targetWeight: '50kg', targetReps: '4x6-8' },
          { name: 'Pull-ups', category: 'primary', targetWeight: 'BW', targetReps: '3x8-12' },
          { name: 'Seated Cable Row', category: 'primary', targetWeight: '45kg', targetReps: '3x10-12' },
          { name: 'Face Pull', category: 'accessory', targetWeight: '15kg', targetReps: '3x15-20' },
          { name: 'Barbell Curl', category: 'accessory', targetWeight: '20kg', targetReps: '3x10-12' },
          { name: 'Hammer Curl', category: 'accessory', targetWeight: '10kg', targetReps: '3x12-15' },
        ],
      },
      'Day 3': {
        name: 'Legs',
        focus: 'Quads & Hamstrings',
        exercises: [
          { name: 'Squats', category: 'primary', targetWeight: '80kg', targetReps: '4x6-8' },
          { name: 'Romanian Deadlift', category: 'primary', targetWeight: '60kg', targetReps: '3x8-10' },
          { name: 'Leg Press', category: 'primary', targetWeight: '120kg', targetReps: '3x10-12' },
          { name: 'Leg Curl', category: 'accessory', targetWeight: '30kg', targetReps: '3x12-15' },
          { name: 'Leg Extension', category: 'accessory', targetWeight: '40kg', targetReps: '3x12-15' },
          { name: 'Calf Raises', category: 'accessory', targetWeight: 'BW', targetReps: '4x15-20' },
        ],
      },
      'Day 4': {
        name: 'Push B',
        focus: 'Shoulders & Triceps',
        exercises: [
          { name: 'Overhead Press', category: 'primary', targetWeight: '40kg', targetReps: '4x6-8' },
          { name: 'Incline Barbell Press', category: 'primary', targetWeight: '50kg', targetReps: '3x8-10' },
          { name: 'DB Shoulder Press', category: 'primary', targetWeight: '14kg', targetReps: '3x10-12' },
          { name: 'Dips', category: 'accessory', targetWeight: 'BW', targetReps: '3x10-12' },
          { name: 'Overhead Tricep Extension', category: 'accessory', targetWeight: '12kg', targetReps: '3x12-15' },
          { name: 'DB Lateral Raise', category: 'accessory', targetWeight: '8kg', targetReps: '3x15-20' },
        ],
      },
      'Day 5': {
        name: 'Pull B',
        focus: 'Back Width',
        exercises: [
          { name: 'Deadlift', category: 'primary', targetWeight: '100kg', targetReps: '4x5-6' },
          { name: 'Lat Pulldown', category: 'primary', targetWeight: '50kg', targetReps: '3x8-10' },
          { name: 'DB Row', category: 'primary', targetWeight: '20kg', targetReps: '3x10-12' },
          { name: 'Face Pull', category: 'accessory', targetWeight: '15kg', targetReps: '3x15-20' },
          { name: 'EZ Bar Curl', category: 'accessory', targetWeight: '25kg', targetReps: '3x10-12' },
          { name: 'Reverse Fly', category: 'accessory', targetWeight: '6kg', targetReps: '3x12-15' },
        ],
      },
    },
  },
  
  upper_lower4: {
    id: 'upper_lower4',
    name: 'Upper/Lower (4-day)',
    description: 'Balanced split with adequate recovery',
    daysPerWeek: 4,
    days: {
      'Day 1': {
        name: 'Upper A',
        focus: 'Push Emphasis',
        exercises: [
          { name: 'Bench Press', category: 'primary', targetWeight: '60kg', targetReps: '4x6-8' },
          { name: 'Barbell Row', category: 'primary', targetWeight: '50kg', targetReps: '4x6-8' },
          { name: 'Overhead Press', category: 'primary', targetWeight: '40kg', targetReps: '3x8-10' },
          { name: 'Pull-ups', category: 'accessory', targetWeight: 'BW', targetReps: '3x8-12' },
          { name: 'Lateral Raises', category: 'accessory', targetWeight: '8kg', targetReps: '3x12-15' },
          { name: 'Tricep Pushdowns', category: 'accessory', targetWeight: '20kg', targetReps: '3x12-15' },
        ],
      },
      'Day 2': {
        name: 'Lower A',
        focus: 'Quad Focus',
        exercises: [
          { name: 'Squats', category: 'primary', targetWeight: '80kg', targetReps: '4x6-8' },
          { name: 'Romanian Deadlift', category: 'primary', targetWeight: '60kg', targetReps: '3x8-10' },
          { name: 'Leg Press', category: 'primary', targetWeight: '120kg', targetReps: '3x10-12' },
          { name: 'Leg Curl', category: 'accessory', targetWeight: '30kg', targetReps: '3x12-15' },
          { name: 'Calf Raises', category: 'accessory', targetWeight: 'BW', targetReps: '4x12-15' },
        ],
      },
      'Day 3': {
        name: 'Upper B',
        focus: 'Pull Emphasis',
        exercises: [
          { name: 'Pull-ups', category: 'primary', targetWeight: 'BW', targetReps: '4x6-8' },
          { name: 'Incline Dumbbell Press', category: 'primary', targetWeight: '18kg', targetReps: '4x8-10' },
          { name: 'Cable Rows', category: 'primary', targetWeight: '45kg', targetReps: '3x10-12' },
          { name: 'Lateral Raises', category: 'accessory', targetWeight: '7kg', targetReps: '3x12-15' },
          { name: 'Bicep Curls', category: 'accessory', targetWeight: '12kg', targetReps: '3x12-15' },
          { name: 'Face Pulls', category: 'accessory', targetWeight: '15kg', targetReps: '3x15-20' },
        ],
      },
      'Day 4': {
        name: 'Lower B',
        focus: 'Hamstring Focus',
        exercises: [
          { name: 'Deadlift', category: 'primary', targetWeight: '100kg', targetReps: '4x5-6' },
          { name: 'Bulgarian Split Squat', category: 'primary', targetWeight: '14kg', targetReps: '3x8-10' },
          { name: 'Leg Curl', category: 'primary', targetWeight: '35kg', targetReps: '4x10-12' },
          { name: 'Leg Extension', category: 'accessory', targetWeight: '40kg', targetReps: '3x12-15' },
          { name: 'Seated Calf Raise', category: 'accessory', targetWeight: '25kg', targetReps: '4x15-20' },
        ],
      },
    },
  },
  
  full_body3: {
    id: 'full_body3',
    name: 'Full Body (3-day)',
    description: 'Perfect for beginners or busy schedules',
    daysPerWeek: 3,
    days: {
      'Day 1': {
        name: 'Full Body A',
        focus: 'Strength Foundation',
        exercises: [
          { name: 'Squats', category: 'primary', targetWeight: '70kg', targetReps: '4x6-8' },
          { name: 'Bench Press', category: 'primary', targetWeight: '55kg', targetReps: '4x6-8' },
          { name: 'Barbell Row', category: 'primary', targetWeight: '50kg', targetReps: '4x6-8' },
          { name: 'Overhead Press', category: 'accessory', targetWeight: '35kg', targetReps: '3x8-10' },
          { name: 'Bicep Curls', category: 'accessory', targetWeight: '10kg', targetReps: '2x12-15' },
        ],
      },
      'Day 2': {
        name: 'Full Body B',
        focus: 'Power & Volume',
        exercises: [
          { name: 'Deadlift', category: 'primary', targetWeight: '90kg', targetReps: '4x5-6' },
          { name: 'Incline Dumbbell Press', category: 'primary', targetWeight: '16kg', targetReps: '4x8-10' },
          { name: 'Pull-ups', category: 'primary', targetWeight: 'BW', targetReps: '4x8-12' },
          { name: 'Dumbbell Lunges', category: 'accessory', targetWeight: '12kg', targetReps: '3x10-12' },
          { name: 'Tricep Dips', category: 'accessory', targetWeight: 'BW', targetReps: '3x10-12' },
        ],
      },
      'Day 3': {
        name: 'Full Body C',
        focus: 'Hypertrophy',
        exercises: [
          { name: 'Front Squats', category: 'primary', targetWeight: '50kg', targetReps: '4x8-10' },
          { name: 'Dumbbell Bench Press', category: 'primary', targetWeight: '18kg', targetReps: '4x8-10' },
          { name: 'Cable Rows', category: 'primary', targetWeight: '45kg', targetReps: '4x10-12' },
          { name: 'Romanian Deadlift', category: 'accessory', targetWeight: '50kg', targetReps: '3x10-12' },
          { name: 'Lateral Raises', category: 'accessory', targetWeight: '6kg', targetReps: '3x12-15' },
        ],
      },
    },
  },
  
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Build your own routine',
    daysPerWeek: 0,
    days: {},
  },
};

export function getSplitTemplate(split: TrainingSplit): SplitTemplate {
  return SPLIT_TEMPLATES[split] || SPLIT_TEMPLATES.ppl6;
}

export function getSplitDays(split: TrainingSplit): Record<string, WorkoutDay> {
  return getSplitTemplate(split).days;
}
