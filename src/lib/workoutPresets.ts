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
  days: Record<string, WorkoutDay>;
}

// Phase 1: Weeks 1-4 - Neural Adaptation + Form Mastery
export const defaultRoutine: WorkoutRoutine = {
  routineName: "Phase 1: Neural Adaptation (Weeks 1-4)",
  days: {
    "Day 1": {
      name: "Push A",
      focus: "Chest Dominance",
      exercises: [
        // Pre-activation
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15", notes: "Hands on bench, SLOW" },
        { name: "Cable Flyes", category: "warmup", targetWeight: "light", targetReps: "2x20", notes: "Feel the stretch" },
        { name: "Dumbbell Bench Press", category: "warmup", targetWeight: "8kg", targetReps: "1x20", notes: "Mind-muscle connection" },
        // Main work
        { name: "Incline Barbell Bench Press", category: "primary", targetWeight: "50kg", targetReps: "4x8-10", notes: "Tempo: 3-0-X-0, touch upper chest" },
        { name: "Flat Dumbbell Bench Press", category: "primary", targetWeight: "12kg", targetReps: "3x10-12", notes: "Dumbbells touch at top, deep stretch" },
        { name: "Incline Dumbbell Flyes", category: "accessory", targetWeight: "8kg", targetReps: "3x12-15", notes: "Squeeze 2s at top" },
        { name: "Seated Dumbbell Shoulder Press", category: "accessory", targetWeight: "10kg", targetReps: "3x10-12" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "5kg", targetReps: "3x15-20", notes: "Superset with shoulder press" },
        { name: "Overhead Cable Tricep Extension", category: "accessory", targetWeight: "15kg", targetReps: "3x12-15" },
        { name: "Cable Tricep Pushdowns", category: "accessory", targetWeight: "20kg", targetReps: "3x12-15", notes: "Superset" },
        { name: "Push-ups", category: "accessory", targetWeight: "BW", targetReps: "3xAMRAP", notes: "Finisher - aim for 25+ by Week 4" },
      ],
    },
    "Day 2": {
      name: "Pull A",
      focus: "Back + Deadlift",
      exercises: [
        // Deadlift form practice
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "40kg", targetReps: "2x8", notes: "Practice hip hinge" },
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "50kg", targetReps: "2x5", notes: "Check form in mirror" },
        // Main work
        { name: "Conventional Deadlift", category: "primary", targetWeight: "60kg", targetReps: "4x6", notes: "Chest up, push floor away, bar drags shins" },
        { name: "Pull-ups", category: "primary", targetWeight: "BW", targetReps: "5x8", notes: "1 strict + negatives to 8 reps, 5s negative" },
        { name: "Cable Seated Row", category: "primary", targetWeight: "40kg", targetReps: "4x10-12", notes: "V-handle, pull to lower sternum, squeeze 2s" },
        { name: "Lat Pulldown", category: "accessory", targetWeight: "45kg", targetReps: "3x12-15", notes: "Wide grip, pull to upper chest" },
        { name: "Face Pulls", category: "accessory", targetWeight: "15kg", targetReps: "4x20", notes: "Pull to forehead, rotate hands out" },
        { name: "Barbell Curls", category: "accessory", targetWeight: "20kg", targetReps: "3x10", notes: "STRICT form, no swinging" },
        { name: "Hammer Curls", category: "accessory", targetWeight: "10kg", targetReps: "3x12-15", notes: "Superset with barbell curls" },
      ],
    },
    "Day 3": {
      name: "Legs A",
      focus: "Quad Focus",
      exercises: [
        // Warm-up
        { name: "Bodyweight Squats", category: "warmup", targetWeight: "BW", targetReps: "2x20" },
        { name: "Goblet Squats", category: "warmup", targetWeight: "10kg", targetReps: "2x12", notes: "Light warm-up" },
        // Main work
        { name: "Leg Press", category: "primary", targetWeight: "100kg", targetReps: "4x12", notes: "Full depth, hamstrings to calves, tempo 3-0-1-0" },
        { name: "Goblet Squats", category: "primary", targetWeight: "14kg", targetReps: "4x12-15", notes: "Deep as possible, chest up" },
        { name: "Bulgarian Split Squats", category: "primary", targetWeight: "10kg", targetReps: "3x10 each", notes: "Upright torso, front leg works" },
        { name: "Leg Extensions", category: "accessory", targetWeight: "30kg", targetReps: "3x15-20" },
        { name: "Walking Lunges", category: "accessory", targetWeight: "BW", targetReps: "3x12 each" },
        { name: "Standing Calf Raises", category: "accessory", targetWeight: "BW", targetReps: "4x20", notes: "Tempo 2-0-1-2, squeeze at top" },
        { name: "Wall Sit", category: "accessory", targetWeight: "BW", targetReps: "2x45s", notes: "Finisher" },
      ],
    },
    "Day 4": {
      name: "Push B",
      focus: "Shoulder Dominance",
      exercises: [
        // Pre-activation (same as Push A)
        { name: "Incline Push-ups", category: "warmup", targetWeight: "BW", targetReps: "2x15" },
        { name: "Cable Flyes", category: "warmup", targetWeight: "light", targetReps: "2x20" },
        // Main work
        { name: "Barbell Overhead Press", category: "primary", targetWeight: "30kg", targetReps: "4x8", notes: "Standing, press slightly back" },
        { name: "Incline Dumbbell Press", category: "primary", targetWeight: "12kg", targetReps: "4x10-12" },
        { name: "Cable Flyes", category: "accessory", targetWeight: "12kg", targetReps: "3x15", notes: "Cables at shoulder height" },
        { name: "Dumbbell Lateral Raises", category: "accessory", targetWeight: "6kg", targetReps: "4x12-15" },
        { name: "Bent Over Rear Delt Flyes", category: "accessory", targetWeight: "5kg", targetReps: "4x15-20", notes: "Superset with laterals" },
        { name: "Dips", category: "accessory", targetWeight: "BW", targetReps: "3x8-12", notes: "Lean forward, deep stretch" },
        { name: "Cable Rope Overhead Tricep Extension", category: "accessory", targetWeight: "15kg", targetReps: "3x15" },
        { name: "Close Grip Bench Press", category: "accessory", targetWeight: "30kg", targetReps: "3x12" },
        { name: "Push-ups", category: "accessory", targetWeight: "BW", targetReps: "2xAMRAP", notes: "Finisher" },
      ],
    },
    "Day 5": {
      name: "Pull B",
      focus: "Width + Arms",
      exercises: [
        // Deadlift form practice (lighter)
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "40kg", targetReps: "3x8" },
        { name: "Deadlift Technique Work", category: "warmup", targetWeight: "50kg", targetReps: "2x5" },
        // Main work
        { name: "Weighted Pull-ups", category: "primary", targetWeight: "BW", targetReps: "5x5", notes: "Dead hang to chest, add weight Week 3-4" },
        { name: "Barbell Rows", category: "primary", targetWeight: "40kg", targetReps: "4x8-10", notes: "Pull to lower abs, elbows close" },
        { name: "Single Arm Dumbbell Rows", category: "primary", targetWeight: "16kg", targetReps: "3x12 each", notes: "Row to hip, slight twist at top" },
        { name: "Straight Arm Pulldowns", category: "accessory", targetWeight: "20kg", targetReps: "3x15", notes: "Lats only, arms straight" },
        { name: "Face Pulls", category: "accessory", targetWeight: "15kg", targetReps: "3x20" },
        { name: "EZ Bar Preacher Curls", category: "accessory", targetWeight: "15kg", targetReps: "4x10-12", notes: "Full stretch, peak contraction" },
        { name: "Concentration Curls", category: "accessory", targetWeight: "8kg", targetReps: "4x12 each", notes: "Superset, no rest between arms" },
        { name: "Cable Curls", category: "accessory", targetWeight: "15kg", targetReps: "2x21", notes: "21s: 7 bottom + 7 top + 7 full" },
      ],
    },
    "Day 6": {
      name: "Legs B",
      focus: "Posterior Chain",
      exercises: [
        // Warm-up
        { name: "Glute Bridges", category: "warmup", targetWeight: "BW", targetReps: "2x25" },
        { name: "Romanian Deadlifts", category: "warmup", targetWeight: "20kg", targetReps: "2x12", notes: "Empty bar warm-up" },
        // Main work
        { name: "Romanian Deadlifts", category: "primary", targetWeight: "50kg", targetReps: "4x10", notes: "Tempo 3-0-1-0, hips back, feel hamstring stretch" },
        { name: "Leg Press", category: "primary", targetWeight: "100kg", targetReps: "4x12-15", notes: "High + wide foot, toes out, glutes/hams focus" },
        { name: "Walking Lunges", category: "primary", targetWeight: "12kg", targetReps: "3x12 each", notes: "Long stride, back knee nearly touches floor" },
        { name: "Leg Curls", category: "accessory", targetWeight: "30kg", targetReps: "3x12-15" },
        { name: "Hip Thrusts", category: "accessory", targetWeight: "40kg", targetReps: "4x15", notes: "Squeeze glutes HARD, posterior pelvic tilt" },
        { name: "Seated Calf Raises", category: "accessory", targetWeight: "20kg", targetReps: "4x25", notes: "Plate on knees" },
        { name: "Good Mornings", category: "accessory", targetWeight: "20kg", targetReps: "2x15", notes: "Finisher - light bar" },
      ],
    },
  },
};

export function getDayNumber(date: Date, startDate: Date): number {
  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return (daysDiff % 6) + 1;
}

export function getWeekNumber(date: Date, startDate: Date): number {
  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(daysDiff / 6) + 1;
}
