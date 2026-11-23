import { describe, expect, it } from 'vitest';
import { planToExercises } from './plannedWorkout';

describe('planToExercises', () => {
  it('prefills each set with the planned weight and rep range, in plan order', () => {
    const out = planToExercises([
      { name: 'Hammer Curl', sets: 2, rep_min: 8, rep_max: 10, target_weight_kg: 17.5, order: 2 },
      { name: 'Lat Pulldown', sets: 3, rep_min: 8, rep_max: 10, target_weight_kg: 80, rest_seconds: 120, order: 1 },
    ]);
    expect(out.map(e => e.name)).toEqual(['Lat Pulldown', 'Hammer Curl']);
    expect(out[0].sets).toHaveLength(3);
    expect(out[0].sets[0]).toMatchObject({ targetWeight: '80', targetReps: '8-10', actualWeight: '80', actualReps: '8', completed: false });
    expect(out[0].restSeconds).toBe(120);
  });
});
