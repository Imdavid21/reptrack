// Maps exercises to their barbell/dumbbell alternatives
export interface ExerciseVariant {
  name: string;
  defaultWeight: string;
  equipmentType: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight';
}

// Exercise variants - when switching equipment type
export const exerciseVariants: Record<string, ExerciseVariant[]> = {
  // ==================== PUSH EXERCISES ====================
  
  // Chest - Flat Pressing
  'Barbell Bench Press': [
    { name: 'Barbell Bench Press', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Bench Press', defaultWeight: '26kg', equipmentType: 'dumbbell' },
  ],
  'Dumbbell Bench Press': [
    { name: 'Dumbbell Bench Press', defaultWeight: '26kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Bench Press', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],
  'Flat Dumbbell Bench Press': [
    { name: 'Flat Dumbbell Bench Press', defaultWeight: '26kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Bench Press', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],
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
  
  // Chest - Incline Pressing
  'Incline Barbell Bench Press': [
    { name: 'Incline Barbell Bench Press', defaultWeight: '55kg', equipmentType: 'barbell' },
    { name: 'Incline Dumbbell Press', defaultWeight: '24kg', equipmentType: 'dumbbell' },
  ],
  'Incline Dumbbell Press': [
    { name: 'Incline Dumbbell Press', defaultWeight: '24kg', equipmentType: 'dumbbell' },
    { name: 'Incline Barbell Bench Press', defaultWeight: '55kg', equipmentType: 'barbell' },
  ],
  'Incline Barbell Bench': [
    { name: 'Incline Barbell Bench', defaultWeight: '55kg', equipmentType: 'barbell' },
    { name: 'Incline DB Press', defaultWeight: '28kg', equipmentType: 'dumbbell' },
  ],
  'Incline DB Press': [
    { name: 'Incline DB Press', defaultWeight: '28kg', equipmentType: 'dumbbell' },
    { name: 'Incline Barbell Bench', defaultWeight: '55kg', equipmentType: 'barbell' },
  ],

  // Chest - Flyes
  'Cable Flyes': [
    { name: 'Cable Flyes', defaultWeight: '15kg', equipmentType: 'cable' },
    { name: 'Incline Dumbbell Flyes', defaultWeight: '12kg', equipmentType: 'dumbbell' },
  ],
  'Cable Crossover': [
    { name: 'Cable Crossover', defaultWeight: '15kg', equipmentType: 'cable' },
    { name: 'Incline Dumbbell Flyes', defaultWeight: '12kg', equipmentType: 'dumbbell' },
  ],
  'Incline Dumbbell Flyes': [
    { name: 'Incline Dumbbell Flyes', defaultWeight: '12kg', equipmentType: 'dumbbell' },
    { name: 'Cable Flyes', defaultWeight: '15kg', equipmentType: 'cable' },
  ],

  // Chest - Bodyweight
  'Push-ups': [
    { name: 'Push-ups', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],
  'Incline Push-ups': [
    { name: 'Incline Push-ups', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],
  'Decline Push-ups': [
    { name: 'Decline Push-ups', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],
  'Dips': [
    { name: 'Dips', defaultWeight: 'BW', equipmentType: 'bodyweight' },
    { name: 'Weighted Dips', defaultWeight: '+10kg', equipmentType: 'bodyweight' },
  ],
  'Weighted Dips': [
    { name: 'Weighted Dips', defaultWeight: '+10kg', equipmentType: 'bodyweight' },
    { name: 'Dips', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],
  
  // Shoulders - Pressing
  'Overhead Press': [
    { name: 'Overhead Press', defaultWeight: '40kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Shoulder Press', defaultWeight: '20kg', equipmentType: 'dumbbell' },
  ],
  'Barbell Overhead Press': [
    { name: 'Barbell Overhead Press', defaultWeight: '40kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Shoulder Press', defaultWeight: '20kg', equipmentType: 'dumbbell' },
  ],
  'Dumbbell Shoulder Press': [
    { name: 'Dumbbell Shoulder Press', defaultWeight: '20kg', equipmentType: 'dumbbell' },
    { name: 'Overhead Press', defaultWeight: '40kg', equipmentType: 'barbell' },
  ],
  'Seated Dumbbell Shoulder Press': [
    { name: 'Seated Dumbbell Shoulder Press', defaultWeight: '20kg', equipmentType: 'dumbbell' },
    { name: 'Overhead Press', defaultWeight: '40kg', equipmentType: 'barbell' },
  ],
  'Seated DB Shoulder Press': [
    { name: 'Seated DB Shoulder Press', defaultWeight: '22kg', equipmentType: 'dumbbell' },
    { name: 'Overhead Press', defaultWeight: '45kg', equipmentType: 'barbell' },
  ],
  'Arnold Press': [
    { name: 'Arnold Press', defaultWeight: '16kg', equipmentType: 'dumbbell' },
    { name: 'Dumbbell Shoulder Press', defaultWeight: '20kg', equipmentType: 'dumbbell' },
  ],

  // Shoulders - Lateral Raises
  'Lateral Raises': [
    { name: 'Lateral Raises', defaultWeight: '10kg', equipmentType: 'dumbbell' },
    { name: 'Cable Lateral Raise', defaultWeight: '7.5kg', equipmentType: 'cable' },
  ],
  'Dumbbell Lateral Raises': [
    { name: 'Dumbbell Lateral Raises', defaultWeight: '10kg', equipmentType: 'dumbbell' },
    { name: 'Cable Lateral Raise', defaultWeight: '7.5kg', equipmentType: 'cable' },
  ],
  'Cable Lateral Raise': [
    { name: 'Cable Lateral Raise', defaultWeight: '7.5kg', equipmentType: 'cable' },
    { name: 'Lateral Raises', defaultWeight: '10kg', equipmentType: 'dumbbell' },
  ],
  'Front Raises': [
    { name: 'Front Raises', defaultWeight: '8kg', equipmentType: 'dumbbell' },
  ],
  'Bent Over Rear Delt Flyes': [
    { name: 'Bent Over Rear Delt Flyes', defaultWeight: '8kg', equipmentType: 'dumbbell' },
  ],

  // Triceps
  'Tricep Pushdown': [
    { name: 'Tricep Pushdown', defaultWeight: '25kg', equipmentType: 'cable' },
  ],
  'Cable Tricep Pushdowns': [
    { name: 'Cable Tricep Pushdowns', defaultWeight: '25kg', equipmentType: 'cable' },
  ],
  'Overhead Tricep Extension': [
    { name: 'Overhead Tricep Extension', defaultWeight: '20kg', equipmentType: 'cable' },
    { name: 'Dumbbell Overhead Extension', defaultWeight: '18kg', equipmentType: 'dumbbell' },
  ],
  'Overhead Cable Tricep Extension': [
    { name: 'Overhead Cable Tricep Extension', defaultWeight: '20kg', equipmentType: 'cable' },
  ],
  'Cable Rope Overhead Tricep Extension': [
    { name: 'Cable Rope Overhead Tricep Extension', defaultWeight: '20kg', equipmentType: 'cable' },
  ],
  'Skull Crushers': [
    { name: 'Skull Crushers', defaultWeight: '25kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Skull Crushers', defaultWeight: '10kg', equipmentType: 'dumbbell' },
  ],
  'Close Grip Bench Press': [
    { name: 'Close Grip Bench Press', defaultWeight: '50kg', equipmentType: 'barbell' },
  ],

  // ==================== PULL EXERCISES ====================
  
  // Back - Vertical Pulls
  'Pull-ups': [
    { name: 'Pull-ups', defaultWeight: 'BW', equipmentType: 'bodyweight' },
    { name: 'Lat Pulldown', defaultWeight: '55kg', equipmentType: 'cable' },
  ],
  'Weighted Pull-ups': [
    { name: 'Weighted Pull-ups', defaultWeight: '+10kg', equipmentType: 'bodyweight' },
  ],
  'Chin-ups': [
    { name: 'Chin-ups', defaultWeight: 'BW', equipmentType: 'bodyweight' },
    { name: 'Lat Pulldown', defaultWeight: '55kg', equipmentType: 'cable' },
  ],
  'Lat Pulldown': [
    { name: 'Lat Pulldown', defaultWeight: '55kg', equipmentType: 'cable' },
    { name: 'Pull-ups', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],
  'Straight Arm Pulldown': [
    { name: 'Straight Arm Pulldown', defaultWeight: '25kg', equipmentType: 'cable' },
  ],
  'Straight Arm Pulldowns': [
    { name: 'Straight Arm Pulldowns', defaultWeight: '25kg', equipmentType: 'cable' },
  ],

  // Back - Rows
  'Barbell Row': [
    { name: 'Barbell Row', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Single Arm Dumbbell Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'T-Bar Row', defaultWeight: '50kg', equipmentType: 'machine' },
  ],
  'Barbell Rows': [
    { name: 'Barbell Rows', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Single Arm Dumbbell Rows', defaultWeight: '30kg', equipmentType: 'dumbbell' },
  ],
  'T-Bar Row': [
    { name: 'T-Bar Row', defaultWeight: '50kg', equipmentType: 'machine' },
    { name: 'Barbell Row', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Single Arm Dumbbell Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
  ],
  'Seated Cable Row': [
    { name: 'Seated Cable Row', defaultWeight: '50kg', equipmentType: 'cable' },
    { name: 'Single Arm Dumbbell Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
  ],
  'Cable Seated Row': [
    { name: 'Cable Seated Row', defaultWeight: '50kg', equipmentType: 'cable' },
  ],
  'Single Arm Dumbbell Row': [
    { name: 'Single Arm Dumbbell Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Row', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],
  'Single Arm Dumbbell Rows': [
    { name: 'Single Arm Dumbbell Rows', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Rows', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],
  'Single Arm DB Row': [
    { name: 'Single Arm DB Row', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Row', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'T-Bar Row', defaultWeight: '50kg', equipmentType: 'machine' },
  ],

  // Back - Deadlifts
  'Conventional Deadlift': [
    { name: 'Conventional Deadlift', defaultWeight: '100kg', equipmentType: 'barbell' },
  ],
  'Deadlift Technique Work': [
    { name: 'Deadlift Technique Work', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],

  // Rear Delts / Face Pulls
  'Face Pulls': [
    { name: 'Face Pulls', defaultWeight: '20kg', equipmentType: 'cable' },
    { name: 'Reverse Flyes', defaultWeight: '10kg', equipmentType: 'dumbbell' },
  ],
  'Reverse Flyes': [
    { name: 'Reverse Flyes', defaultWeight: '10kg', equipmentType: 'dumbbell' },
    { name: 'Face Pulls', defaultWeight: '20kg', equipmentType: 'cable' },
  ],

  // Biceps
  'Barbell Curl': [
    { name: 'Barbell Curl', defaultWeight: '25kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Curl', defaultWeight: '12kg', equipmentType: 'dumbbell' },
    { name: 'Cable Curl', defaultWeight: '20kg', equipmentType: 'cable' },
  ],
  'Barbell Curls': [
    { name: 'Barbell Curls', defaultWeight: '25kg', equipmentType: 'barbell' },
    { name: 'Dumbbell Curl', defaultWeight: '12kg', equipmentType: 'dumbbell' },
  ],
  'Dumbbell Curl': [
    { name: 'Dumbbell Curl', defaultWeight: '12kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Curl', defaultWeight: '25kg', equipmentType: 'barbell' },
    { name: 'Cable Curl', defaultWeight: '20kg', equipmentType: 'cable' },
  ],
  'Hammer Curls': [
    { name: 'Hammer Curls', defaultWeight: '12kg', equipmentType: 'dumbbell' },
  ],
  'Incline Dumbbell Curl': [
    { name: 'Incline Dumbbell Curl', defaultWeight: '10kg', equipmentType: 'dumbbell' },
  ],
  'Incline Dumbbell Curls': [
    { name: 'Incline Dumbbell Curls', defaultWeight: '10kg', equipmentType: 'dumbbell' },
  ],
  'Cable Curl': [
    { name: 'Cable Curl', defaultWeight: '20kg', equipmentType: 'cable' },
    { name: 'Barbell Curl', defaultWeight: '25kg', equipmentType: 'barbell' },
  ],
  'Cable Curls': [
    { name: 'Cable Curls', defaultWeight: '20kg', equipmentType: 'cable' },
  ],
  'EZ Bar Preacher Curls': [
    { name: 'EZ Bar Preacher Curls', defaultWeight: '20kg', equipmentType: 'barbell' },
  ],
  'Concentration Curls': [
    { name: 'Concentration Curls', defaultWeight: '10kg', equipmentType: 'dumbbell' },
  ],

  // ==================== LEGS EXERCISES ====================
  
  // Quads - Squats
  'Barbell Squat': [
    { name: 'Barbell Squat', defaultWeight: '80kg', equipmentType: 'barbell' },
    { name: 'Goblet Squats', defaultWeight: '30kg', equipmentType: 'dumbbell' },
    { name: 'Hack Squat', defaultWeight: '80kg', equipmentType: 'machine' },
  ],
  'Front Squat': [
    { name: 'Front Squat', defaultWeight: '60kg', equipmentType: 'barbell' },
    { name: 'Goblet Squats', defaultWeight: '30kg', equipmentType: 'dumbbell' },
  ],
  'Goblet Squats': [
    { name: 'Goblet Squats', defaultWeight: '20kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Squat', defaultWeight: '80kg', equipmentType: 'barbell' },
  ],
  'Bodyweight Squats': [
    { name: 'Bodyweight Squats', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],
  'Hack Squat': [
    { name: 'Hack Squat', defaultWeight: '80kg', equipmentType: 'machine' },
    { name: 'Barbell Squat', defaultWeight: '80kg', equipmentType: 'barbell' },
  ],
  'Leg Press': [
    { name: 'Leg Press', defaultWeight: '150kg', equipmentType: 'machine' },
    { name: 'Barbell Squat', defaultWeight: '80kg', equipmentType: 'barbell' },
  ],
  'Sissy Squats': [
    { name: 'Sissy Squats', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],

  // Quads - Unilateral
  'Bulgarian Split Squat': [
    { name: 'Bulgarian Split Squat', defaultWeight: '20kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Bulgarian Split Squat', defaultWeight: '40kg', equipmentType: 'barbell' },
  ],
  'Bulgarian Split Squats': [
    { name: 'Bulgarian Split Squats', defaultWeight: '20kg', equipmentType: 'dumbbell' },
  ],
  'Walking Lunges': [
    { name: 'Walking Lunges', defaultWeight: '20kg', equipmentType: 'dumbbell' },
    { name: 'Barbell Lunges', defaultWeight: '40kg', equipmentType: 'barbell' },
  ],

  // Quads - Isolation
  'Leg Extension': [
    { name: 'Leg Extension', defaultWeight: '45kg', equipmentType: 'machine' },
  ],
  'Leg Extensions': [
    { name: 'Leg Extensions', defaultWeight: '45kg', equipmentType: 'machine' },
  ],

  // Hamstrings - Compound
  'Romanian Deadlift': [
    { name: 'Romanian Deadlift', defaultWeight: '70kg', equipmentType: 'barbell' },
    { name: 'Dumbbell RDL', defaultWeight: '24kg', equipmentType: 'dumbbell' },
  ],
  'Romanian Deadlifts': [
    { name: 'Romanian Deadlifts', defaultWeight: '70kg', equipmentType: 'barbell' },
  ],
  'Dumbbell RDL': [
    { name: 'Dumbbell RDL', defaultWeight: '24kg', equipmentType: 'dumbbell' },
    { name: 'Romanian Deadlift', defaultWeight: '70kg', equipmentType: 'barbell' },
  ],
  'Single Leg Romanian Deadlifts': [
    { name: 'Single Leg Romanian Deadlifts', defaultWeight: '15kg', equipmentType: 'dumbbell' },
  ],
  'Good Mornings': [
    { name: 'Good Mornings', defaultWeight: '40kg', equipmentType: 'barbell' },
  ],

  // Hamstrings - Isolation
  'Leg Curl': [
    { name: 'Leg Curl', defaultWeight: '40kg', equipmentType: 'machine' },
  ],
  'Leg Curls': [
    { name: 'Leg Curls', defaultWeight: '40kg', equipmentType: 'machine' },
  ],

  // Glutes
  'Hip Thrust': [
    { name: 'Hip Thrust', defaultWeight: '80kg', equipmentType: 'barbell' },
    { name: 'Glute Bridge', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],
  'Hip Thrusts': [
    { name: 'Hip Thrusts', defaultWeight: '80kg', equipmentType: 'barbell' },
  ],
  'Glute Bridge': [
    { name: 'Glute Bridge', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],
  'Glute Bridges': [
    { name: 'Glute Bridges', defaultWeight: '60kg', equipmentType: 'barbell' },
  ],

  // Calves
  'Standing Calf Raise': [
    { name: 'Standing Calf Raise', defaultWeight: '60kg', equipmentType: 'machine' },
  ],
  'Standing Calf Raises': [
    { name: 'Standing Calf Raises', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],
  'Seated Calf Raise': [
    { name: 'Seated Calf Raise', defaultWeight: '40kg', equipmentType: 'machine' },
  ],
  'Seated Calf Raises': [
    { name: 'Seated Calf Raises', defaultWeight: '40kg', equipmentType: 'machine' },
  ],

  // Core
  'Ab Wheel Rollout': [
    { name: 'Ab Wheel Rollout', defaultWeight: 'BW', equipmentType: 'bodyweight' },
  ],
  'Wall Sit': [
    { name: 'Wall Sit', defaultWeight: 'BW', equipmentType: 'bodyweight' },
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
