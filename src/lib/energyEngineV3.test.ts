import { describe, expect, it } from 'vitest';
import {
  ageOnDate,
  buildDailyEnergyModel,
  calculateRee,
  calibrateEnergyModel,
  collapseSameDayWeights,
  deriveProteinTarget,
  effectiveWeightAt,
  ENERGY_MODEL_VERSION,
  estimateActivity,
  estimateWorkoutEnergy,
  metForPace,
  netActivityKcal,
  nutritionCompleteness,
  rejectWeightOutliers,
  resolvePersonalPace,
  smoothCalorieTarget,
  type CalibrationDay,
  type WeightObservation,
} from './energyEngineV3';

const dateAt = (day: number) => `2026-01-${String(day).padStart(2, '0')}`;
const weights = (values: number[]): WeightObservation[] => values.map((kg, index) => ({ date: dateAt(index + 1), kg }));

describe('Personal Energy Engine V3 bodyweight state', () => {
  it('smooths a decreasing series instead of trusting the last scale reading', () => {
    const result = effectiveWeightAt(weights([75.8, 75.2, 75.5, 74.8, 75.1]), '2026-01-06');
    expect(result.source).toBe('smoothed_recent');
    expect(result.kg).toBeGreaterThan(74.8);
    expect(result.kg).toBeLessThan(75.6);
  });

  it('supports irregular and missing weigh-ins', () => {
    const result = effectiveWeightAt([{ date: '2026-01-01', kg: 80 }, { date: '2026-01-09', kg: 79.4 }], '2026-01-10');
    expect(result.kg).toBeGreaterThan(79.3);
    expect(result.observationCount).toBe(2);
  });

  it('collapses multiple same-day measurements by median', () => {
    expect(collapseSameDayWeights([{ date: '2026-01-01T08:00:00Z', kg: 75 }, { date: '2026-01-01T20:00:00Z', kg: 77 }])).toEqual([{ date: '2026-01-01', kg: 76 }]);
  });

  it('rejects an anomalous measurement without deleting the source input', () => {
    const source = weights([75, 75.1, 74.9, 110, 75.2]);
    expect(rejectWeightOutliers(source)).toHaveLength(4);
    expect(source).toHaveLength(5);
  });

  it('uses historical weight rather than future current weight', () => {
    const result = effectiveWeightAt([{ date: '2026-01-01', kg: 90 }, { date: '2026-08-01', kg: 70 }], '2026-01-10');
    expect(result.kg).toBe(90);
  });

  it('falls back to initial measured weight, never goal weight', () => {
    expect(effectiveWeightAt([], '2026-01-01', 82).kg).toBe(82);
    expect(effectiveWeightAt([], '2026-01-01').source).toBe('generic_fallback');
  });
});

describe('REE and baseline inputs', () => {
  it('calculates male and female Mifflin-St Jeor correctly', () => {
    expect(calculateRee(80, 180, 30, 'male')).toBe(1780);
    expect(calculateRee(65, 165, 28, 'female')).toBe(1380);
  });

  it('derives age dynamically from DOB', () => {
    expect(ageOnDate('2000-08-14', '2026-08-13')).toBe(25);
    expect(ageOnDate('2000-08-14', '2026-08-14')).toBe(26);
  });

  it('responds to changing bodyweight and height', () => {
    expect(calculateRee(80, 180, 30, 'male')).toBeGreaterThan(calculateRee(70, 180, 30, 'male'));
    expect(calculateRee(80, 185, 30, 'male')).toBeGreaterThan(calculateRee(80, 175, 30, 'male'));
  });
});

describe('net activity and personal pace', () => {
  it('uses the specified net MET-above-rest equation', () => {
    expect(netActivityKcal(5, 75, 60)).toBeCloseTo(315, 4);
  });

  it('uses actual walking pace when distance and duration exist', () => {
    const estimate = estimateActivity({ kind: 'walking', date: '2026-01-10', weight: 75, distanceKm: 5, durationMinutes: 50 });
    expect(estimate.paceSource).toBe('actual_timing');
    expect(estimate.paceMinutesPerKm).toBe(10);
    expect(estimate.confidence).toBe('medium');
  });

  it('uses recent personal pace before a generic fallback', () => {
    const history = [{ date: '2026-01-01', activityType: 'running', distanceKm: 5, durationMinutes: 30 }, { date: '2026-01-05', activityType: 'running', distanceKm: 10, durationMinutes: 62 }];
    expect(resolvePersonalPace('running', history, '2026-01-10').source).toBe('personal_recent');
    const estimate = estimateActivity({ kind: 'running', date: '2026-01-10', weight: 75, distanceKm: 5, history });
    expect(estimate.durationMinutes).toBeGreaterThan(29);
    expect(estimate.paceSource).toBe('personal_recent');
  });

  it('degrades to a generic pace with low confidence when history is absent', () => {
    const estimate = estimateActivity({ kind: 'cycling', date: '2026-01-10', weight: 75, distanceKm: 20 });
    expect(estimate.paceSource).toBe('generic_fallback');
    expect(estimate.confidence).toBe('low');
  });

  it('supports lightweight boxing intensity categories', () => {
    const technique = estimateActivity({ kind: 'boxing', date: '2026-01-10', weight: 75, durationMinutes: 45, boxingIntensity: 'technique' });
    const sparring = estimateActivity({ kind: 'boxing', date: '2026-01-10', weight: 75, durationMinutes: 45, boxingIntensity: 'sparring' });
    expect(sparring.netKcal).toBeGreaterThan(technique.netKcal);
  });

  it('flags implausible activity inputs instead of producing high-confidence theatre', () => {
    const estimate = estimateActivity({ kind: 'walking', date: '2026-01-10', weight: 75, distanceKm: 500, durationMinutes: 60 });
    expect(estimate.warnings).toContain('implausible_distance');
    expect(estimate.confidence).toBe('low');
  });

  it('changes MET with pace', () => {
    expect(metForPace('running', 5)).toBeGreaterThan(metForPace('running', 8));
  });
});

describe('workout energy', () => {
  it('does not turn one set and one rep into a full workout burn', () => {
    const estimate = estimateWorkoutEnergy({ durationMinutes: 5, completedSets: 1, plannedSets: 20, compoundSets: 1, weightKg: 75, hasActualFinish: true });
    expect(estimate.intensity).toBe('light');
    expect(estimate.netKcal).toBeLessThan(30);
  });

  it('classifies a normal session from completed structure rather than muscle group', () => {
    const estimate = estimateWorkoutEnergy({ durationMinutes: 70, completedSets: 10, plannedSets: 12, compoundSets: 4, weightKg: 75, hasActualFinish: true });
    expect(estimate.intensity).toBe('normal');
  });

  it('classifies a dense heavy session broadly as vigorous', () => {
    const estimate = estimateWorkoutEnergy({ durationMinutes: 60, completedSets: 16, plannedSets: 17, compoundSets: 9, weightKg: 75, hasActualFinish: true });
    expect(estimate.intensity).toBe('vigorous');
  });

  it('subtracts explicit pauses but keeps background/rest time', () => {
    const full = estimateWorkoutEnergy({ durationMinutes: 90, completedSets: 12, weightKg: 75 });
    const paused = estimateWorkoutEnergy({ durationMinutes: 90, pausedSeconds: 1800, completedSets: 12, weightKg: 75 });
    expect(paused.activeDurationMinutes).toBe(60);
    expect(paused.netKcal).toBeLessThan(full.netKcal);
  });

  it('marks missing finish time as low confidence', () => {
    expect(estimateWorkoutEnergy({ durationMinutes: 60, completedSets: 12, weightKg: 75, hasActualFinish: false }).confidence).toBe('low');
  });

  it('bounds an implausibly long workout and lowers confidence', () => {
    const estimate = estimateWorkoutEnergy({ durationMinutes: 40 * 60, completedSets: 20, plannedSets: 20, compoundSets: 10, weightKg: 75, hasActualFinish: true });
    expect(estimate.activeDurationMinutes).toBe(8 * 60);
    expect(estimate.confidence).toBe('low');
  });
});

describe('food completeness and calibration safety', () => {
  it('distinguishes complete and partial food logging', () => {
    expect(nutritionCompleteness({ date: '2026-01-01', calories: 2200, mealTypes: ['breakfast', 'lunch', 'dinner'], confirmedMeals: 3, totalMeals: 3 }, 2200).complete).toBe(true);
    expect(nutritionCompleteness({ date: '2026-01-01', calories: 400, mealTypes: ['breakfast'], confirmedMeals: 1, totalMeals: 1 }, 2200).confidence).toBe('low');
  });

  it('does not let an implausible meal day influence calibration as complete data', () => {
    expect(nutritionCompleteness({ date: '2026-01-01', calories: 15000, mealTypes: ['breakfast', 'lunch', 'dinner'], confirmedMeals: 3, totalMeals: 3 }).complete).toBe(false);
  });

  const calibrationDays = (weightDelta: number, incomplete = false): CalibrationDay[] => Array.from({ length: 29 }, (_, index) => ({
    date: dateAt(index + 1),
    calories: incomplete && index % 3 === 0 ? 300 : 2200,
    mealTypes: incomplete && index % 3 === 0 ? ['breakfast'] : ['breakfast', 'lunch', 'dinner'],
    confirmedMeals: incomplete && index % 3 === 0 ? 1 : 3,
    totalMeals: incomplete && index % 3 === 0 ? 1 : 3,
    predictedTdee: 2400,
    weightKg: 80 + weightDelta * index / 28,
  }));

  it('calibrates slowly from four good weeks', () => {
    const result = calibrateEnergyModel(calibrationDays(-0.5));
    expect(result.eligible).toBe(true);
    expect(Math.abs(result.change)).toBeLessThanOrEqual(75);
    expect(result.adjustment).toBe(result.change);
  });

  it('does not calibrate from a short window', () => {
    expect(calibrateEnergyModel(calibrationDays(0).slice(0, 10)).eligible).toBe(false);
  });

  it('blocks incomplete food periods from corrupting maintenance', () => {
    const result = calibrateEnergyModel(calibrationDays(-0.5, true));
    expect(result.adjustment).toBeLessThanOrEqual(75);
    expect(result.qualityScore).toBeLessThan(1);
  });

  it('bounds accumulated calibration in both directions', () => {
    const high = calibrateEnergyModel(calibrationDays(-2), 490);
    const low = calibrateEnergyModel(calibrationDays(2), -490);
    expect(high.adjustment).toBeLessThanOrEqual(500);
    expect(low.adjustment).toBeGreaterThanOrEqual(-500);
  });
});

describe('daily targets and model versioning', () => {
  it('builds an explainable versioned daily model without double-counting exercise', () => {
    const model = buildDailyEnergyModel({ date: '2026-01-10', weights: weights([75, 75, 75]), legacyAge: 30, heightCm: 180, sex: 'male', lifestyle: 'mostly_seated', workoutActivity: 250, otherActivity: 100, foodIntake: 2000, goal: 'lose', desiredAdjustment: -500 });
    expect(model.predictedTdee).toBe(model.formulaBaseline + 350);
    expect(model.energyBalance).toBe(2000 - model.calibratedTdee);
    expect(model.modelVersion).toBe(ENERGY_MODEL_VERSION);
  });

  it('derives protein from smoothed weight and goal', () => {
    expect(deriveProteinTarget(75, 'lose')).toBe(165);
    expect(deriveProteinTarget(75, 'gain')).toBe(135);
  });

  it('smooths material calorie target changes and ignores tiny noise', () => {
    expect(smoothCalorieTarget(2200, 2230)).toBe(2200);
    expect(smoothCalorieTarget(2200, 2600)).toBe(2300);
  });

  it('honours explicitly locked targets only', () => {
    const model = buildDailyEnergyModel({ date: '2026-01-10', weights: weights([75, 75]), legacyAge: 30, heightCm: 180, sex: 'male', lockedCalorieTarget: 1900, lockedProteinTarget: 170 });
    expect(model.calorieTarget).toBe(1900);
    expect(model.proteinTarget).toBe(170);
  });
});
