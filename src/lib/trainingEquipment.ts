export interface EquipmentCapability {
  id: string;
  label: string;
  exercises: string[];
  note?: string;
  resistancePrCapable: boolean;
}

/**
 * Equipment currently available to the adaptive PPL program. This is a
 * capability map, not a PR alias map: two exercises sharing one machine still
 * keep separate exact records unless exerciseMatching explicitly says they
 * are the same lift.
 */
export const TRAINING_EQUIPMENT: EquipmentCapability[] = [
  {
    id: 'plate-loaded-leg-press-45',
    label: '45° Plate-Loaded Leg Press',
    exercises: ['Leg Press', 'Single Leg Press', 'Leg Press Calf Raise'],
    resistancePrCapable: true,
  },
  {
    id: 'smith-machine',
    label: 'Smith Machine',
    exercises: [
      'Smith Machine Bench Press', 'Smith Machine Incline Press', 'Smith Machine Overhead Press',
      'Smith Machine Squat', 'Smith Romanian Deadlift', 'Smith Machine Hip Thrust',
      'Standing Calf Raise', 'Smith Machine Shrugs',
    ],
    note: 'Smith loads stay separate from free-barbell PRs because bar mass/counterbalance and fixed path differ.',
    resistancePrCapable: true,
  },
  {
    id: 'olympic-flat-bench',
    label: 'Olympic Flat Bench Press',
    exercises: ['Barbell Bench Press', 'Close Grip Bench Press'],
    resistancePrCapable: true,
  },
  {
    id: 'olympic-incline-bench',
    label: 'Olympic Incline Bench Press',
    exercises: ['Incline Barbell Bench Press'],
    resistancePrCapable: true,
  },
  {
    id: 'adjustable-incline-bench',
    label: 'Adjustable Incline Bench',
    exercises: ['Incline Dumbbell Press', 'Chest Supported Row', 'Incline Dumbbell Curl', 'Incline Dumbbell Flyes'],
    resistancePrCapable: true,
  },
  {
    id: 'functional-trainer',
    label: 'Dual Cable Crossover / Functional Trainer',
    exercises: [
      'Cable Flyes', 'Cable Crossover', 'Low-to-High Cable Fly', 'High-to-Low Cable Fly',
      'Cable Lateral Raise', 'Lean-Away Cable Lateral Raise', 'Cable Rear-Delt Fly',
      'Overhead Cable Tricep Extension', 'Tricep Pushdown', 'Cable Curl', 'Cable Reverse Curls',
      'Cable Wrist Curl', 'Cable Wrist Extension', 'Cable Crunch', 'Cable Pull Through',
      'Straight Arm Pulldown', 'Single-Arm Lat Pulldown', 'Single-Arm Kneeling Lat Pulldown',
    ],
    resistancePrCapable: true,
  },
  {
    id: 'lat-pulldown',
    label: 'Lat Pulldown Machine',
    exercises: ['Lat Pulldown', 'Neutral Grip Pulldown', 'Close Grip Lat Pulldown', 'Wide Grip Lat Pulldown', 'Reverse Grip Lat Pulldown'],
    note: 'Grip variants may use comparable PR context when the same stack/cable path is used.',
    resistancePrCapable: true,
  },
  {
    id: 'low-row',
    label: 'Low Row Machine',
    exercises: ['Lever Seated Row Machine'],
    resistancePrCapable: true,
  },
  {
    id: 'pec-deck',
    label: 'Pec Deck / Chest Fly Machine',
    exercises: ['Pec Deck'],
    note: 'Machine fly PR remains separate from cable fly/crossover loads.',
    resistancePrCapable: true,
  },
  {
    id: 'rear-delt-machine',
    label: 'Reverse Fly / Rear Delt Machine',
    exercises: ['Reverse Pec Deck'],
    note: 'Machine rear-delt PR remains separate from cable/dumbbell reverse fly loads.',
    resistancePrCapable: true,
  },
  {
    id: 'assisted-pull-dip',
    label: 'Assisted Pull-Up / Dip Machine',
    exercises: ['Assisted Pull-ups', 'Assisted Dips'],
    note: 'Assistance is inverse load. It must not inherit weighted/bodyweight PR numbers.',
    resistancePrCapable: true,
  },
  {
    id: 'selectorized-chest-press',
    label: 'Selectorized Chest Press Machine',
    exercises: ['Machine Chest Press'],
    resistancePrCapable: true,
  },
  {
    id: 'seated-leg-curl',
    label: 'Seated Leg Curl Machine',
    exercises: ['Seated Leg Curl'],
    note: 'Seated and lying leg-curl loads are separate PRs.',
    resistancePrCapable: true,
  },
  {
    id: 'seated-calf',
    label: 'Seated Calf Raise Machine',
    exercises: ['Seated Calf Raise'],
    resistancePrCapable: true,
  },
  {
    id: 'tbar-lever-row',
    label: 'T-Bar / Lever Row Machine',
    exercises: ['T-Bar Row', 'Plate Loaded Row'],
    resistancePrCapable: true,
  },
  {
    id: 'dumbbell-rack',
    label: 'Dumbbell Rack',
    exercises: [
      'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Dumbbell Shoulder Press',
      'Lateral Raises', 'Dumbbell Curl', 'Hammer Curl', 'Dumbbell Romanian Deadlift',
      'Bulgarian Split Squat', 'Dumbbell Wrist Curls',
    ],
    resistancePrCapable: true,
  },
  {
    id: 'barbells-plates',
    label: 'Barbells + Weight Plates',
    exercises: [
      'Barbell Bench Press', 'Incline Barbell Bench Press', 'Barbell Row', 'Barbell Squat',
      'Romanian Deadlift', 'Barbell Curl', 'EZ Bar Curl', 'EZ Bar Preacher Curls',
      'Skull Crushers', 'Hip Thrust',
    ],
    resistancePrCapable: true,
  },
  {
    id: 'treadmill',
    label: 'Treadmills',
    exercises: [],
    note: 'Activity/conditioning equipment, not a resistance PR family.',
    resistancePrCapable: false,
  },
  {
    id: 'cardio-bike',
    label: 'Cardio Bike / Stationary Cardio Machine',
    exercises: [],
    note: 'Activity/conditioning equipment, not a resistance PR family.',
    resistancePrCapable: false,
  },
  {
    id: 'unidentified-plate-loaded-seated',
    label: 'Unidentified Plate-Loaded Seated Machine',
    exercises: [],
    note: 'Intentionally unresolved until the movement is identified. Do not merge its PR history into a row or pulldown by guesswork.',
    resistancePrCapable: true,
  },
];

export function equipmentForExercise(exerciseName: string): EquipmentCapability[] {
  const normalized = exerciseName.trim().toLowerCase();
  return TRAINING_EQUIPMENT.filter(item =>
    item.exercises.some(exercise => exercise.toLowerCase() === normalized));
}
