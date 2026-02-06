import { defaultRoutine, WorkoutDay } from './workoutPresets';

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
    description: 'Classic bodybuilding split, each muscle group twice per week',
    daysPerWeek: 6,
    days: defaultRoutine.days,
  },
  
  ppl5: {
    id: 'ppl5',
    name: 'Push/Pull/Legs (5-day)',
    description: 'PPL with one rest day mid-week',
    daysPerWeek: 5,
    days: {
      'Day 1': { name: 'Push A', focus: 'Chest & Shoulders', exercises: [] },
      'Day 2': { name: 'Pull A', focus: 'Back & Biceps', exercises: [] },
      'Day 3': { name: 'Legs', focus: 'Quads & Hamstrings', exercises: [] },
      'Day 4': { name: 'Push B', focus: 'Shoulders & Triceps', exercises: [] },
      'Day 5': { name: 'Pull B', focus: 'Back Width', exercises: [] },
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
          { name: 'Leg Curls', category: 'accessory', targetWeight: '30kg', targetReps: '3x12-15' },
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
          { name: 'Dumbbell Lateral Raises', category: 'accessory', targetWeight: '7kg', targetReps: '3x12-15' },
          { name: 'Bicep Curls', category: 'accessory', targetWeight: '12kg', targetReps: '3x12-15' },
          { name: 'Face Pulls', category: 'accessory', targetWeight: '15kg', targetReps: '3x15-20' },
        ],
      },
      'Day 4': {
        name: 'Lower B',
        focus: 'Hamstring Focus',
        exercises: [
          { name: 'Deadlift', category: 'primary', targetWeight: '100kg', targetReps: '4x5-6' },
          { name: 'Bulgarian Split Squats', category: 'primary', targetWeight: '14kg', targetReps: '3x8-10' },
          { name: 'Leg Curls', category: 'primary', targetWeight: '35kg', targetReps: '4x10-12' },
          { name: 'Leg Extensions', category: 'accessory', targetWeight: '40kg', targetReps: '3x12-15' },
          { name: 'Seated Calf Raises', category: 'accessory', targetWeight: '25kg', targetReps: '4x15-20' },
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
