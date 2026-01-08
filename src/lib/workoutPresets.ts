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

// Default 6-Day Push/Pull/Legs Program
export const defaultRoutine: WorkoutRoutine = {
  routineName: "12-Week PPL Hypertrophy",
  days: {
    "Day 1": {
      name: "Push A",
      focus: "Chest & Shoulders",
      exercises: [
        { name: "Incline DB Press", category: "primary", targetWeight: "30kg", targetReps: "4x8-10" },
        { name: "Flat Barbell Bench", category: "primary", targetWeight: "60kg", targetReps: "4x6-8" },
        { name: "Seated DB Shoulder Press", category: "primary", targetWeight: "22kg", targetReps: "3x10-12" },
        { name: "Cable Crossover", category: "accessory", targetWeight: "15kg", targetReps: "3x12-15" },
        { name: "Lateral Raises", category: "accessory", targetWeight: "10kg", targetReps: "4x12-15" },
        { name: "Tricep Pushdown", category: "accessory", targetWeight: "25kg", targetReps: "3x12-15" },
        { name: "Overhead Tricep Extension", category: "accessory", targetWeight: "20kg", targetReps: "3x10-12" },
      ],
    },
    "Day 2": {
      name: "Pull A",
      focus: "Back & Biceps",
      exercises: [
        { name: "Pull-ups", category: "primary", targetWeight: "BW", targetReps: "4xAMRAP" },
        { name: "Barbell Row", category: "primary", targetWeight: "60kg", targetReps: "4x6-8" },
        { name: "Lat Pulldown", category: "primary", targetWeight: "55kg", targetReps: "3x10-12" },
        { name: "Seated Cable Row", category: "accessory", targetWeight: "50kg", targetReps: "3x10-12" },
        { name: "Face Pulls", category: "accessory", targetWeight: "20kg", targetReps: "4x15-20" },
        { name: "Barbell Curl", category: "accessory", targetWeight: "25kg", targetReps: "3x10-12" },
        { name: "Hammer Curls", category: "accessory", targetWeight: "12kg", targetReps: "3x12-15" },
      ],
    },
    "Day 3": {
      name: "Legs A",
      focus: "Quads & Glutes",
      exercises: [
        { name: "Barbell Squat", category: "primary", targetWeight: "80kg", targetReps: "4x6-8" },
        { name: "Romanian Deadlift", category: "primary", targetWeight: "70kg", targetReps: "3x8-10" },
        { name: "Leg Press", category: "primary", targetWeight: "150kg", targetReps: "3x10-12" },
        { name: "Walking Lunges", category: "accessory", targetWeight: "20kg", targetReps: "3x12 each" },
        { name: "Leg Extension", category: "accessory", targetWeight: "45kg", targetReps: "3x12-15" },
        { name: "Leg Curl", category: "accessory", targetWeight: "40kg", targetReps: "3x12-15" },
        { name: "Standing Calf Raise", category: "accessory", targetWeight: "60kg", targetReps: "4x15-20" },
      ],
    },
    "Day 4": {
      name: "Push B",
      focus: "Shoulders & Chest",
      exercises: [
        { name: "Overhead Press", category: "primary", targetWeight: "45kg", targetReps: "4x6-8" },
        { name: "Incline Barbell Bench", category: "primary", targetWeight: "55kg", targetReps: "4x8-10" },
        { name: "DB Flat Bench", category: "primary", targetWeight: "28kg", targetReps: "3x10-12" },
        { name: "Arnold Press", category: "accessory", targetWeight: "16kg", targetReps: "3x10-12" },
        { name: "Cable Lateral Raise", category: "accessory", targetWeight: "7.5kg", targetReps: "4x12-15" },
        { name: "Skull Crushers", category: "accessory", targetWeight: "25kg", targetReps: "3x10-12" },
        { name: "Diamond Push-ups", category: "accessory", targetWeight: "BW", targetReps: "3xAMRAP" },
      ],
    },
    "Day 5": {
      name: "Pull B",
      focus: "Back Width & Biceps",
      exercises: [
        { name: "Weighted Pull-ups", category: "primary", targetWeight: "+10kg", targetReps: "4x6-8" },
        { name: "T-Bar Row", category: "primary", targetWeight: "50kg", targetReps: "4x8-10" },
        { name: "Single Arm DB Row", category: "primary", targetWeight: "30kg", targetReps: "3x10-12" },
        { name: "Straight Arm Pulldown", category: "accessory", targetWeight: "25kg", targetReps: "3x12-15" },
        { name: "Reverse Flyes", category: "accessory", targetWeight: "10kg", targetReps: "4x12-15" },
        { name: "Incline DB Curl", category: "accessory", targetWeight: "10kg", targetReps: "3x10-12" },
        { name: "Cable Curl", category: "accessory", targetWeight: "20kg", targetReps: "3x12-15" },
      ],
    },
    "Day 6": {
      name: "Legs B",
      focus: "Hamstrings & Posterior Chain",
      exercises: [
        { name: "Conventional Deadlift", category: "primary", targetWeight: "100kg", targetReps: "4x5" },
        { name: "Front Squat", category: "primary", targetWeight: "60kg", targetReps: "3x8-10" },
        { name: "Bulgarian Split Squat", category: "primary", targetWeight: "20kg", targetReps: "3x10 each" },
        { name: "Hip Thrust", category: "accessory", targetWeight: "80kg", targetReps: "3x10-12" },
        { name: "Nordic Curl", category: "accessory", targetWeight: "BW", targetReps: "3x6-8" },
        { name: "Seated Calf Raise", category: "accessory", targetWeight: "40kg", targetReps: "4x15-20" },
        { name: "Ab Wheel Rollout", category: "accessory", targetWeight: "BW", targetReps: "3x12-15" },
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
