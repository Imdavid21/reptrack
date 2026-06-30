export type ExerciseType = 'weighted' | 'bodyweight' | 'weighted_bw' | 'timed';

export interface ExerciseOption {
  name: string;
  category: 'primary' | 'accessory';
  defaultWeight: string;
  defaultReps: string;
  muscleGroup: string;
  exerciseType?: ExerciseType;
}

export const exerciseLibrary: Record<string, ExerciseOption[]> = {
  'Push': [
    // ─── Primary Chest ───────────────────────────────────────────────────────
    { name: 'Barbell Bench Press', category: 'primary', defaultWeight: '60kg', defaultReps: '4x6-8', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Flat Barbell Bench Press', category: 'primary', defaultWeight: '60kg', defaultReps: '4x6-8', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Incline Barbell Bench Press', category: 'primary', defaultWeight: '55kg', defaultReps: '4x8-10', muscleGroup: 'Upper Chest', exerciseType: 'weighted' },
    { name: 'Decline Barbell Bench Press', category: 'primary', defaultWeight: '60kg', defaultReps: '4x8-10', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Dumbbell Bench Press', category: 'primary', defaultWeight: '20kg', defaultReps: '4x8-10', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Incline Dumbbell Press', category: 'primary', defaultWeight: '28kg', defaultReps: '4x8-10', muscleGroup: 'Upper Chest', exerciseType: 'weighted' },
    { name: 'Decline Dumbbell Press', category: 'primary', defaultWeight: '24kg', defaultReps: '4x8-10', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Smith Machine Bench Press', category: 'primary', defaultWeight: '50kg', defaultReps: '4x8-10', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Smith Machine Incline Press', category: 'primary', defaultWeight: '40kg', defaultReps: '4x8-10', muscleGroup: 'Upper Chest', exerciseType: 'weighted' },
    { name: 'Machine Chest Press', category: 'primary', defaultWeight: '50kg', defaultReps: '3x10-12', muscleGroup: 'Chest', exerciseType: 'weighted' },
    // ─── Chest Accessories ────────────────────────────────────────────────────
    { name: 'Cable Flyes', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Cable Crossover', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Incline Dumbbell Flyes', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Upper Chest', exerciseType: 'weighted' },
    { name: 'Flat Dumbbell Flyes', category: 'accessory', defaultWeight: '14kg', defaultReps: '3x10-12', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Pec Deck', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x12-15', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Chest Fly', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Close Grip Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-15', muscleGroup: 'Chest/Triceps', exerciseType: 'bodyweight' },
    { name: 'Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3xAMRAP', muscleGroup: 'Chest', exerciseType: 'bodyweight' },
    { name: 'Incline Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Chest', exerciseType: 'bodyweight' },
    { name: 'Decline Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-15', muscleGroup: 'Upper Chest', exerciseType: 'bodyweight' },
    { name: 'Diamond Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-15', muscleGroup: 'Chest/Triceps', exerciseType: 'bodyweight' },
    { name: 'Dips', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-12', muscleGroup: 'Chest/Triceps', exerciseType: 'bodyweight' },
    { name: 'Weighted Dips', category: 'primary', defaultWeight: '+10kg', defaultReps: '3x8-10', muscleGroup: 'Chest/Triceps', exerciseType: 'weighted_bw' },
    // ─── Primary Shoulders ───────────────────────────────────────────────────
    { name: 'Overhead Press', category: 'primary', defaultWeight: '40kg', defaultReps: '4x6-8', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Dumbbell Shoulder Press', category: 'primary', defaultWeight: '22kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Seated Dumbbell Shoulder Press', category: 'primary', defaultWeight: '22kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Machine Shoulder Press', category: 'primary', defaultWeight: '40kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Smith Machine Overhead Press', category: 'primary', defaultWeight: '35kg', defaultReps: '4x8-10', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Arnold Press', category: 'accessory', defaultWeight: '16kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Landmine Press', category: 'primary', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    // ─── Shoulder Accessories ─────────────────────────────────────────────────
    { name: 'Lateral Raises', category: 'accessory', defaultWeight: '10kg', defaultReps: '4x12-15', muscleGroup: 'Side Delts', exerciseType: 'weighted' },
    { name: 'Cable Lateral Raise', category: 'accessory', defaultWeight: '7.5kg', defaultReps: '4x12-15', muscleGroup: 'Side Delts', exerciseType: 'weighted' },
    { name: 'Machine Lateral Raise', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x12-15', muscleGroup: 'Side Delts', exerciseType: 'weighted' },
    { name: 'Front Raises', category: 'accessory', defaultWeight: '8kg', defaultReps: '3x12-15', muscleGroup: 'Front Delts', exerciseType: 'weighted' },
    { name: 'Cable Front Raise', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x12-15', muscleGroup: 'Front Delts', exerciseType: 'weighted' },
    { name: 'Bent Over Rear Delt Flyes', category: 'accessory', defaultWeight: '8kg', defaultReps: '4x12-15', muscleGroup: 'Rear Delts', exerciseType: 'weighted' },
    { name: 'Rear Delt Fly + Lat Raise', category: 'accessory', defaultWeight: '7kg', defaultReps: '3x12-15', muscleGroup: 'Rear Delts/Side Delts', exerciseType: 'weighted' },
    { name: 'Reverse Pec Deck', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x12-15', muscleGroup: 'Rear Delts', exerciseType: 'weighted' },
    { name: 'Upright Row', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Dumbbell Upright Row', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    // ─── Triceps ──────────────────────────────────────────────────────────────
    { name: 'Tricep Pushdown', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x12-15', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Rope Pushdown', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Overhead Tricep Extension', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Overhead Cable Tricep Extension', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Cable Rope Overhead Tricep Extension', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Dumbbell Overhead Extension', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x10-12', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Skull Crushers', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x10-12', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Close Grip Bench Press', category: 'accessory', defaultWeight: '50kg', defaultReps: '3x8-10', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Tricep Kickback', category: 'accessory', defaultWeight: '8kg', defaultReps: '3x12-15', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Tricep Dips', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-12', muscleGroup: 'Triceps', exerciseType: 'bodyweight' },
    { name: 'Bench Tricep Dips', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12-15', muscleGroup: 'Triceps', exerciseType: 'bodyweight' },
    { name: 'JM Press', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x8-10', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    // ─── Added: Chest ─────────────────────────────────────────────────────────
    { name: 'Floor Press', category: 'primary', defaultWeight: '50kg', defaultReps: '4x6-8', muscleGroup: 'Chest/Triceps', exerciseType: 'weighted' },
    { name: 'Larsen Press', category: 'primary', defaultWeight: '50kg', defaultReps: '4x6-8', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Spoto Press', category: 'primary', defaultWeight: '50kg', defaultReps: '4x5', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Machine Dip', category: 'primary', defaultWeight: '60kg', defaultReps: '3x10-12', muscleGroup: 'Chest/Triceps', exerciseType: 'weighted' },
    { name: 'Low-to-High Cable Fly', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x12-15', muscleGroup: 'Upper Chest', exerciseType: 'weighted' },
    { name: 'High-to-Low Cable Fly', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x12-15', muscleGroup: 'Chest', exerciseType: 'weighted' },
    { name: 'Deficit Push-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12-15', muscleGroup: 'Chest', exerciseType: 'bodyweight' },
    // ─── Added: Shoulders ─────────────────────────────────────────────────────
    { name: 'Z Press', category: 'primary', defaultWeight: '30kg', defaultReps: '3x8-10', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Behind the Neck Press', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x8-10', muscleGroup: 'Shoulders', exerciseType: 'weighted' },
    { name: 'Cable Y-Raise', category: 'accessory', defaultWeight: '7.5kg', defaultReps: '3x12-15', muscleGroup: 'Rear Delts', exerciseType: 'weighted' },
    { name: 'Plate Front Raise', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x12-15', muscleGroup: 'Front Delts', exerciseType: 'weighted' },
    { name: 'Lu Raises', category: 'accessory', defaultWeight: '5kg', defaultReps: '3x12-15', muscleGroup: 'Side Delts', exerciseType: 'weighted' },
    // ─── Added: Triceps ───────────────────────────────────────────────────────
    { name: 'Tate Press', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'California Press', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x8-10', muscleGroup: 'Triceps', exerciseType: 'weighted' },
    { name: 'Single Arm Tricep Pushdown', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x12-15', muscleGroup: 'Triceps', exerciseType: 'weighted' },
  ],
  'Pull': [
    // ─── Primary Back ─────────────────────────────────────────────────────────
    { name: 'Pull-ups', category: 'primary', defaultWeight: 'BW', defaultReps: '4xAMRAP', muscleGroup: 'Lats', exerciseType: 'bodyweight' },
    { name: 'Weighted Pull-ups', category: 'primary', defaultWeight: '+10kg', defaultReps: '4x6-8', muscleGroup: 'Lats', exerciseType: 'weighted_bw' },
    { name: 'Chin-ups', category: 'primary', defaultWeight: 'BW', defaultReps: '3x8-10', muscleGroup: 'Back/Biceps', exerciseType: 'bodyweight' },
    { name: 'Weighted Chin-ups', category: 'primary', defaultWeight: '+10kg', defaultReps: '3x6-8', muscleGroup: 'Back/Biceps', exerciseType: 'weighted_bw' },
    { name: 'Negative Pull-ups', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x5', muscleGroup: 'Lats', exerciseType: 'bodyweight' },
    { name: 'Conventional Deadlift', category: 'primary', defaultWeight: '100kg', defaultReps: '4x5', muscleGroup: 'Posterior Chain', exerciseType: 'weighted' },
    { name: 'Sumo Deadlift', category: 'primary', defaultWeight: '100kg', defaultReps: '4x5', muscleGroup: 'Posterior Chain', exerciseType: 'weighted' },
    { name: 'Deadlift Technique Work', category: 'primary', defaultWeight: '60kg', defaultReps: '5x8', muscleGroup: 'Posterior Chain', exerciseType: 'weighted' },
    { name: 'Rack Pulls', category: 'primary', defaultWeight: '100kg', defaultReps: '3x5', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Barbell Row', category: 'primary', defaultWeight: '60kg', defaultReps: '4x6-8', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Pendlay Row', category: 'primary', defaultWeight: '60kg', defaultReps: '4x5', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'T-Bar Row', category: 'primary', defaultWeight: '50kg', defaultReps: '4x8-10', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Lat Pulldown', category: 'primary', defaultWeight: '55kg', defaultReps: '3x10-12', muscleGroup: 'Lats', exerciseType: 'weighted' },
    { name: 'Wide Grip Lat Pulldown', category: 'primary', defaultWeight: '50kg', defaultReps: '3x10-12', muscleGroup: 'Lats', exerciseType: 'weighted' },
    { name: 'Close Grip Pulldown', category: 'primary', defaultWeight: '40kg', defaultReps: '3x10-12', muscleGroup: 'Lats', exerciseType: 'weighted' },
    { name: 'Reverse Grip Pulldown', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x10-12', muscleGroup: 'Lats', exerciseType: 'weighted' },
    // ─── Back Accessories ─────────────────────────────────────────────────────
    { name: 'Seated Cable Row', category: 'accessory', defaultWeight: '50kg', defaultReps: '3x10-12', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Single Arm Dumbbell Row', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x10-12', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Chest Supported Row', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Meadows Row', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Straight Arm Pulldown', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x12-15', muscleGroup: 'Lats', exerciseType: 'weighted' },
    { name: 'Face Pulls', category: 'accessory', defaultWeight: '20kg', defaultReps: '4x15-20', muscleGroup: 'Rear Delts', exerciseType: 'weighted' },
    { name: 'Reverse Flyes', category: 'accessory', defaultWeight: '10kg', defaultReps: '4x12-15', muscleGroup: 'Rear Delts', exerciseType: 'weighted' },
    { name: 'Lever Seated Row Machine', category: 'primary', defaultWeight: '30kg', defaultReps: '3x10-12', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Plate Loaded Row', category: 'primary', defaultWeight: '40kg', defaultReps: '3x10-12', muscleGroup: 'Back', exerciseType: 'weighted' },
    // ─── Traps ────────────────────────────────────────────────────────────────
    { name: 'Barbell Shrugs', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x12-15', muscleGroup: 'Traps', exerciseType: 'weighted' },
    { name: 'Dumbbell Shrugs', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Traps', exerciseType: 'weighted' },
    { name: 'Smith Machine Shrugs', category: 'accessory', defaultWeight: '50kg', defaultReps: '3x12-15', muscleGroup: 'Traps', exerciseType: 'weighted' },
    { name: 'Cable Shrugs', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x12-15', muscleGroup: 'Traps', exerciseType: 'weighted' },
    // ─── Biceps ───────────────────────────────────────────────────────────────
    { name: 'Barbell Curl', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'EZ Bar Curl', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Dumbbell Curl', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Hammer Curls', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x12-15', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Incline Dumbbell Curl', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Cable Curl', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'EZ Bar Preacher Curls', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Machine Preacher Curl', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Concentration Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Spider Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Cross Body Hammer Curl', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Bayesian Curl', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x12-15', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    // ─── Forearms ─────────────────────────────────────────────────────────────
    { name: 'Reverse Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x12-15', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Barbell Reverse Curls', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Dumbbell Reverse Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x12-15', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'EZ Bar Reverse Curls', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Cable Reverse Curls', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Wrist Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x15-20', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Reverse Wrist Curls', category: 'accessory', defaultWeight: '5kg', defaultReps: '3x15-20', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Dumbbell Wrist Curls', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x15-20', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Behind-the-Back Wrist Curls', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x15-20', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Zottman Curls', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Forearms', exerciseType: 'weighted' },
    { name: 'Farmer Walks', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x30', muscleGroup: 'Forearms', exerciseType: 'timed' },
    // ─── Lower Back ───────────────────────────────────────────────────────────
    { name: 'Back Extension 90 Degree', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Lower Back', exerciseType: 'bodyweight' },
    { name: 'Back Extension', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Lower Back', exerciseType: 'bodyweight' },
    { name: 'Hyperextension', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12-15', muscleGroup: 'Lower Back', exerciseType: 'bodyweight' },
    // ─── Added: Back & Deadlift variations ────────────────────────────────────
    { name: 'Trap Bar Deadlift', category: 'primary', defaultWeight: '100kg', defaultReps: '4x5', muscleGroup: 'Posterior Chain', exerciseType: 'weighted' },
    { name: 'Deficit Deadlift', category: 'primary', defaultWeight: '90kg', defaultReps: '4x5', muscleGroup: 'Posterior Chain', exerciseType: 'weighted' },
    { name: 'Snatch Grip Deadlift', category: 'primary', defaultWeight: '80kg', defaultReps: '4x5', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Seal Row', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x10-12', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Kroc Row', category: 'accessory', defaultWeight: '35kg', defaultReps: '3x12-15', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Inverted Row', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-15', muscleGroup: 'Back', exerciseType: 'bodyweight' },
    { name: 'Machine Row', category: 'primary', defaultWeight: '40kg', defaultReps: '3x10-12', muscleGroup: 'Back', exerciseType: 'weighted' },
    { name: 'Neutral Grip Pulldown', category: 'primary', defaultWeight: '50kg', defaultReps: '3x10-12', muscleGroup: 'Lats', exerciseType: 'weighted' },
    { name: 'Dumbbell Pullover', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Lats', exerciseType: 'weighted' },
    { name: 'Cable Pullover', category: 'accessory', defaultWeight: '25kg', defaultReps: '3x12-15', muscleGroup: 'Lats', exerciseType: 'weighted' },
    // ─── Added: Biceps ────────────────────────────────────────────────────────
    { name: 'Drag Curl', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Preacher Hammer Curl', category: 'accessory', defaultWeight: '12kg', defaultReps: '3x10-12', muscleGroup: 'Biceps', exerciseType: 'weighted' },
    { name: 'Cable Hammer Curl', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Biceps', exerciseType: 'weighted' },
  ],
  'Legs': [
    // ─── Primary Quads ────────────────────────────────────────────────────────
    { name: 'Barbell Squat', category: 'primary', defaultWeight: '80kg', defaultReps: '4x6-8', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Front Squat', category: 'primary', defaultWeight: '60kg', defaultReps: '3x8-10', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Bodyweight Squats', category: 'primary', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Quads', exerciseType: 'bodyweight' },
    { name: 'Goblet Squats', category: 'primary', defaultWeight: '20kg', defaultReps: '3x12-15', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Leg Press', category: 'primary', defaultWeight: '150kg', defaultReps: '3x10-12', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Hack Squat', category: 'primary', defaultWeight: '80kg', defaultReps: '3x10-12', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Smith Machine Squat', category: 'primary', defaultWeight: '60kg', defaultReps: '3x10-12', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Box Squat', category: 'primary', defaultWeight: '70kg', defaultReps: '4x5', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Pendulum Squat', category: 'primary', defaultWeight: '60kg', defaultReps: '3x10-12', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Bulgarian Split Squat', category: 'primary', defaultWeight: '20kg', defaultReps: '3x10 each', muscleGroup: 'Quads/Glutes', exerciseType: 'weighted' },
    // ─── Primary Posterior ────────────────────────────────────────────────────
    { name: 'Romanian Deadlift', category: 'primary', defaultWeight: '70kg', defaultReps: '3x8-10', muscleGroup: 'Hamstrings', exerciseType: 'weighted' },
    { name: 'Dumbbell Romanian Deadlift', category: 'primary', defaultWeight: '20kg', defaultReps: '3x10-12', muscleGroup: 'Hamstrings', exerciseType: 'weighted' },
    { name: 'Stiff Leg Deadlift', category: 'primary', defaultWeight: '70kg', defaultReps: '3x8-10', muscleGroup: 'Hamstrings', exerciseType: 'weighted' },
    { name: 'Hip Thrust', category: 'primary', defaultWeight: '80kg', defaultReps: '3x10-12', muscleGroup: 'Glutes', exerciseType: 'weighted' },
    { name: 'Barbell Hip Thrust', category: 'primary', defaultWeight: '80kg', defaultReps: '3x10-12', muscleGroup: 'Glutes', exerciseType: 'weighted' },
    // ─── Quad Accessories ─────────────────────────────────────────────────────
    { name: 'Walking Lunges', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x12 each', muscleGroup: 'Quads/Glutes', exerciseType: 'weighted' },
    { name: 'Reverse Lunges', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x10 each', muscleGroup: 'Quads/Glutes', exerciseType: 'weighted' },
    { name: 'Step Ups', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x10 each', muscleGroup: 'Quads/Glutes', exerciseType: 'weighted' },
    { name: 'Leg Extension', category: 'accessory', defaultWeight: '45kg', defaultReps: '3x12-15', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Sissy Squats', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-15', muscleGroup: 'Quads', exerciseType: 'bodyweight' },
    // ─── Hamstring Accessories ────────────────────────────────────────────────
    { name: 'Leg Curl', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x12-15', muscleGroup: 'Hamstrings', exerciseType: 'weighted' },
    { name: 'Seated Leg Curl', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x12-15', muscleGroup: 'Hamstrings', exerciseType: 'weighted' },
    { name: 'Lying Leg Curl', category: 'accessory', defaultWeight: '35kg', defaultReps: '3x12-15', muscleGroup: 'Hamstrings', exerciseType: 'weighted' },
    { name: 'Nordic Curls', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x6-8', muscleGroup: 'Hamstrings', exerciseType: 'bodyweight' },
    { name: 'Single Leg Romanian Deadlifts', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x10 each', muscleGroup: 'Hamstrings', exerciseType: 'weighted' },
    // ─── Glutes ───────────────────────────────────────────────────────────────
    { name: 'Glute Bridge', category: 'accessory', defaultWeight: '60kg', defaultReps: '3x12-15', muscleGroup: 'Glutes', exerciseType: 'weighted' },
    { name: 'Cable Kickback', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12-15', muscleGroup: 'Glutes', exerciseType: 'weighted' },
    { name: 'Good Mornings', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x10-12', muscleGroup: 'Hamstrings', exerciseType: 'weighted' },
    // ─── Calves ───────────────────────────────────────────────────────────────
    { name: 'Standing Calf Raise', category: 'accessory', defaultWeight: '60kg', defaultReps: '4x15-20', muscleGroup: 'Calves', exerciseType: 'weighted' },
    { name: 'Seated Calf Raise', category: 'accessory', defaultWeight: '40kg', defaultReps: '4x15-20', muscleGroup: 'Calves', exerciseType: 'weighted' },
    { name: 'Leg Press Calf Raise', category: 'accessory', defaultWeight: '100kg', defaultReps: '4x15-20', muscleGroup: 'Calves', exerciseType: 'weighted' },
    { name: 'Donkey Calf Raise', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x15-20', muscleGroup: 'Calves', exerciseType: 'weighted' },
    // ─── Timed ────────────────────────────────────────────────────────────────
    { name: 'Wall Sit', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x45', muscleGroup: 'Quads', exerciseType: 'timed' },
    { name: 'Dead Hang', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x30', muscleGroup: 'Grip/Lats', exerciseType: 'timed' },
    { name: 'Plank', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x60', muscleGroup: 'Core', exerciseType: 'timed' },
    { name: 'Side Plank', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x30', muscleGroup: 'Core', exerciseType: 'timed' },
    // ─── Core ─────────────────────────────────────────────────────────────────
    { name: 'Ab Wheel Rollout', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12-15', muscleGroup: 'Core', exerciseType: 'bodyweight' },
    { name: 'Hanging Leg Raises', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x10-15', muscleGroup: 'Core', exerciseType: 'bodyweight' },
    { name: 'Cable Crunches', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x15-20', muscleGroup: 'Core', exerciseType: 'weighted' },
    { name: 'Russian Twists', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x20', muscleGroup: 'Core', exerciseType: 'weighted' },
    { name: 'Leg Raises', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12-15', muscleGroup: 'Core', exerciseType: 'bodyweight' },
    { name: 'Crunches', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x20', muscleGroup: 'Core', exerciseType: 'bodyweight' },
    { name: 'Mountain Climbers', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x30', muscleGroup: 'Core', exerciseType: 'timed' },
    // ─── Added: Quads ─────────────────────────────────────────────────────────
    { name: 'Belt Squat', category: 'primary', defaultWeight: '80kg', defaultReps: '3x10-12', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Zercher Squat', category: 'primary', defaultWeight: '60kg', defaultReps: '3x8-10', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Cyclist Squat', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x12-15', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Heel Elevated Goblet Squat', category: 'accessory', defaultWeight: '24kg', defaultReps: '3x12-15', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'ATG Split Squat', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12 each', muscleGroup: 'Quads', exerciseType: 'bodyweight' },
    { name: 'Single Leg Press', category: 'accessory', defaultWeight: '60kg', defaultReps: '3x12 each', muscleGroup: 'Quads', exerciseType: 'weighted' },
    { name: 'Reverse Nordic', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x8-10', muscleGroup: 'Quads', exerciseType: 'bodyweight' },
    // ─── Added: Hamstrings & Glutes ───────────────────────────────────────────
    { name: 'Glute Ham Raise', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x8-10', muscleGroup: 'Hamstrings', exerciseType: 'bodyweight' },
    { name: 'Cable Pull Through', category: 'accessory', defaultWeight: '30kg', defaultReps: '3x12-15', muscleGroup: 'Glutes', exerciseType: 'weighted' },
    { name: 'Frog Pump', category: 'accessory', defaultWeight: '20kg', defaultReps: '3x15-20', muscleGroup: 'Glutes', exerciseType: 'weighted' },
    { name: 'Hip Abduction Machine', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x15-20', muscleGroup: 'Glutes', exerciseType: 'weighted' },
    { name: 'Hip Adduction Machine', category: 'accessory', defaultWeight: '40kg', defaultReps: '3x15-20', muscleGroup: 'Adductors', exerciseType: 'weighted' },
    // ─── Added: Calves & Core ─────────────────────────────────────────────────
    { name: 'Tibialis Raise', category: 'accessory', defaultWeight: '10kg', defaultReps: '3x15-20', muscleGroup: 'Calves', exerciseType: 'weighted' },
    { name: 'Pallof Press', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12 each', muscleGroup: 'Core', exerciseType: 'weighted' },
    { name: 'Cable Woodchopper', category: 'accessory', defaultWeight: '15kg', defaultReps: '3x12 each', muscleGroup: 'Core', exerciseType: 'weighted' },
    { name: 'Toes to Bar', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x8-12', muscleGroup: 'Core', exerciseType: 'bodyweight' },
    { name: 'Dragon Flag', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x6-8', muscleGroup: 'Core', exerciseType: 'bodyweight' },
    { name: 'Dead Bug', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x12 each', muscleGroup: 'Core', exerciseType: 'bodyweight' },
    { name: 'Decline Sit-up', category: 'accessory', defaultWeight: 'BW', defaultReps: '3x15-20', muscleGroup: 'Core', exerciseType: 'bodyweight' },
  ],
};

/** Infer exercise type from weight/reps strings when exerciseType is not set */
export function inferExerciseType(defaultWeight: string, defaultReps?: string): ExerciseType {
  // Timed: reps field ends with 's' explicitly (e.g. "3x45s", "60s")
  // Must have 's' suffix — "3x12" without 's' is NOT timed
  if (defaultReps && /^\d+x\d+s$/.test(defaultReps)) return 'timed';
  if (defaultReps && /^\d+s$/.test(defaultReps)) return 'timed';
  // Weighted bodyweight: "+Xkg" pattern
  if (defaultWeight.startsWith('+')) return 'weighted_bw';
  // Bodyweight: "BW" with no added weight
  if (defaultWeight === 'BW' || defaultWeight === 'bw') return 'bodyweight';
  // Default: weighted
  return 'weighted';
}

/** Look up exercise type from library, falling back to inference */
export function getExerciseType(exerciseName: string, defaultWeight?: string, defaultReps?: string): ExerciseType {
  // Search library for explicit type
  for (const category of Object.values(exerciseLibrary)) {
    const found = category.find(ex => ex.name === exerciseName);
    if (found?.exerciseType) return found.exerciseType;
  }
  // Infer from weight/reps
  return inferExerciseType(defaultWeight || '', defaultReps);
}

export const dayTemplates = [
  { key: 'Day 1', name: 'Push A', focus: 'Chest & Shoulders', type: 'Push' },
  { key: 'Day 2', name: 'Pull A', focus: 'Back & Biceps', type: 'Pull' },
  { key: 'Day 3', name: 'Legs A', focus: 'Quads & Glutes', type: 'Legs' },
  { key: 'Day 4', name: 'Push B', focus: 'Shoulders & Chest', type: 'Push' },
  { key: 'Day 5', name: 'Pull B', focus: 'Back Width', type: 'Pull' },
  { key: 'Day 6', name: 'Legs B', focus: 'Hamstrings & Posterior', type: 'Legs' },
];
