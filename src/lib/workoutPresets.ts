export interface Exercise {
  name: string;
  category: 'warmup' | 'primary' | 'accessory';
  targetWeight: string;
  targetReps: string;
  notes?: string;
}

export interface WorkoutDay {
  name: string;
  focus: string;
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
      focus: "Chest Dominance",
      exercises: [
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15", notes: "Hands on bench, SLOW" },
        { name: "Cable Flyes", category: "warmup", targetWeight: "light", targetReps: "2x20", notes: "Feel the stretch" },
        { name: "Dumbbell Bench Press", category: "warmup", targetWeight: "8kg", targetReps: "1x20", notes: "Mind-muscle connection" },
        { name: "Incline Barbell Bench Press", category: "primary", targetWeight: "50kg", targetReps: "4x8-10", notes: "Tempo: 3-0-X-0" },
        { name: "Dumbbell Bench Press", category: "primary", targetWeight: "12kg", targetReps: "3x10-12", notes: "Deep stretch at bottom" },
        { name: "Incline Dumbbell Flyes", category: "accessory", targetWeight: "8kg", targetReps: "3x12-15", notes: "Squeeze 2s at top" },
        { name: "Dumbbell Shoulder Press", category: "accessory", targetWeight: "10kg", targetReps: "3x10-12" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "5kg", targetReps: "3x15-20" },
        { name: "Overhead Cable Tricep Extension", category: "accessory", targetWeight: "15kg", targetReps: "3x12-15" },
        { name: "Tricep Pushdown", category: "accessory", targetWeight: "20kg", targetReps: "3x12-15" },
        { name: "Push-ups", category: "accessory", targetWeight: "BW", targetReps: "3xAMRAP", notes: "Finisher" },
      ],
    },
    "Day 2": {
      name: "Pull A",
      focus: "Back + Deadlift",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "40kg", targetReps: "2x8" },
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "50kg", targetReps: "2x5" },
        { name: "Conventional Deadlift", category: "primary", targetWeight: "60kg", targetReps: "4x6", notes: "Form focus" },
        { name: "Pull-ups", category: "primary", targetWeight: "BW", targetReps: "5x8", notes: "1 strict + negatives" },
        { name: "Seated Cable Row", category: "primary", targetWeight: "40kg", targetReps: "4x10-12" },
        { name: "Lat Pulldown", category: "accessory", targetWeight: "45kg", targetReps: "3x12-15" },
        { name: "Face Pulls", category: "accessory", targetWeight: "15kg", targetReps: "4x20" },
        { name: "Barbell Curl", category: "accessory", targetWeight: "20kg", targetReps: "3x10" },
        { name: "Hammer Curls", category: "accessory", targetWeight: "10kg", targetReps: "3x12-15" },
      ],
    },
    "Day 3": {
      name: "Legs A",
      focus: "Quad Focus",
      exercises: [
        { name: "Bodyweight Squats", category: "warmup", targetWeight: "BW", targetReps: "2x20" },
        { name: "Goblet Squats", category: "warmup", targetWeight: "10kg", targetReps: "2x12" },
        { name: "Leg Press", category: "primary", targetWeight: "100kg", targetReps: "4x12", notes: "Full depth" },
        { name: "Goblet Squats", category: "primary", targetWeight: "14kg", targetReps: "4x12-15" },
        { name: "Bulgarian Split Squat", category: "primary", targetWeight: "10kg", targetReps: "3x10 each" },
        { name: "Leg Extension", category: "accessory", targetWeight: "30kg", targetReps: "3x15-20" },
        { name: "Walking Lunges", category: "accessory", targetWeight: "BW", targetReps: "3x12 each" },
        { name: "Standing Calf Raise", category: "accessory", targetWeight: "BW", targetReps: "4x20" },
        { name: "Wall Sit", category: "accessory", targetWeight: "BW", targetReps: "2x45s" },
      ],
    },
    "Day 4": {
      name: "Push B",
      focus: "Shoulder Dominance",
      exercises: [
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Cable Flyes", category: "warmup", targetWeight: "light", targetReps: "2x20" },
        { name: "Overhead Press", category: "primary", targetWeight: "30kg", targetReps: "4x8" },
        { name: "Incline Dumbbell Press", category: "primary", targetWeight: "12kg", targetReps: "4x10-12" },
        { name: "Cable Flyes", category: "accessory", targetWeight: "12kg", targetReps: "3x15" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "6kg", targetReps: "4x12-15" },
        { name: "Bent Over Rear Delt Flyes", category: "accessory", targetWeight: "5kg", targetReps: "4x15-20" },
        { name: "Dips", category: "accessory", targetWeight: "BW", targetReps: "3x8-12" },
        { name: "Cable Rope Overhead Tricep Extension", category: "accessory", targetWeight: "15kg", targetReps: "3x15" },
        { name: "Close Grip Bench Press", category: "accessory", targetWeight: "30kg", targetReps: "3x12" },
        { name: "Push-ups", category: "accessory", targetWeight: "BW", targetReps: "2xAMRAP" },
      ],
    },
    "Day 5": {
      name: "Pull B",
      focus: "Width + Arms",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "40kg", targetReps: "3x8" },
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "50kg", targetReps: "2x5" },
        { name: "Weighted Pull-ups", category: "primary", targetWeight: "BW", targetReps: "5x5" },
        { name: "Barbell Row", category: "primary", targetWeight: "40kg", targetReps: "4x8-10" },
        { name: "Single Arm Dumbbell Row", category: "primary", targetWeight: "16kg", targetReps: "3x12 each" },
        { name: "Straight Arm Pulldown", category: "accessory", targetWeight: "20kg", targetReps: "3x15" },
        { name: "Face Pulls", category: "accessory", targetWeight: "15kg", targetReps: "3x20" },
        { name: "EZ Bar Preacher Curls", category: "accessory", targetWeight: "15kg", targetReps: "4x10-12" },
        { name: "Concentration Curls", category: "accessory", targetWeight: "8kg", targetReps: "4x12 each" },
        { name: "Cable Curl", category: "accessory", targetWeight: "15kg", targetReps: "2x21", notes: "21s protocol" },
      ],
    },
    "Day 6": {
      name: "Legs B",
      focus: "Posterior Chain",
      exercises: [
        { name: "Glute Bridge", category: "warmup", targetWeight: "BW", targetReps: "2x25" },
        { name: "Romanian Deadlift", category: "warmup", targetWeight: "20kg", targetReps: "2x12" },
        { name: "Romanian Deadlift", category: "primary", targetWeight: "50kg", targetReps: "4x10" },
        { name: "Leg Press", category: "primary", targetWeight: "100kg", targetReps: "4x12-15", notes: "High + wide foot" },
        { name: "Walking Lunges", category: "primary", targetWeight: "12kg", targetReps: "3x12 each" },
        { name: "Leg Curl", category: "accessory", targetWeight: "30kg", targetReps: "3x12-15" },
        { name: "Hip Thrust", category: "accessory", targetWeight: "40kg", targetReps: "4x15" },
        { name: "Seated Calf Raise", category: "accessory", targetWeight: "20kg", targetReps: "4x25" },
        { name: "Good Mornings", category: "accessory", targetWeight: "20kg", targetReps: "2x15" },
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
      focus: "Chest Dominance",
      exercises: [
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Cable Flyes", category: "warmup", targetWeight: "light", targetReps: "2x15" },
        { name: "Incline Barbell Bench Press", category: "primary", targetWeight: "57.5kg", targetReps: "4x6-8", notes: "+7.5kg from Phase 1" },
        { name: "Dumbbell Bench Press", category: "primary", targetWeight: "16kg", targetReps: "4x8-10", notes: "+4kg from Phase 1" },
        { name: "Incline Dumbbell Flyes", category: "accessory", targetWeight: "10kg", targetReps: "3x10-12" },
        { name: "Dumbbell Shoulder Press", category: "accessory", targetWeight: "14kg", targetReps: "3x8-10" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "7kg", targetReps: "4x12-15" },
        { name: "Overhead Cable Tricep Extension", category: "accessory", targetWeight: "20kg", targetReps: "3x10-12" },
        { name: "Tricep Pushdown", category: "accessory", targetWeight: "25kg", targetReps: "3x10-12" },
        { name: "Dips", category: "accessory", targetWeight: "BW", targetReps: "3xAMRAP", notes: "Finisher" },
      ],
    },
    "Day 2": {
      name: "Pull A",
      focus: "Back + Deadlift",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "50kg", targetReps: "2x5" },
        { name: "Conventional Deadlift", category: "primary", targetWeight: "80kg", targetReps: "4x5", notes: "+20kg from Phase 1" },
        { name: "Pull-ups", category: "primary", targetWeight: "BW", targetReps: "5x6-8", notes: "3-4 strict + negatives" },
        { name: "Seated Cable Row", category: "primary", targetWeight: "50kg", targetReps: "4x8-10" },
        { name: "Lat Pulldown", category: "accessory", targetWeight: "55kg", targetReps: "3x10-12" },
        { name: "Face Pulls", category: "accessory", targetWeight: "20kg", targetReps: "4x15-20" },
        { name: "Barbell Curl", category: "accessory", targetWeight: "25kg", targetReps: "4x8-10" },
        { name: "Hammer Curls", category: "accessory", targetWeight: "12kg", targetReps: "3x10-12" },
        { name: "Incline Dumbbell Curl", category: "accessory", targetWeight: "10kg", targetReps: "3x10-12" },
      ],
    },
    "Day 3": {
      name: "Legs A",
      focus: "Quad Focus",
      exercises: [
        { name: "Bodyweight Squats", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Goblet Squats", category: "warmup", targetWeight: "16kg", targetReps: "2x10" },
        { name: "Barbell Squat", category: "primary", targetWeight: "60kg", targetReps: "4x8", notes: "Introduce barbell squat" },
        { name: "Leg Press", category: "primary", targetWeight: "130kg", targetReps: "4x10", notes: "+30kg from Phase 1" },
        { name: "Bulgarian Split Squat", category: "primary", targetWeight: "14kg", targetReps: "3x10 each" },
        { name: "Leg Extension", category: "accessory", targetWeight: "40kg", targetReps: "3x12-15" },
        { name: "Walking Lunges", category: "accessory", targetWeight: "10kg", targetReps: "3x12 each" },
        { name: "Standing Calf Raise", category: "accessory", targetWeight: "+20kg", targetReps: "4x15-20" },
      ],
    },
    "Day 4": {
      name: "Push B",
      focus: "Shoulder Dominance",
      exercises: [
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Overhead Press", category: "primary", targetWeight: "37.5kg", targetReps: "4x6-8", notes: "+7.5kg from Phase 1" },
        { name: "Incline Dumbbell Press", category: "primary", targetWeight: "16kg", targetReps: "4x8-10" },
        { name: "Flat Barbell Bench", category: "primary", targetWeight: "55kg", targetReps: "3x8-10", notes: "Add flat bench" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "8kg", targetReps: "4x12-15" },
        { name: "Bent Over Rear Delt Flyes", category: "accessory", targetWeight: "7kg", targetReps: "4x12-15" },
        { name: "Dips", category: "accessory", targetWeight: "BW", targetReps: "4x8-12" },
        { name: "Skull Crushers", category: "accessory", targetWeight: "20kg", targetReps: "3x10-12" },
        { name: "Close Grip Bench Press", category: "accessory", targetWeight: "40kg", targetReps: "3x10" },
      ],
    },
    "Day 5": {
      name: "Pull B",
      focus: "Width + Arms",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "50kg", targetReps: "2x5" },
        { name: "Weighted Pull-ups", category: "primary", targetWeight: "+5kg", targetReps: "5x5", notes: "Add weight" },
        { name: "Barbell Row", category: "primary", targetWeight: "55kg", targetReps: "4x6-8", notes: "+15kg from Phase 1" },
        { name: "T-Bar Row", category: "primary", targetWeight: "40kg", targetReps: "3x10-12", notes: "Add T-bar" },
        { name: "Single Arm Dumbbell Row", category: "accessory", targetWeight: "22kg", targetReps: "3x10 each" },
        { name: "Straight Arm Pulldown", category: "accessory", targetWeight: "25kg", targetReps: "3x12-15" },
        { name: "Face Pulls", category: "accessory", targetWeight: "17.5kg", targetReps: "3x15-20" },
        { name: "EZ Bar Preacher Curls", category: "accessory", targetWeight: "20kg", targetReps: "4x8-10" },
        { name: "Concentration Curls", category: "accessory", targetWeight: "10kg", targetReps: "3x10 each" },
      ],
    },
    "Day 6": {
      name: "Legs B",
      focus: "Posterior Chain",
      exercises: [
        { name: "Glute Bridge", category: "warmup", targetWeight: "BW", targetReps: "2x20" },
        { name: "Romanian Deadlift", category: "warmup", targetWeight: "30kg", targetReps: "2x10" },
        { name: "Romanian Deadlift", category: "primary", targetWeight: "70kg", targetReps: "4x8", notes: "+20kg from Phase 1" },
        { name: "Leg Press", category: "primary", targetWeight: "130kg", targetReps: "4x10-12", notes: "High + wide" },
        { name: "Walking Lunges", category: "primary", targetWeight: "16kg", targetReps: "3x12 each" },
        { name: "Leg Curl", category: "accessory", targetWeight: "40kg", targetReps: "4x10-12" },
        { name: "Hip Thrust", category: "accessory", targetWeight: "60kg", targetReps: "4x12" },
        { name: "Seated Calf Raise", category: "accessory", targetWeight: "30kg", targetReps: "4x20" },
        { name: "Good Mornings", category: "accessory", targetWeight: "30kg", targetReps: "3x12" },
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
      focus: "Chest Dominance",
      exercises: [
        { name: "Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Incline Barbell Bench Press", category: "primary", targetWeight: "65kg", targetReps: "5x5", notes: "Strength focus" },
        { name: "Flat Barbell Bench", category: "primary", targetWeight: "60kg", targetReps: "4x6-8" },
        { name: "Incline Dumbbell Press", category: "primary", targetWeight: "20kg", targetReps: "3x8-10" },
        { name: "Cable Crossover", category: "accessory", targetWeight: "17.5kg", targetReps: "3x12-15" },
        { name: "Dumbbell Shoulder Press", category: "accessory", targetWeight: "18kg", targetReps: "3x8-10" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "9kg", targetReps: "4x10-12" },
        { name: "Tricep Pushdown", category: "accessory", targetWeight: "30kg", targetReps: "4x10-12" },
        { name: "Overhead Tricep Extension", category: "accessory", targetWeight: "25kg", targetReps: "3x10-12" },
      ],
    },
    "Day 2": {
      name: "Pull A",
      focus: "Back + Deadlift",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "60kg", targetReps: "2x5" },
        { name: "Conventional Deadlift", category: "primary", targetWeight: "100kg", targetReps: "5x3", notes: "Heavy singles prep" },
        { name: "Pull-ups", category: "primary", targetWeight: "+5kg", targetReps: "5x5", notes: "5+ strict reps" },
        { name: "Barbell Row", category: "primary", targetWeight: "70kg", targetReps: "4x6-8" },
        { name: "Seated Cable Row", category: "accessory", targetWeight: "60kg", targetReps: "3x10-12" },
        { name: "Lat Pulldown", category: "accessory", targetWeight: "65kg", targetReps: "3x10-12" },
        { name: "Face Pulls", category: "accessory", targetWeight: "22.5kg", targetReps: "4x15" },
        { name: "Barbell Curl", category: "accessory", targetWeight: "30kg", targetReps: "4x8" },
        { name: "Hammer Curls", category: "accessory", targetWeight: "14kg", targetReps: "3x10" },
      ],
    },
    "Day 3": {
      name: "Legs A",
      focus: "Quad Focus",
      exercises: [
        { name: "Goblet Squats", category: "warmup", targetWeight: "16kg", targetReps: "2x10" },
        { name: "Barbell Squat", category: "primary", targetWeight: "80kg", targetReps: "5x5", notes: "Strength focus" },
        { name: "Leg Press", category: "primary", targetWeight: "160kg", targetReps: "4x8" },
        { name: "Bulgarian Split Squat", category: "primary", targetWeight: "18kg", targetReps: "3x8 each" },
        { name: "Leg Extension", category: "accessory", targetWeight: "50kg", targetReps: "4x10-12" },
        { name: "Walking Lunges", category: "accessory", targetWeight: "14kg", targetReps: "3x10 each" },
        { name: "Standing Calf Raise", category: "accessory", targetWeight: "+30kg", targetReps: "5x12-15" },
      ],
    },
    "Day 4": {
      name: "Push B",
      focus: "Shoulder Dominance",
      exercises: [
        { name: "Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Overhead Press", category: "primary", targetWeight: "45kg", targetReps: "5x5", notes: "Strength focus" },
        { name: "Incline Barbell Bench Press", category: "primary", targetWeight: "57.5kg", targetReps: "4x6-8" },
        { name: "Dumbbell Bench Press", category: "primary", targetWeight: "22kg", targetReps: "3x8-10" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "10kg", targetReps: "4x12" },
        { name: "Bent Over Rear Delt Flyes", category: "accessory", targetWeight: "9kg", targetReps: "4x12" },
        { name: "Weighted Dips", category: "accessory", targetWeight: "+10kg", targetReps: "4x6-8" },
        { name: "Skull Crushers", category: "accessory", targetWeight: "25kg", targetReps: "3x10" },
        { name: "Close Grip Bench Press", category: "accessory", targetWeight: "50kg", targetReps: "3x8" },
      ],
    },
    "Day 5": {
      name: "Pull B",
      focus: "Width + Arms",
      exercises: [
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "60kg", targetReps: "2x5" },
        { name: "Weighted Pull-ups", category: "primary", targetWeight: "+10kg", targetReps: "5x5" },
        { name: "Barbell Row", category: "primary", targetWeight: "70kg", targetReps: "4x6" },
        { name: "T-Bar Row", category: "primary", targetWeight: "55kg", targetReps: "4x8-10" },
        { name: "Single Arm Dumbbell Row", category: "accessory", targetWeight: "28kg", targetReps: "3x8 each" },
        { name: "Straight Arm Pulldown", category: "accessory", targetWeight: "30kg", targetReps: "3x12" },
        { name: "Face Pulls", category: "accessory", targetWeight: "20kg", targetReps: "3x15" },
        { name: "EZ Bar Preacher Curls", category: "accessory", targetWeight: "25kg", targetReps: "4x8" },
        { name: "Incline Dumbbell Curl", category: "accessory", targetWeight: "12kg", targetReps: "3x10" },
      ],
    },
    "Day 6": {
      name: "Legs B",
      focus: "Posterior Chain",
      exercises: [
        { name: "Glute Bridge", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Romanian Deadlift", category: "primary", targetWeight: "90kg", targetReps: "4x6", notes: "Heavy RDLs" },
        { name: "Leg Press", category: "primary", targetWeight: "160kg", targetReps: "4x10", notes: "High + wide" },
        { name: "Walking Lunges", category: "primary", targetWeight: "20kg", targetReps: "3x10 each" },
        { name: "Leg Curl", category: "accessory", targetWeight: "50kg", targetReps: "4x10" },
        { name: "Hip Thrust", category: "accessory", targetWeight: "80kg", targetReps: "4x10" },
        { name: "Seated Calf Raise", category: "accessory", targetWeight: "40kg", targetReps: "4x15" },
        { name: "Good Mornings", category: "accessory", targetWeight: "40kg", targetReps: "3x10" },
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
