// Maps exercises to their barbell/dumbbell alternatives
export interface ExerciseVariant {
  name: string;
  defaultWeight: string;
  equipmentType: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight';
}

// Exercise variants - when switching equipment type
export const exerciseVariants: Record<string, ExerciseVariant[]> = {
  // Chest pressing movements
  'Flat Barbell Bench': [
    { name: 'Flat Barbell Bench', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Flat Dumbbell Bench', defaultWeight: '26kg', equipmentType: 'dumbbell' },
  ],
  'Flat Dumbbell Bench': [
    { name: 'Flat Dumbbell Bench', defaultWeight: '26kg', equipmentType: 'dumbbell' },
    { name: 'Flat Barbell Bench', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],
  'DB Flat Bench': [
    { name: 'DB Flat Bench', defaultWeight: '28kg', equipmentType: 'dumbbell' },
    { name: 'Flat Barbell Bench', defaultWeight: '65kg', equipmentType: 'barbell' },
  ],
  'Incline DB Press': [
    { name: 'Incline DB Press', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'Incline Barbell Bench', defaultWeight: '55kg', equipmentType: 'barbell' },
  ],
  'Incline Barbell Bench': [
    { name: 'Incline Barbell Bench', defaultWeight: '55kg', equipmentType: 'barbell' },
    { name: 'Incline DB Press', defaultWeight: '28kg', equipmentType: 'dumbbell' },
  ],
  'Incline Dumbbell Press': [
    { name: 'Incline Dumbbell Press', defaultWeight: '28kg', equipmentType: 'dumbbell' },
    { name: 'Incline Barbell Bench', defaultWeight: '55kg', equipmentType: 'barbell' },
  ],
  
  // Shoulder pressing movements
  'Overhead Press': [
    { name: 'Overhead Press', defaultWeight: '45kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Shoulder Press', defaultWeight: '22kg', equipmentType: 'dumbbell' },
  ],
  'Dumbbell Shoulder Press': [
    { name: 'Dumbbell Shoulder Press', defaultWeight: '22kg', equipmentType: 'dumbbell' },
    { name: 'Overhead Press', defaultWeight: '45kg', equipmentType: 'barbell' },
  ],
  'Seated DB Shoulder Press': [
    { name: 'Seated DB Shoulder Press', defaultWeight: '22kg', equipmentType: 'dumbbell' },
    { name: 'Overhead Press', defaultWeight: '45kg', equipmentType: 'barbell' },
  ],
  
  // Rows
  'Barbell Row': [
    { name: 'Barbell Row', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Single Arm Dumbbell Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'T-Bar Row', defaultWeight: '50kg', equipmentType: 'machine' },
  ],
  'T-Bar Row': [
    { name: 'T-Bar Row', defaultWeight: '50kg', equipmentType: 'machine' },
    { name: 'Barbell Row', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Single Arm Dumbbell Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
  ],
  'Single Arm DB Row': [
    { name: 'Single Arm DB Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Row', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'T-Bar Row', defaultWeight: '50kg', equipmentType: 'machine' },
  ],
  'Single Arm Dumbbell Row': [
    { name: 'Single Arm Dumbbell Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Row', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],

  // Curls
  'Barbell Curl': [
    { name: 'Barbell Curl', defaultWeight: '25kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Curl', defaultWeight: '12kg', equipmentType: 'dumbbell' },
    { name: 'Cable Curl', defaultWeight: '20kg', equipmentType: 'cable' },
  ],
  'Dumbbell Curl': [
    { name: 'Dumbbell Curl', defaultWeight: '12kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Curl', defaultWeight: '25kg', equipmentType: 'barbell' },
    { name: 'Cable Curl', defaultWeight: '20kg', equipmentType: 'cable' },
  ],
  
  // Squats
  'Barbell Squat': [
    { name: 'Barbell Squat', defaultWeight: '80kg', equipmentType: 'barbell' },
    { name: 'Goblet Squat', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'Hack Squat', defaultWeight: '80kg', equipmentType: 'machine' },
  ],
  'Front Squat': [
    { name: 'Front Squat', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Goblet Squat', defaultWeight: '30kg', equipmentType: 'dumbbell' },
  ],

  // Romanian Deadlift
  'Romanian Deadlift': [
    { name: 'Romanian Deadlift', defaultWeight: '70kg', equipmentType: 'barbell' },
    { name: 'Dumbbell RDL', defaultWeight: '24kg', equipmentType: 'dumbbell' },
  ],
  
  // Lunges
  'Walking Lunges': [
    { name: 'Walking Lunges', defaultWeight: '20kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Lunges', defaultWeight: '40kg', equipmentType: 'barbell' },
  ],
  'Bulgarian Split Squat': [
    { name: 'Bulgarian Split Squat', defaultWeight: '20kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Bulgarian Split Squat', defaultWeight: '40kg', equipmentType: 'barbell' },
  ],

  // Tricep
  'Skull Crushers': [
    { name: 'Skull Crushers', defaultWeight: '25kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Skull Crushers', defaultWeight: '10kg', equipmentType: 'dumbbell' },
  ],
  'Overhead Tricep Extension': [
    { name: 'Overhead Tricep Extension', defaultWeight: '20kg', equipmentType: 'cable' },
    { name: 'Dumbbell Overhead Extension', defaultWeight: '18kg', equipmentType: 'dumbbell' },
  ],

  // Lateral Raises
  'Lateral Raises': [
    { name: 'Lateral Raises', defaultWeight: '10kg', equipmentType: 'dumbbell' },
    { name: 'Cable Lateral Raise', defaultWeight: '7.5kg', equipmentType: 'cable' },
  ],
  'Cable Lateral Raise': [
    { name: 'Cable Lateral Raise', defaultWeight: '7.5kg', equipmentType: 'cable' },
    { name: 'Lateral Raises', defaultWeight: '10kg', equipmentType: 'dumbbell' },
  ],
};

// Get all variants for an exercise (returns original if no variants exist)
export function getExerciseVariants(exerciseName: string): ExerciseVariant[] {
  return exerciseVariants[exerciseName] || [
    { name: exerciseName, defaultWeight: '', equipmentType: 'dumbbell' }
  ];
}

// Check if exercise has variants
export function hasVariants(exerciseName: string): boolean {
  return exerciseName in exerciseVariants && exerciseVariants[exerciseName].length > 1;
}

// Get equipment type for an exercise
export function getEquipmentType(exerciseName: string): ExerciseVariant['equipmentType'] {
  const variants = exerciseVariants[exerciseName];
  if (variants && variants.length > 0) {
    return variants[0].equipmentType;
  }
  // Infer from exercise name
  const lowerName = exerciseName.toLowerCase();
  if (lowerName.includes('barbell') || lowerName.includes('bb ')) return 'barbell';
  if (lowerName.includes('dumbbell') || lowerName.includes('db ')) return 'dumbbell';
  if (lowerName.includes('cable')) return 'cable';
  if (lowerName.includes('machine') || lowerName.includes('hack') || lowerName.includes('leg press')) return 'machine';
  if (lowerName.includes('pull-up') || lowerName.includes('dip') || lowerName.includes('pushup')) return 'bodyweight';
  return 'dumbbell'; // Default
}

// Get weight label based on equipment type
export function getWeightLabel(equipmentType: ExerciseVariant['equipmentType']): string {
  switch (equipmentType) {
    case 'barbell': return 'kg';      // Total weight (bar + plates)
    case 'dumbbell': return 'kg ea';  // Per hand
    case 'cable': return 'kg';        // Stack weight
    case 'machine': return 'kg';      // Stack/plate weight
    case 'bodyweight': return 'kg';   // Added weight
    default: return 'kg';
  }
}

// Get equipment icon
export function getEquipmentEmoji(type: ExerciseVariant['equipmentType']): string {
  switch (type) {
    case 'barbell': return '🏋️';
    case 'dumbbell': return '💪';
    case 'cable': return '🔗';
    case 'machine': return '⚙️';
    case 'bodyweight': return '🧘';
    default: return '💪';
  }
}
