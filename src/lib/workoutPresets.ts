export interface Exercise {
  name: string;
  category: 'warmup' | 'primary' | 'accessory';
  targetWeight: string;
  targetReps: string;
  notes?: string;
  restSeconds?: number;
  rir?: string;
  /** Corrective/functional work that cannot be dropped for time. */
  mandatory?: boolean;
  /** Short progression rule shown to the user (e.g. "Reps before weight"). */
  progression?: string;
}

export interface WorkoutDay {
  name: string;
  focus: string;
  bias?: 'heavy' | 'volume';
  exercises: Exercise[];
}
