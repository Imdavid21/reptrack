export interface Exercise {
  name: string;
  category: 'warmup' | 'primary' | 'accessory';
  targetWeight: string;
  targetReps: string;
  notes?: string;
  restSeconds?: number;
  rir?: string;
}

export interface WorkoutDay {
  name: string;
  focus: string;
  bias?: 'heavy' | 'volume';
  exercises: Exercise[];
}

export interface WorkoutRoutine {
  routineName: string;
  phase?: number;
  weeks?: string;
  days: Record<string, WorkoutDay>;
}

// ==================== PHASE 1: WEEKS 1-4 ====================
// Goal: Neural Adaptation + Form Mastery
export const phase1Routine: WorkoutRoutine = {
  routineName: "Phase 1: Neural Adaptation",
  phase: 1,
  weeks: "Weeks 1-4",
  days: {
    "Day 1": {
      name: "Push A",
      focus: "Strength — Chest & Shoulders",
      bias: "heavy",
      exercises: [
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15", notes: "Hands on bench, SLOW" },
        { name: "Cable Flyes", category: "warmup", targetWeight: "light", targetReps: "2x20", notes: "Feel the stretch" },
        { name: "Incline Barbell Bench Press", category: "primary", targetWeight: "50kg", targetReps: "4x4-6", notes: "Tempo: 3-0-X-0", restSeconds: 180, rir: "2-3" },
        { name: "Flat Dumbbell Bench Press", category: "primary", targetWeight: "14kg", targetReps: "3x6-8", notes: "Deep stretch at bottom", restSeconds: 180, rir: "2-3" },
        { name: "Overhead Press", category: "primary", targetWeight: "30kg", targetReps: "4x4-6", restSeconds: 180, rir: "2-3" },
        { name: "Dumbbell Shoulder Press", category: "accessory", targetWeight: "10kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "5kg", targetReps: "3x10-12", restSeconds: 120, rir: "1-2" },
        { name: "Close Grip Bench Press", category: "accessory", targetWeight: "35kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Tricep Pushdown", category: "accessory", targetWeight: "20kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
      ],
    },
    "Day 2": {
      name: "Pull A",
      focus: "Strength — Back & Deadlift",
      bias: "heavy",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "40kg", targetReps: "2x8" },
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "50kg", targetReps: "2x5" },
        { name: "Conventional Deadlift", category: "primary", targetWeight: "60kg", targetReps: "5x3-5", notes: "Max recruitment", restSeconds: 180, rir: "2-3" },
        { name: "Pull-ups", category: "primary", targetWeight: "BW", targetReps: "5x4-6", notes: "Strict + negatives", restSeconds: 180, rir: "2-3" },
        { name: "Barbell Row", category: "primary", targetWeight: "50kg", targetReps: "4x4-6", restSeconds: 180, rir: "2-3" },
        { name: "Seated Cable Row", category: "accessory", targetWeight: "40kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Face Pulls", category: "accessory", targetWeight: "15kg", targetReps: "4x10-12", restSeconds: 120, rir: "1-2" },
        { name: "Barbell Curl", category: "accessory", targetWeight: "20kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Hammer Curls", category: "accessory", targetWeight: "10kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
      ],
    },
    "Day 3": {
      name: "Legs A",
      focus: "Strength — Quads & Power",
      bias: "heavy",
      exercises: [
        { name: "Bodyweight Squats", category: "warmup", targetWeight: "BW", targetReps: "2x20" },
        { name: "Goblet Squats", category: "warmup", targetWeight: "10kg", targetReps: "2x12" },
        { name: "Leg Press", category: "primary", targetWeight: "100kg", targetReps: "5x4-6", notes: "Full depth, power drive", restSeconds: 180, rir: "2-3" },
        { name: "Goblet Squats", category: "primary", targetWeight: "16kg", targetReps: "4x6-8", restSeconds: 180, rir: "2-3" },
        { name: "Bulgarian Split Squat", category: "primary", targetWeight: "10kg", targetReps: "3x6-8 each", restSeconds: 180, rir: "2-3" },
        { name: "Leg Extension", category: "accessory", targetWeight: "30kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
        { name: "Standing Calf Raise", category: "accessory", targetWeight: "BW", targetReps: "4x10-12", restSeconds: 120, rir: "1-2" },
        { name: "Wall Sit", category: "accessory", targetWeight: "BW", targetReps: "2x45s", restSeconds: 60, rir: "0-1" },
      ],
    },
    "Day 4": {
      name: "Push B",
      focus: "Hypertrophy — Pump & Time Under Tension",
      bias: "volume",
      exercises: [
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Cable Flyes", category: "warmup", targetWeight: "light", targetReps: "2x20" },
        { name: "Incline Dumbbell Press", category: "primary", targetWeight: "12kg", targetReps: "4x10-12", notes: "Slow eccentric 3s", restSeconds: 90, rir: "1-2" },
        { name: "Cable Crossover", category: "primary", targetWeight: "10kg", targetReps: "3x12-15", notes: "Squeeze 2s at top", restSeconds: 90, rir: "1-2" },
        { name: "Arnold Press", category: "primary", targetWeight: "10kg", targetReps: "3x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "6kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Bent Over Rear Delt Flyes", category: "accessory", targetWeight: "5kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Dips", category: "accessory", targetWeight: "BW", targetReps: "3x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Overhead Cable Tricep Extension", category: "accessory", targetWeight: "15kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Push-ups", category: "accessory", targetWeight: "BW", targetReps: "2xAMRAP", notes: "Finisher", restSeconds: 60, rir: "0-1" },
      ],
    },
    "Day 5": {
      name: "Pull B",
      focus: "Hypertrophy — Width & Arms",
      bias: "volume",
      exercises: [
        { name: "Lat Pulldown", category: "primary", targetWeight: "45kg", targetReps: "4x10-12", notes: "Wide grip, squeeze lats", restSeconds: 90, rir: "1-2" },
        { name: "Single Arm Dumbbell Row", category: "primary", targetWeight: "14kg", targetReps: "3x10-12 each", restSeconds: 90, rir: "1-2" },
        { name: "Straight Arm Pulldown", category: "primary", targetWeight: "20kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Face Pulls", category: "accessory", targetWeight: "15kg", targetReps: "3x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "EZ Bar Preacher Curls", category: "accessory", targetWeight: "15kg", targetReps: "4x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Concentration Curls", category: "accessory", targetWeight: "8kg", targetReps: "3x15-20 each", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Cable Curl", category: "accessory", targetWeight: "15kg", targetReps: "2x21", notes: "21s protocol", restSeconds: 60, rir: "0-1" },
      ],
    },
    "Day 6": {
      name: "Legs B",
      focus: "Hypertrophy — Hamstrings & Glutes",
      bias: "volume",
      exercises: [
        { name: "Glute Bridge", category: "warmup", targetWeight: "BW", targetReps: "2x25" },
        { name: "Romanian Deadlift", category: "warmup", targetWeight: "20kg", targetReps: "2x12" },
        { name: "Romanian Deadlift", category: "primary", targetWeight: "50kg", targetReps: "4x10-12", notes: "Stretch hamstrings", restSeconds: 90, rir: "1-2" },
        { name: "Leg Press", category: "primary", targetWeight: "100kg", targetReps: "4x12-15", notes: "High + wide foot", restSeconds: 90, rir: "1-2" },
        { name: "Walking Lunges", category: "primary", targetWeight: "10kg", targetReps: "3x12-15 each", restSeconds: 90, rir: "1-2" },
        { name: "Leg Curl", category: "accessory", targetWeight: "30kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Hip Thrust", category: "accessory", targetWeight: "40kg", targetReps: "4x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Seated Calf Raise", category: "accessory", targetWeight: "20kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Good Mornings", category: "accessory", targetWeight: "20kg", targetReps: "2x12-15", restSeconds: 90, rir: "1-2" },
      ],
    },
  },
};

// ==================== PHASE 2: WEEKS 5-8 ====================
// Goal: Hypertrophy + Strength Foundation
export const phase2Routine: WorkoutRoutine = {
  routineName: "Phase 2: Hypertrophy",
  phase: 2,
  weeks: "Weeks 5-8",
  days: {
    "Day 1": {
      name: "Push A",
      focus: "Strength — Chest & Shoulders",
      bias: "heavy",
      exercises: [
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Cable Flyes", category: "warmup", targetWeight: "light", targetReps: "2x15" },
        { name: "Incline Barbell Bench Press", category: "primary", targetWeight: "57.5kg", targetReps: "5x4-6", notes: "+7.5kg from Phase 1", restSeconds: 180, rir: "2-3" },
        { name: "Flat Dumbbell Bench Press", category: "primary", targetWeight: "18kg", targetReps: "4x4-6", notes: "+4kg from Phase 1", restSeconds: 180, rir: "2-3" },
        { name: "Overhead Press", category: "primary", targetWeight: "37.5kg", targetReps: "4x4-6", restSeconds: 180, rir: "2-3" },
        { name: "Dumbbell Shoulder Press", category: "accessory", targetWeight: "14kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "7kg", targetReps: "4x8-10", restSeconds: 120, rir: "1-2" },
        { name: "Close Grip Bench Press", category: "accessory", targetWeight: "42.5kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Tricep Pushdown", category: "accessory", targetWeight: "25kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
      ],
    },
    "Day 2": {
      name: "Pull A",
      focus: "Strength — Back & Deadlift",
      bias: "heavy",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "50kg", targetReps: "2x5" },
        { name: "Conventional Deadlift", category: "primary", targetWeight: "80kg", targetReps: "5x3-5", notes: "+20kg from Phase 1", restSeconds: 180, rir: "2-3" },
        { name: "Pull-ups", category: "primary", targetWeight: "BW", targetReps: "5x4-6", notes: "3-4 strict + negatives", restSeconds: 180, rir: "2-3" },
        { name: "Barbell Row", category: "primary", targetWeight: "60kg", targetReps: "4x4-6", restSeconds: 180, rir: "2-3" },
        { name: "Seated Cable Row", category: "accessory", targetWeight: "50kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Face Pulls", category: "accessory", targetWeight: "20kg", targetReps: "4x10-12", restSeconds: 120, rir: "1-2" },
        { name: "Barbell Curl", category: "accessory", targetWeight: "25kg", targetReps: "4x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Hammer Curls", category: "accessory", targetWeight: "12kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
        { name: "Incline Dumbbell Curl", category: "accessory", targetWeight: "10kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
      ],
    },
    "Day 3": {
      name: "Legs A",
      focus: "Strength — Quads & Power",
      bias: "heavy",
      exercises: [
        { name: "Bodyweight Squats", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Goblet Squats", category: "warmup", targetWeight: "16kg", targetReps: "2x10" },
        { name: "Barbell Squat", category: "primary", targetWeight: "60kg", targetReps: "5x4-6", notes: "Introduce barbell squat", restSeconds: 180, rir: "2-3" },
        { name: "Leg Press", category: "primary", targetWeight: "130kg", targetReps: "4x4-6", notes: "+30kg from Phase 1", restSeconds: 180, rir: "2-3" },
        { name: "Bulgarian Split Squat", category: "primary", targetWeight: "14kg", targetReps: "3x6-8 each", restSeconds: 180, rir: "2-3" },
        { name: "Leg Extension", category: "accessory", targetWeight: "40kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
        { name: "Standing Calf Raise", category: "accessory", targetWeight: "+20kg", targetReps: "4x10-12", restSeconds: 120, rir: "1-2" },
      ],
    },
    "Day 4": {
      name: "Push B",
      focus: "Hypertrophy — Pump & Metabolic Stress",
      bias: "volume",
      exercises: [
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Incline Dumbbell Press", category: "primary", targetWeight: "16kg", targetReps: "4x10-12", notes: "3s eccentric", restSeconds: 90, rir: "1-2" },
        { name: "Cable Crossover", category: "primary", targetWeight: "12kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Arnold Press", category: "primary", targetWeight: "12kg", targetReps: "3x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Flat Barbell Bench Press", category: "primary", targetWeight: "55kg", targetReps: "3x10-12", notes: "Add flat bench volume", restSeconds: 90, rir: "1-2" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "8kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Bent Over Rear Delt Flyes", category: "accessory", targetWeight: "7kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Dips", category: "accessory", targetWeight: "BW", targetReps: "4x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Skull Crushers", category: "accessory", targetWeight: "20kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
      ],
    },
    "Day 5": {
      name: "Pull B",
      focus: "Hypertrophy — Width & Arms",
      bias: "volume",
      exercises: [
        { name: "Lat Pulldown", category: "primary", targetWeight: "55kg", targetReps: "4x10-12", notes: "Wide grip", restSeconds: 90, rir: "1-2" },
        { name: "T-Bar Row", category: "primary", targetWeight: "40kg", targetReps: "3x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Single Arm Dumbbell Row", category: "primary", targetWeight: "18kg", targetReps: "3x10-12 each", restSeconds: 90, rir: "1-2" },
        { name: "Straight Arm Pulldown", category: "accessory", targetWeight: "25kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Face Pulls", category: "accessory", targetWeight: "17.5kg", targetReps: "3x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "EZ Bar Preacher Curls", category: "accessory", targetWeight: "20kg", targetReps: "4x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Concentration Curls", category: "accessory", targetWeight: "10kg", targetReps: "3x15-20 each", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
      ],
    },
    "Day 6": {
      name: "Legs B",
      focus: "Hypertrophy — Hamstrings & Glutes",
      bias: "volume",
      exercises: [
        { name: "Glute Bridge", category: "warmup", targetWeight: "BW", targetReps: "2x20" },
        { name: "Romanian Deadlift", category: "warmup", targetWeight: "30kg", targetReps: "2x10" },
        { name: "Romanian Deadlift", category: "primary", targetWeight: "70kg", targetReps: "4x10-12", notes: "+20kg from Phase 1", restSeconds: 90, rir: "1-2" },
        { name: "Leg Press", category: "primary", targetWeight: "130kg", targetReps: "4x12-15", notes: "High + wide", restSeconds: 90, rir: "1-2" },
        { name: "Walking Lunges", category: "primary", targetWeight: "14kg", targetReps: "3x12-15 each", restSeconds: 90, rir: "1-2" },
        { name: "Leg Curl", category: "accessory", targetWeight: "40kg", targetReps: "4x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Hip Thrust", category: "accessory", targetWeight: "60kg", targetReps: "4x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Seated Calf Raise", category: "accessory", targetWeight: "30kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Good Mornings", category: "accessory", targetWeight: "30kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
      ],
    },
  },
};

// ==================== PHASE 3: WEEKS 9-12 ====================
// Goal: Strength Peak + Advanced Techniques
export const phase3Routine: WorkoutRoutine = {
  routineName: "Phase 3: Strength Peak",
  phase: 3,
  weeks: "Weeks 9-12",
  days: {
    "Day 1": {
      name: "Push A",
      focus: "Strength — Peak Power",
      bias: "heavy",
      exercises: [
        { name: "Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Incline Barbell Bench Press", category: "primary", targetWeight: "65kg", targetReps: "5x3-5", notes: "Strength peak", restSeconds: 180, rir: "2-3" },
        { name: "Flat Barbell Bench Press", category: "primary", targetWeight: "60kg", targetReps: "4x4-6", restSeconds: 180, rir: "2-3" },
        { name: "Overhead Press", category: "primary", targetWeight: "45kg", targetReps: "4x4-6", restSeconds: 180, rir: "2-3" },
        { name: "Incline Dumbbell Press", category: "accessory", targetWeight: "20kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "9kg", targetReps: "4x8-10", restSeconds: 120, rir: "1-2" },
        { name: "Close Grip Bench Press", category: "accessory", targetWeight: "50kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Tricep Pushdown", category: "accessory", targetWeight: "30kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
      ],
    },
    "Day 2": {
      name: "Pull A",
      focus: "Strength — Heavy Pulls",
      bias: "heavy",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "60kg", targetReps: "2x5" },
        { name: "Conventional Deadlift", category: "primary", targetWeight: "100kg", targetReps: "5x3", notes: "Heavy singles prep", restSeconds: 180, rir: "2-3" },
        { name: "Pull-ups", category: "primary", targetWeight: "+5kg", targetReps: "5x4-6", notes: "Weighted", restSeconds: 180, rir: "2-3" },
        { name: "Barbell Row", category: "primary", targetWeight: "70kg", targetReps: "4x4-6", restSeconds: 180, rir: "2-3" },
        { name: "Seated Cable Row", category: "accessory", targetWeight: "60kg", targetReps: "3x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Face Pulls", category: "accessory", targetWeight: "22.5kg", targetReps: "4x10-12", restSeconds: 120, rir: "1-2" },
        { name: "Barbell Curl", category: "accessory", targetWeight: "30kg", targetReps: "4x6-8", restSeconds: 120, rir: "2-3" },
        { name: "Hammer Curls", category: "accessory", targetWeight: "14kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
      ],
    },
    "Day 3": {
      name: "Legs A",
      focus: "Strength — Max Effort Legs",
      bias: "heavy",
      exercises: [
        { name: "Goblet Squats", category: "warmup", targetWeight: "16kg", targetReps: "2x10" },
        { name: "Barbell Squat", category: "primary", targetWeight: "80kg", targetReps: "5x3-5", notes: "Strength peak", restSeconds: 180, rir: "2-3" },
        { name: "Leg Press", category: "primary", targetWeight: "160kg", targetReps: "4x4-6", restSeconds: 180, rir: "2-3" },
        { name: "Bulgarian Split Squat", category: "primary", targetWeight: "18kg", targetReps: "3x6-8 each", restSeconds: 180, rir: "2-3" },
        { name: "Leg Extension", category: "accessory", targetWeight: "50kg", targetReps: "3x8-10", restSeconds: 120, rir: "1-2" },
        { name: "Standing Calf Raise", category: "accessory", targetWeight: "+30kg", targetReps: "5x10-12", restSeconds: 120, rir: "1-2" },
      ],
    },
    "Day 4": {
      name: "Push B",
      focus: "Hypertrophy — Metabolic Overload",
      bias: "volume",
      exercises: [
        { name: "Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Incline Dumbbell Press", category: "primary", targetWeight: "22kg", targetReps: "4x10-12", notes: "3s eccentric", restSeconds: 90, rir: "1-2" },
        { name: "Cable Crossover", category: "primary", targetWeight: "17.5kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Dumbbell Bench Press", category: "primary", targetWeight: "22kg", targetReps: "3x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Arnold Press", category: "primary", targetWeight: "14kg", targetReps: "3x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "10kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Bent Over Rear Delt Flyes", category: "accessory", targetWeight: "9kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Weighted Dips", category: "accessory", targetWeight: "+10kg", targetReps: "4x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Skull Crushers", category: "accessory", targetWeight: "25kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
      ],
    },
    "Day 5": {
      name: "Pull B",
      focus: "Hypertrophy — Width & Arms",
      bias: "volume",
      exercises: [
        { name: "Lat Pulldown", category: "primary", targetWeight: "65kg", targetReps: "4x10-12", notes: "Wide grip", restSeconds: 90, rir: "1-2" },
        { name: "T-Bar Row", category: "primary", targetWeight: "55kg", targetReps: "4x10-12", restSeconds: 90, rir: "1-2" },
        { name: "Single Arm Dumbbell Row", category: "primary", targetWeight: "24kg", targetReps: "3x10-12 each", restSeconds: 90, rir: "1-2" },
        { name: "Straight Arm Pulldown", category: "accessory", targetWeight: "30kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Face Pulls", category: "accessory", targetWeight: "20kg", targetReps: "3x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "EZ Bar Preacher Curls", category: "accessory", targetWeight: "25kg", targetReps: "4x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Incline Dumbbell Curl", category: "accessory", targetWeight: "12kg", targetReps: "3x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
      ],
    },
    "Day 6": {
      name: "Legs B",
      focus: "Hypertrophy — Hamstrings & Glutes",
      bias: "volume",
      exercises: [
        { name: "Glute Bridge", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Romanian Deadlift", category: "primary", targetWeight: "90kg", targetReps: "4x10-12", notes: "Heavy RDLs", restSeconds: 90, rir: "1-2" },
        { name: "Leg Press", category: "primary", targetWeight: "160kg", targetReps: "4x12-15", notes: "High + wide", restSeconds: 90, rir: "1-2" },
        { name: "Walking Lunges", category: "primary", targetWeight: "20kg", targetReps: "3x12-15 each", restSeconds: 90, rir: "1-2" },
        { name: "Leg Curl", category: "accessory", targetWeight: "50kg", targetReps: "4x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Hip Thrust", category: "accessory", targetWeight: "80kg", targetReps: "4x12-15", restSeconds: 90, rir: "1-2" },
        { name: "Seated Calf Raise", category: "accessory", targetWeight: "40kg", targetReps: "4x15-20", restSeconds: 60, rir: "0-1", notes: "Last set to failure" },
        { name: "Good Mornings", category: "accessory", targetWeight: "40kg", targetReps: "3x12-15", restSeconds: 90, rir: "1-2" },
      ],
    },
  },
};

// All available routines
export const allRoutines: WorkoutRoutine[] = [phase1Routine, phase2Routine, phase3Routine];

// Default to Phase 1
export const defaultRoutine = phase1Routine;

// Get routine by phase number
export function getRoutineByPhase(phase: number): WorkoutRoutine | undefined {
  return allRoutines.find(r => r.phase === phase);
}

export function getDayNumber(date: Date, startDate: Date): number {
  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return (daysDiff % 6) + 1;
}

export function getWeekNumber(date: Date, startDate: Date): number {
  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(daysDiff / 6) + 1;
}
