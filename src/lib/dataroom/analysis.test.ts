import { describe, expect, it } from 'vitest';
import { analyzeBodyweight, analyzeExerciseProgression, analyzeMuscleExposure, analyzeNutrition, buildDataroomAnalysis } from './analysis';

const dates = (weights: number[]) => weights.map((bodyweight, index) => ({
  date: `2026-08-${String(index + 1).padStart(2, '0')}`,
  bodyweight,
}));

describe('Data Room bodyweight analysis', () => {
  it('uses a smoothed trend so one noisy final observation does not reverse direction', () => {
    const result = analyzeBodyweight(dates([75, 74.8, 74.7, 74.5, 74.4, 74.2, 74.1, 74, 73.9, 74.8]), 'lose', '2026-08-10');
    expect(result.direction).toBe('falling');
    expect(result.aligned).toBe(true);
  });

  it('returns low or insufficient confidence for sparse data', () => {
    expect(analyzeBodyweight(dates([75]), 'lose', '2026-08-01').confidence).toBe('insufficient');
    expect(analyzeBodyweight(dates([75, 74.8]), 'lose', '2026-08-02').confidence).toBe('low');
  });
});

describe('Data Room training progression', () => {
  it('recognizes same-load rep progression', () => {
    const [result] = analyzeExerciseProgression([
      { exercise: 'Incline Press', date: '2026-08-01', weight: 25, reps: 8 },
      { exercise: 'Incline Press', date: '2026-08-08', weight: 25, reps: 10 },
    ]);
    expect(result.state).toBe('progressing');
    expect(result.progressionType).toBe('reps');
  });

  it('recognizes load progression at comparable reps', () => {
    const [result] = analyzeExerciseProgression([
      { exercise: 'Row', date: '2026-08-01', weight: 80, reps: 8 },
      { exercise: 'Row', date: '2026-08-08', weight: 82.5, reps: 8 },
    ]);
    expect(result.progressionType).toBe('load');
  });

  it('does not diagnose decline from one bad session or three non-PR sessions', () => {
    const [result] = analyzeExerciseProgression([
      { exercise: 'Bench', date: '2026-08-01', weight: 80, reps: 8 },
      { exercise: 'Bench', date: '2026-08-08', weight: 80, reps: 8 },
      { exercise: 'Bench', date: '2026-08-15', weight: 80, reps: 7 },
    ]);
    expect(result.state).toBe('stable');
    expect(result.progressionType).not.toBe('possible-decline');
  });
});

describe('Data Room energy coverage', () => {
  it('excludes days without meals instead of turning them into zero intake', () => {
    const weight = analyzeBodyweight(dates([75, 74.9, 74.8, 74.7]), 'lose', '2026-08-04');
    const nutrition = analyzeNutrition(
      [{ date: '2026-08-01', calories: 2000, protein: 160, fiber: 25, carbs: 200, fat: 60, sugar: 30, sodium: 2000, potassium: 3000 }],
      [
        { date: '2026-08-01', baseline: 2200, workout: 200, activity: 0, expenditure: 2400, intake: 2000 },
        { date: '2026-08-02', baseline: 2200, workout: 0, activity: 0, expenditure: 2200 },
      ],
      weight,
      2,
    );
    expect(nutrition.energyBalance).toBe(-400);
    expect(nutrition.loggedDays).toBe(1);
    expect(nutrition.coverage).toBe(50);
  });
});

describe('Data Room muscle exposure and ranking', () => {
  it('keeps activity out of direct resistance-set exposure', () => {
    const sets = [{ exercise: 'Standing Calf Raise', date: '2026-08-01', weight: 50, reps: 12 }];
    const muscles = analyzeMuscleExposure(sets, analyzeExerciseProgression(sets), 7);
    expect(muscles.find(m => m.muscle === 'Calves')?.setsPerWeek).toBeGreaterThan(0);
    expect(muscles.find(m => m.muscle === 'Quads')?.setsPerWeek).toBe(0);
  });

  it('does not turn a generic reference mismatch into an automatic volume increase', () => {
    const sets = [1, 8, 15].map((day, index) => ({ exercise: 'Cable Lateral Raise', date: `2026-08-${String(day).padStart(2, '0')}`, weight: 7.5, reps: 12 + index }));
    const trends = analyzeExerciseProgression(sets);
    const sideDelts = analyzeMuscleExposure(sets, trends, 21).find(muscle => muscle.muscle === 'Side Delts');
    expect(sideDelts?.referenceState).toBe('below');
    expect(sideDelts?.progression).toBe('progressing');
  });

  it('can rank no-change as the primary decision and caps findings at three', () => {
    const metrics = dates([75, 74.9, 74.8, 74.7, 74.6, 74.5, 74.4, 74.3, 74.2, 74.1]).map(row => ({ ...row, sleep: 8 }));
    const sets = [1, 8, 15, 22].flatMap((day, index) => [
      { exercise: 'Incline Press', date: `2026-08-${String(day).padStart(2, '0')}`, weight: 25, reps: 8 + index },
      { exercise: 'Row', date: `2026-08-${String(day).padStart(2, '0')}`, weight: 50, reps: 8 + index },
    ]);
    const result = buildDataroomAnalysis({ metrics, sets, workouts: [], meals: [], energy: [], goal: 'lose', sleepGoal: 8, proteinGoal: 165, endDate: '2026-08-28' });
    expect(result.findings.length).toBeLessThanOrEqual(3);
    expect(result.findings.some(f => f.actionKind === 'keep')).toBe(true);
  });
});
