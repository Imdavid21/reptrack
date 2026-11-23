import type { WorkoutExercise } from '@/hooks/useWorkouts';

export interface PlannedExercise { name: string; muscle_group?: string; sets: number; rep_min: number; rep_max: number; target_weight_kg: number | null; rest_seconds?: number; notes?: string | null; order?: number }

/** Turns a planned workout into live-session exercises prefilled with its targets. */
export function planToExercises(list: PlannedExercise[]): WorkoutExercise[] {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((e, i) => {
    const reps = e.rep_max !== e.rep_min ? `${e.rep_min}-${e.rep_max}` : String(e.rep_min);
    const weight = e.target_weight_kg != null ? String(e.target_weight_kg) : '';
    return {
      name: e.name, category: i < 2 ? 'compound' : 'accessory', sort_order: i,
      exerciseType: e.target_weight_kg == null ? 'bodyweight' : 'weighted', restSeconds: e.rest_seconds ?? 90, progression: e.notes ?? undefined,
      sets: Array.from({ length: e.sets }, (_, s) => ({ setNumber: s + 1, targetWeight: weight, targetReps: reps, actualWeight: weight, actualReps: String(e.rep_min), completed: false })),
    } as WorkoutExercise;
  });
}
