export type Confidence = 'high' | 'moderate' | 'low' | 'insufficient';
export type TrendState = 'progressing' | 'stable' | 'declining' | 'unclear';
export type WeightDirection = 'rising' | 'falling' | 'stable' | 'unclear';
export type ActionKind = 'keep' | 'change' | 'watch' | 'log';

export interface WeightObservation { date: string; kg: number }
export interface MetricObservation { date: string; bodyweight?: number | null; sleep?: number | null }
export interface MealDay {
  date: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  potassium: number;
}
export interface TrainingSet {
  exercise: string;
  date: string;
  weight: number;
  reps: number;
}
export interface WorkoutObservation { date: string; duration?: number | null }
export interface EnergyDay {
  date: string;
  baseline: number;
  workout: number;
  activity: number;
  expenditure: number;
  intake?: number;
}

export interface WeightTrendPoint { date: string; raw: number; trend: number }
export interface BodyweightAnalysis {
  latest: number | null;
  trendWeight: number | null;
  change: number | null;
  percentPerWeek: number | null;
  direction: WeightDirection;
  aligned: boolean | null;
  confidence: Confidence;
  observations: number;
  spanDays: number;
  windowDays: number;
  points: WeightTrendPoint[];
}

export interface ExerciseExposure {
  date: string;
  weight: number;
  reps: number;
  e1rm: number;
  volume: number;
}
export interface ExerciseTrend {
  exercise: string;
  state: TrendState;
  confidence: Confidence;
  exposures: ExerciseExposure[];
  deltaPercent: number | null;
  progressionType: 'load' | 'reps' | 'estimated-strength' | 'stable' | 'possible-decline' | 'unclear';
}

export interface MuscleExposure {
  muscle: string;
  setsPerWeek: number;
  reference: { low: number; high: number };
  referenceState: 'none' | 'below' | 'within' | 'above' | 'well-above';
  progression: TrendState;
}

export interface NutritionAnalysis {
  loggedDays: number;
  windowDays: number;
  coverage: number;
  confidence: Confidence;
  averageCalories: number | null;
  averageProtein: number | null;
  averageFiber: number | null;
  energyBalance: number | null;
  modelDisagreesWithWeight: boolean;
}

export interface RecoveryAnalysis {
  state: 'normal' | 'strained' | 'improving' | 'insufficient';
  confidence: Confidence;
  averageSleep: number | null;
  sleepNights: number;
  consecutiveTrainingDays: number;
  recentTrainingDays: number;
  windowDays: number;
  reason: string;
}

export interface DataroomFinding {
  id: string;
  title: string;
  signal: string;
  evidence: string[];
  interpretation: string;
  action: string;
  actionKind: ActionKind;
  confidence: Confidence;
  priority: number;
  domain: 'bodyweight' | 'training' | 'nutrition' | 'recovery' | 'data';
}

export interface DataroomAnalysis {
  headline: string;
  confidence: Confidence;
  rangeDays: number;
  weight: BodyweightAnalysis;
  exercises: ExerciseTrend[];
  muscles: MuscleExposure[];
  nutrition: NutritionAnalysis;
  recovery: RecoveryAnalysis;
  findings: DataroomFinding[];
}
