export interface ExerciseOption {
  name: string;
  category: 'primary' | 'accessory';
  defaultWeight: string;
  defaultReps: string;
  muscleGroup: string;
}

export const exerciseLibrary: Record<string, ExerciseOption[]> = {
  'Push': [
    // Primary Chest
    { name: 'Barbell Bench Press', category: 'primary', defaultWeight: '60kg', defaultReps: '4x6-8', muscleGroup: 'Chest' },
    { name: 'Incline Barbell Bench Press', category: 'primary', defaultWeight: '55kg', defaultReps: '4x8-10', muscleGroup: 'Upper Chest' },
    { name: 'Dumbbell Bench Press', category: 'primary', defaultWeight: '20kg', defaultReps: '4x8-10', muscleGroup: 'Chest' },
    { name: 'Flat Dumbbell Bench Press', category: 'primary', defaultWeight: '20kg', defaultReps: '4x8-10', muscleGroup: 'Chest' },
    { name: 'Incline Dumbbell Press', category: 'primary', defaultWeight: '28kg', defaultReps: '4x8-10', muscleGroup: 'Upper Chest' },
    // Chest Accessories
    { name: 'Cable Flyes', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Chest' },
    { name: 'Cable Crossover', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Chest' },
    { name: 'Incline Dumbbell Flyes', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Upper Chest' },
    { name: 'Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3xAMRAP', muscleGroup: 'Chest' },
    { name: 'Incline Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Chest' },
    { name: 'Decline Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-15', muscleGroup: 'Upper Chest' },
    { name: 'Dips', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-12', muscleGroup: 'Chest/Triceps' },
    // Primary Shoulders
    { name: 'Overhead Press', category: 'primary', defaultWeight: '40kg', defaultReps: '4x6-8', muscleGroup: 'Shoulders' },
    { name: 'Barbell Overhead Press', category: 'primary', defaultWeight: '40kg', defaultReps: '4x6-8', muscleGroup: 'Shoulders' },
    { name: 'Dumbbell Shoulder Press', category: 'primary', defaultWeight: '22kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders' },
    { name: 'Seated Dumbbell Shoulder Press', category: 'primary', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders' },
    { name: 'Arnold Press', category: 'accessory', defaultWeight: '16kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders' },
    // Shoulder Accessories
    { name: 'Lateral Raises', category: 'accessory', defaultWeight: '10kg', defaultReps: '4x12-15', muscleGroup: 'Side Delts' },
    { name: 'Dumbbell Lateral Raises', category: 'accessory', defaultWeight: '10kg', defaultReps: '4x12-15', muscleGroup: 'Side Delts' },
    { name: 'Cable Lateral Raise', category: 'accessory', defaultWeight: '7.5kg', defaultReps: '4x12-15', muscleGroup: 'Side Delts' },
    { name: 'Front Raises', category: 'accessory', defaultWeight: '8kg', defaultReps: '3x12-15', muscleGroup: 'Front Delts' },
    { name: 'Bent Over Rear Delt Flyes', category: 'accessory', defaultWeight: '8kg', defaultReps: '4x12-15', muscleGroup: 'Rear Delts' },
    // Triceps
    { name: 'Tricep Pushdown', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x12-15', muscleGroup: 'Triceps' },
    { name: 'Cable Tricep Pushdowns', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x12-15', muscleGroup: 'Triceps' },
    { name: 'Overhead Tricep Extension', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Triceps' },
    { name: 'Overhead Cable Tricep Extension', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Triceps' },
    { name: 'Cable Rope Overhead Tricep Extension', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Triceps' },
    { name: 'Skull Crushers', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x10-12', muscleGroup: 'Triceps' },
    { name: 'Close Grip Bench Press', category: 'accessory', defaultWeight: '50kg', defaultReps: '3x8-10', muscleGroup: 'Triceps' },
  ],
  'Pull': [
    // Primary Back
    { name: 'Pull-ups', category: 'primary', defaultWeight: 'BW', defaultReps: '4xAMRAP', muscleGroup: 'Lats' },
    { name: 'Weighted Pull-ups', category: 'primary', defaultWeight: '+10kg', defaultReps: '4x6-8', muscleGroup: 'Lats' },
    { name: 'Chin-ups', category: 'primary', defaultWeight: 'BW', defaultReps: '3x8-10', muscleGroup: 'Back/Biceps' },
    { name: 'Conventional Deadlift', category: 'primary', defaultWeight: '100kg', defaultReps: '4x5', muscleGroup: 'Posterior Chain' },
    { name: 'Deadlift Technique Work', category: 'primary', defaultWeight: '60kg', defaultReps: '5x8', muscleGroup: 'Posterior Chain' },
    { name: 'Barbell Row', category: 'primary', defaultWeight: '60kg', defaultReps: '4x6-8', muscleGroup: 'Back' },
    { name: 'Barbell Rows', category: 'primary', defaultWeight: '60kg', defaultReps: '4x6-8', muscleGroup: 'Back' },
    { name: 'T-Bar Row', category: 'primary', defaultWeight: '50kg', defaultReps: '4x8-10', muscleGroup: 'Back' },
    { name: 'Lat Pulldown', category: 'primary', defaultWeight: '55kg', defaultReps: '3x10-12', muscleGroup: 'Lats' },
    // Back Accessories
    { name: 'Seated Cable Row', category: 'accessory', defaultWeight: '50kg', defaultReps: '3x10-12', muscleGroup: 'Back' },
    { name: 'Cable Seated Row', category: 'accessory', defaultWeight: '50kg', defaultReps: '3x10-12', muscleGroup: 'Back' },
    { name: 'Single Arm Dumbbell Row', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x10-12', muscleGroup: 'Back' },
    { name: 'Single Arm Dumbbell Rows', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x10-12', muscleGroup: 'Back' },
    { name: 'Straight Arm Pulldown', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x12-15', muscleGroup: 'Lats' },
    { name: 'Straight Arm Pulldowns', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x12-15', muscleGroup: 'Lats' },
    { name: 'Face Pulls', category: 'accessory', defaultWeight: '20kg', defaultReps: '4x15-20', muscleGroup: 'Rear Delts' },
    { name: 'Reverse Flyes', category: 'accessory', defaultWeight: '10kg', defaultReps: '4x12-15', muscleGroup: 'Rear Delts' },
    // Biceps
    { name: 'Barbell Curl', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x10-12', muscleGroup: 'Biceps' },
    { name: 'Barbell Curls', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x10-12', muscleGroup: 'Biceps' },
    { name: 'Dumbbell Curl', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Biceps' },
    { name: 'Hammer Curls', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x12-15', muscleGroup: 'Biceps' },
    { name: 'Incline Dumbbell Curl', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x10-12', muscleGroup: 'Biceps' },
    { name: 'Incline Dumbbell Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x10-12', muscleGroup: 'Biceps' },
    { name: 'Cable Curl', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Biceps' },
    { name: 'Cable Curls', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Biceps' },
    { name: 'EZ Bar Preacher Curls', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Biceps' },
    { name: 'Concentration Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x10-12', muscleGroup: 'Biceps' },
    // Forearms
    { name: 'Reverse Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x12-15', muscleGroup: 'Forearms' },
    { name: 'Barbell Reverse Curls', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Forearms' },
    { name: 'Dumbbell Reverse Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x12-15', muscleGroup: 'Forearms' },
    { name: 'EZ Bar Reverse Curls', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Forearms' },
    { name: 'Cable Reverse Curls', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Forearms' },
    // Lower Back
    { name: 'Back Extension 90 Degree', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Lower Back' },
    { name: 'Back Extension', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Lower Back' },
    { name: 'Hyperextension', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12-15', muscleGroup: 'Lower Back' },
    // Lever Rows
    { name: 'Lever Seated Row Machine', category: 'primary', defaultWeight: '30kg', defaultReps: '3x10-12', muscleGroup: 'Back' },
  ],
  'Legs': [
    // Primary Quads
    { name: 'Barbell Squat', category: 'primary', defaultWeight: '80kg', defaultReps: '4x6-8', muscleGroup: 'Quads' },
    { name: 'Front Squat', category: 'primary', defaultWeight: '60kg', defaultReps: '3x8-10', muscleGroup: 'Quads' },
    { name: 'Bodyweight Squats', category: 'primary', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Quads' },
    { name: 'Goblet Squats', category: 'primary', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Quads' },
    { name: 'Leg Press', category: 'primary', defaultWeight: '150kg', defaultReps: '3x10-12', muscleGroup: 'Quads' },
    { name: 'Hack Squat', category: 'primary', defaultWeight: '80kg', defaultReps: '3x10-12', muscleGroup: 'Quads' },
    { name: 'Bulgarian Split Squat', category: 'primary', defaultWeight: '20kg', defaultReps: '3x10 each', muscleGroup: 'Quads/Glutes' },
    { name: 'Bulgarian Split Squats', category: 'primary', defaultWeight: '20kg', defaultReps: '3x10 each', muscleGroup: 'Quads/Glutes' },
    // Primary Posterior
    { name: 'Romanian Deadlift', category: 'primary', defaultWeight: '70kg', defaultReps: '3x8-10', muscleGroup: 'Hamstrings' },
    { name: 'Romanian Deadlifts', category: 'primary', defaultWeight: '70kg', defaultReps: '3x8-10', muscleGroup: 'Hamstrings' },
    { name: 'Hip Thrust', category: 'primary', defaultWeight: '80kg', defaultReps: '3x10-12', muscleGroup: 'Glutes' },
    { name: 'Hip Thrusts', category: 'primary', defaultWeight: '80kg', defaultReps: '3x10-12', muscleGroup: 'Glutes' },
    // Accessories
    { name: 'Walking Lunges', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12 each', muscleGroup: 'Quads/Glutes' },
    { name: 'Leg Extension', category: 'accessory', defaultWeight: '45kg', defaultReps: '3x12-15', muscleGroup: 'Quads' },
    { name: 'Leg Extensions', category: 'accessory', defaultWeight: '45kg', defaultReps: '3x12-15', muscleGroup: 'Quads' },
    { name: 'Sissy Squats', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-15', muscleGroup: 'Quads' },
    { name: 'Leg Curl', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x12-15', muscleGroup: 'Hamstrings' },
    { name: 'Leg Curls', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x12-15', muscleGroup: 'Hamstrings' },
    { name: 'Single Leg Romanian Deadlifts', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x10 each', muscleGroup: 'Hamstrings' },
    { name: 'Glute Bridge', category: 'accessory', defaultWeight: '60kg', defaultReps: '3x12-15', muscleGroup: 'Glutes' },
    { name: 'Glute Bridges', category: 'accessory', defaultWeight: '60kg', defaultReps: '3x12-15', muscleGroup: 'Glutes' },
    { name: 'Good Mornings', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x10-12', muscleGroup: 'Hamstrings' },
    // Calves
    { name: 'Standing Calf Raise', category: 'accessory', defaultWeight: '60kg', defaultReps: '4x15-20', muscleGroup: 'Calves' },
    { name: 'Standing Calf Raises', category: 'accessory', defaultWeight: 'BW', defaultReps: '4x15-20', muscleGroup: 'Calves' },
    { name: 'Seated Calf Raise', category: 'accessory', defaultWeight: '40kg', defaultReps: '4x15-20', muscleGroup: 'Calves' },
    { name: 'Seated Calf Raises', category: 'accessory', defaultWeight: '40kg', defaultReps: '4x15-20', muscleGroup: 'Calves' },
    // Other
    { name: 'Wall Sit', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x30-60s', muscleGroup: 'Quads' },
    { name: 'Ab Wheel Rollout', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12-15', muscleGroup: 'Core' },
  ],
};

export const dayTemplates = [
  { key: 'Day 1', name: 'Push A', focus: 'Chest & Shoulders', type: 'Push' },
  { key: 'Day 2', name: 'Pull A', focus: 'Back & Biceps', type: 'Pull' },
  { key: 'Day 3', name: 'Legs A', focus: 'Quads & Glutes', type: 'Legs' },
  { key: 'Day 4', name: 'Push B', focus: 'Shoulders & Chest', type: 'Push' },
  { key: 'Day 5', name: 'Pull B', focus: 'Back Width', type: 'Pull' },
  { key: 'Day 6', name: 'Legs B', focus: 'Hamstrings & Posterior', type: 'Legs' },
];
