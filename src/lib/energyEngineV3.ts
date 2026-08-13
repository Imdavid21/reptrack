export const ENERGY_MODEL_VERSION = 3;
export const KCAL_PER_KG_BODY_MASS = 7700;

export type EnergyConfidence = 'low' | 'medium' | 'high';
export type WeightSource = 'smoothed_recent' | 'recent_measurement' | 'nearest_historical' | 'profile_initial' | 'generic_fallback';
export type ActivityKind = 'walking' | 'running' | 'cycling' | 'boxing' | 'other';
export type PaceSource = 'actual_timing' | 'personal_recent' | 'personal_historical' | 'generic_fallback';
export type WorkoutIntensity = 'light' | 'normal' | 'vigorous';

export interface WeightObservation { date: string; kg: number }
export interface EffectiveWeight {
  kg: number;
  source: WeightSource;
  confidence: EnergyConfidence;
  observationCount: number;
  isFallback: boolean;
}

export interface ActivityObservation {
  date: string;
  activityType: string;
  distanceKm?: number | null;
  durationMinutes?: number | null;
}

export interface ActivityEstimate {
  kind: ActivityKind;
  durationMinutes: number;
  distanceKm: number | null;
  paceMinutesPerKm: number | null;
  paceSource: PaceSource;
  met: number;
  netKcal: number;
  confidence: EnergyConfidence;
  effectiveWeightKg: number;
  warnings: string[];
  modelVersion: 3;
}

export interface WorkoutEnergyInput {
  durationMinutes: number;
  pausedSeconds?: number;
  completedSets: number;
  plannedSets?: number;
  compoundSets?: number;
  isolationSets?: number;
  averageRir?: number | null;
  weightKg: number;
  hasActualFinish?: boolean;
}

export interface WorkoutEnergyEstimate {
  intensity: WorkoutIntensity;
  met: number;
  activeDurationMinutes: number;
  netKcal: number;
  confidence: EnergyConfidence;
  range: [number, number];
  modelVersion: 3;
}

export interface NutritionDay {
  date: string;
  calories: number;
  mealTypes: string[];
  confirmedMeals?: number;
  totalMeals?: number;
}

export interface CalibrationDay extends NutritionDay {
  predictedTdee: number;
  weightKg?: number | null;
}

export interface CalibrationResult {
  eligible: boolean;
  confidence: EnergyConfidence;
  qualityScore: number;
  reason: string;
  observedTdee: number | null;
  predictedTdee: number | null;
  previousAdjustment: number;
  adjustment: number;
  change: number;
  usableDays: number;
  weighIns: number;
}

export interface DailyEnergyModel {
  date: string;
  effectiveWeight: EffectiveWeight;
  age: number;
  ree: number;
  nonexerciseFactor: number;
  formulaBaseline: number;
  calibrationAdjustment: number;
  personalBaseline: number;
  deliberateActivity: number;
  workoutActivity: number;
  otherActivity: number;
  predictedTdee: number;
  calibratedTdee: number;
  foodIntake: number;
  energyBalance: number;
  likelyRange: [number, number];
  confidence: EnergyConfidence;
  calorieTarget: number;
  proteinTarget: number;
  targetAdjustment: number;
  targetReason: string;
  modelVersion: 3;
}

const DAY_MS = 86_400_000;
const GENERIC_WEIGHT_KG = 70;

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function roundTo(value: number, increment: number) { return Math.round(value / increment) * increment; }
function localNoon(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, Math.max(0, month - 1), day || 1, 12);
}
function dayDistance(a: string | Date, b: string | Date) { return Math.round((localNoon(a).getTime() - localNoon(b).getTime()) / DAY_MS); }
function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function validWeight(kg: number) { return Number.isFinite(kg) && kg >= 25 && kg <= 350; }
function confidenceRank(value: EnergyConfidence) { return value === 'high' ? 2 : value === 'medium' ? 1 : 0; }
function lowerConfidence(a: EnergyConfidence, b: EnergyConfidence): EnergyConfidence { return confidenceRank(a) <= confidenceRank(b) ? a : b; }

export function collapseSameDayWeights(observations: WeightObservation[]): WeightObservation[] {
  const byDate = new Map<string, number[]>();
  observations.forEach(item => {
    if (!validWeight(Number(item.kg))) return;
    const date = item.date.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) || []), Number(item.kg)]);
  });
  return [...byDate.entries()].map(([date, values]) => ({ date, kg: median(values) })).sort((a, b) => a.date.localeCompare(b.date));
}

export function rejectWeightOutliers(observations: WeightObservation[]): WeightObservation[] {
  if (observations.length < 4) return observations;
  const center = median(observations.map(item => item.kg));
  const mad = median(observations.map(item => Math.abs(item.kg - center)));
  const threshold = Math.max(3, mad * 4.5);
  return observations.filter(item => Math.abs(item.kg - center) <= threshold);
}

export function effectiveWeightAt(
  observations: WeightObservation[],
  date: string | Date,
  profileInitialWeightKg?: number | null,
): EffectiveWeight {
  const clean = rejectWeightOutliers(collapseSameDayWeights(observations));
  const preceding = clean.filter(item => { const days = dayDistance(date, item.date); return days >= 0 && days <= 14; });
  const surrounding = clean.filter(item => Math.abs(dayDistance(date, item.date)) <= 14);
  const candidates = preceding.length >= 2 ? preceding : surrounding.length >= 2 ? surrounding : preceding;

  if (candidates.length >= 2) {
    let totalWeight = 0;
    let total = 0;
    candidates.forEach(item => {
      const distance = Math.abs(dayDistance(date, item.date));
      const futurePenalty = dayDistance(date, item.date) < 0 ? 0.6 : 1;
      const recency = Math.exp(-distance / 7) * futurePenalty;
      total += item.kg * recency;
      totalWeight += recency;
    });
    return { kg: Math.round((total / totalWeight) * 100) / 100, source: 'smoothed_recent', confidence: candidates.length >= 4 ? 'high' : 'medium', observationCount: candidates.length, isFallback: false };
  }

  if (candidates.length === 1) {
    return { kg: candidates[0].kg, source: 'recent_measurement', confidence: 'medium', observationCount: 1, isFallback: false };
  }

  if (clean.length) {
    const nearest = [...clean].sort((a, b) => Math.abs(dayDistance(date, a.date)) - Math.abs(dayDistance(date, b.date)))[0];
    return { kg: nearest.kg, source: 'nearest_historical', confidence: 'low', observationCount: 1, isFallback: false };
  }

  if (validWeight(Number(profileInitialWeightKg))) {
    return { kg: Number(profileInitialWeightKg), source: 'profile_initial', confidence: 'low', observationCount: 0, isFallback: true };
  }

  return { kg: GENERIC_WEIGHT_KG, source: 'generic_fallback', confidence: 'low', observationCount: 0, isFallback: true };
}

export function ageOnDate(dateOfBirth: string | null | undefined, date: string | Date, legacyAge?: number | null): number {
  if (!dateOfBirth) return clamp(Math.round(Number(legacyAge) || 30), 13, 100);
  const birth = localNoon(dateOfBirth);
  const at = localNoon(date);
  let age = at.getFullYear() - birth.getFullYear();
  if (at.getMonth() < birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())) age--;
  return clamp(age, 13, 100);
}

export function calculateRee(weightKg: number, heightCm: number, age: number, sex: string | null | undefined): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

export function nonexerciseBaselineFactor(lifestyle?: string | null): number {
  switch (lifestyle) {
    case 'physically_active_occupation':
    case 'very_active': return 1.45;
    case 'mixed_seated_standing':
    case 'active':
    case 'moderate': return 1.32;
    case 'light': return 1.25;
    case 'mostly_seated':
    default: return 1.2;
  }
}

export function netActivityKcal(met: number, weightKg: number, durationMinutes: number): number {
  if (![met, weightKg, durationMinutes].every(Number.isFinite) || met <= 1 || weightKg <= 0 || durationMinutes <= 0) return 0;
  return Math.max(0, (met - 1) * 3.5 * weightKg / 200 * durationMinutes);
}

export const GENERIC_PACE_MIN_PER_KM: Record<'walking' | 'running' | 'cycling', number> = {
  walking: 12,
  running: 6,
  cycling: 3,
};

export function resolvePersonalPace(
  kind: 'walking' | 'running' | 'cycling',
  history: ActivityObservation[],
  date: string | Date,
): { paceMinutesPerKm: number; source: Exclude<PaceSource, 'actual_timing'>; confidence: EnergyConfidence } {
  const valid = history.filter(item => item.activityType === kind && Number(item.distanceKm) > 0 && Number(item.durationMinutes) > 0)
    .map(item => ({ ...item, pace: Number(item.durationMinutes) / Number(item.distanceKm) }))
    .filter(item => Number.isFinite(item.pace) && item.pace > 0 && item.pace < 60 && dayDistance(date, item.date) >= 0);
  const recent = valid.filter(item => dayDistance(date, item.date) <= 60).slice(-12);
  if (recent.length >= 2) return { paceMinutesPerKm: median(recent.map(item => item.pace)), source: 'personal_recent', confidence: recent.length >= 4 ? 'high' : 'medium' };
  if (valid.length) return { paceMinutesPerKm: median(valid.map(item => item.pace)), source: 'personal_historical', confidence: 'medium' };
  return { paceMinutesPerKm: GENERIC_PACE_MIN_PER_KM[kind], source: 'generic_fallback', confidence: 'low' };
}

export function metForPace(kind: 'walking' | 'running' | 'cycling', paceMinutesPerKm: number): number {
  const speedKmh = clamp(60 / Math.max(0.1, paceMinutesPerKm), kind === 'cycling' ? 4 : kind === 'running' ? 3 : 1, kind === 'cycling' ? 55 : kind === 'running' ? 28 : 9);
  if (kind === 'walking') return (0.1 * speedKmh * 1000 / 60 + 3.5) / 3.5;
  if (kind === 'running') return (0.2 * speedKmh * 1000 / 60 + 3.5) / 3.5;
  const curve: [number, number][] = [[8,3],[16.1,4],[19.3,6.8],[22.5,8],[25.7,10],[30.6,12],[32.2,15.8]];
  if (speedKmh <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (speedKmh <= curve[i][0]) {
      const [x1, y1] = curve[i - 1]; const [x2, y2] = curve[i];
      return y1 + (speedKmh - x1) / (x2 - x1) * (y2 - y1);
    }
  }
  return curve[curve.length - 1][1];
}

export function estimateActivity({
  kind,
  date,
  weight,
  distanceKm,
  durationMinutes,
  history = [],
  boxingIntensity = 'normal',
}: {
  kind: ActivityKind;
  date: string | Date;
  weight: EffectiveWeight | number;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  history?: ActivityObservation[];
  boxingIntensity?: 'technique' | 'normal' | 'conditioning' | 'sparring';
}): ActivityEstimate {
  const resolvedWeight = typeof weight === 'number' ? { kg: weight, confidence: 'medium' as EnergyConfidence } : weight;
  const warnings: string[] = [];
  const distance = Number(distanceKm) > 0 ? Number(distanceKm) : null;
  let duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 0;
  let pace: number | null = null;
  let paceSource: PaceSource = 'actual_timing';
  let paceConfidence: EnergyConfidence = 'high';

  if (distance && distance > (kind === 'cycling' ? 500 : 100)) warnings.push('implausible_distance');
  if (duration > 1440) warnings.push('implausible_duration');

  if ((kind === 'walking' || kind === 'running' || kind === 'cycling') && distance) {
    if (duration > 0) pace = duration / distance;
    else {
      const inferred = resolvePersonalPace(kind, history, date);
      pace = inferred.paceMinutesPerKm;
      paceSource = inferred.source;
      paceConfidence = inferred.confidence;
      duration = distance * pace;
    }
  }

  const met = kind === 'boxing'
    ? ({ technique: 4.5, normal: 6, conditioning: 8, sparring: 9 } as const)[boxingIntensity]
    : kind === 'other'
      ? 4
      : metForPace(kind, pace || GENERIC_PACE_MIN_PER_KM[kind]);
  const confidence = lowerConfidence(resolvedWeight.confidence, paceConfidence);
  return {
    kind,
    durationMinutes: Math.round(duration * 10) / 10,
    distanceKm: distance,
    paceMinutesPerKm: pace ? Math.round(pace * 100) / 100 : null,
    paceSource,
    met: Math.round(met * 100) / 100,
    netKcal: Math.round(netActivityKcal(met, resolvedWeight.kg, duration) * 10) / 10,
    confidence: warnings.length ? 'low' : confidence,
    effectiveWeightKg: resolvedWeight.kg,
    warnings,
    modelVersion: ENERGY_MODEL_VERSION,
  };
}

export function estimateWorkoutEnergy(input: WorkoutEnergyInput): WorkoutEnergyEstimate {
  const rawActiveDuration = input.durationMinutes - (input.pausedSeconds || 0) / 60;
  const suspiciousDuration = rawActiveDuration > 8 * 60;
  const activeDurationMinutes = clamp(rawActiveDuration, 0, 8 * 60);
  const sets = Math.max(0, input.completedSets);
  const density = activeDurationMinutes > 0 ? sets / activeDurationMinutes : 0;
  const compoundRatio = sets > 0 ? (input.compoundSets || 0) / sets : 0;
  const completion = input.plannedSets ? sets / Math.max(1, input.plannedSets) : 1;
  let intensity: WorkoutIntensity = 'normal';
  if (sets <= 5 || activeDurationMinutes < 20 || completion < 0.35) intensity = 'light';
  else if (sets >= 14 && activeDurationMinutes >= 40 && (density >= 0.18 || compoundRatio >= 0.45 || (input.averageRir != null && input.averageRir <= 1.5))) intensity = 'vigorous';
  const met = intensity === 'light' ? 3.5 : intensity === 'vigorous' ? 5.5 : 4.5;
  const netKcal = netActivityKcal(met, input.weightKg, activeDurationMinutes);
  const confidence: EnergyConfidence = input.hasActualFinish === false || suspiciousDuration ? 'low' : sets >= 8 && activeDurationMinutes >= 25 ? 'medium' : 'low';
  const uncertainty = confidence === 'medium' ? 0.18 : 0.3;
  return {
    intensity,
    met,
    activeDurationMinutes: Math.round(activeDurationMinutes * 10) / 10,
    netKcal: Math.round(netKcal * 10) / 10,
    confidence,
    range: [Math.round(netKcal * (1 - uncertainty)), Math.round(netKcal * (1 + uncertainty))],
    modelVersion: ENERGY_MODEL_VERSION,
  };
}

export function nutritionCompleteness(day: NutritionDay, typicalCalories?: number): { score: number; confidence: EnergyConfidence; complete: boolean } {
  const mealTypeCount = new Set(day.mealTypes).size;
  const mealCount = day.totalMeals ?? day.mealTypes.length;
  const confirmedRatio = mealCount ? (day.confirmedMeals ?? mealCount) / mealCount : 0;
  const relative = typicalCalories && typicalCalories > 0 ? day.calories / typicalCalories : day.calories >= 1200 ? 1 : day.calories / 1200;
  let score = Math.min(1, mealTypeCount / 3) * 0.5 + clamp(relative, 0, 1) * 0.35 + clamp(confirmedRatio, 0, 1) * 0.15;
  if (day.calories < 600) score *= 0.35;
  if (day.calories > 8000) score *= 0.2;
  score = Math.round(score * 100) / 100;
  return { score, confidence: score >= 0.8 ? 'high' : score >= 0.55 ? 'medium' : 'low', complete: score >= 0.7 };
}

function trendDeltaKg(days: CalibrationDay[]): { delta: number; weighIns: number } | null {
  const weighted = days.filter(day => validWeight(Number(day.weightKg)));
  if (weighted.length < 4) return null;
  const third = Math.max(2, Math.floor(weighted.length / 3));
  return { delta: median(weighted.slice(-third).map(day => Number(day.weightKg))) - median(weighted.slice(0, third).map(day => Number(day.weightKg))), weighIns: weighted.length };
}

export function calibrateEnergyModel(days: CalibrationDay[], previousAdjustment = 0): CalibrationResult {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-42);
  const span = ordered.length > 1 ? dayDistance(ordered[ordered.length - 1].date, ordered[0].date) : 0;
  const positiveIntakes = ordered.map(day => day.calories).filter(value => value >= 600);
  const typical = median(positiveIntakes);
  const usable = ordered.filter(day => nutritionCompleteness(day, typical).score >= 0.55 && day.predictedTdee > 0);
  const trend = trendDeltaKg(ordered);
  const distribution = trend && ordered.length ? new Set(ordered.filter(day => validWeight(Number(day.weightKg))).map(day => Math.floor(dayDistance(day.date, ordered[0].date) / 7))).size : 0;
  const foodCoverage = ordered.length ? usable.length / ordered.length : 0;
  const qualityScore = Math.round(clamp((span / 28) * 0.25 + (Math.min(trend?.weighIns || 0, 10) / 10) * 0.25 + foodCoverage * 0.4 + (distribution >= 2 ? 0.1 : 0), 0, 1) * 100) / 100;
  const eligible = span >= 21 && usable.length >= 15 && (trend?.weighIns || 0) >= 6 && foodCoverage >= 0.65 && distribution >= 3;
  if (!eligible || !trend) return { eligible: false, confidence: 'low', qualityScore, reason: span < 21 ? 'Needs at least 3 weeks of data' : foodCoverage < 0.65 ? 'Food logging is too incomplete' : 'Needs more distributed weigh-ins', observedTdee: null, predictedTdee: null, previousAdjustment, adjustment: previousAdjustment, change: 0, usableDays: usable.length, weighIns: trend?.weighIns || 0 };

  const averageIntake = usable.reduce((sum, day) => sum + day.calories, 0) / usable.length;
  const averagePredicted = usable.reduce((sum, day) => sum + day.predictedTdee, 0) / usable.length;
  const elapsed = Math.max(1, span);
  const observedTdee = averageIntake - trend.delta * KCAL_PER_KG_BODY_MASS / elapsed;
  const rawError = clamp(observedTdee - averagePredicted, -500, 500);
  const confidence: EnergyConfidence = qualityScore >= 0.85 && span >= 28 ? 'high' : 'medium';
  const learningRate = confidence === 'high' ? 0.25 : 0.12;
  const maxPeriodChange = confidence === 'high' ? 75 : 40;
  const change = clamp(rawError * learningRate, -maxPeriodChange, maxPeriodChange);
  const adjustment = clamp(previousAdjustment + change, -500, 500);
  return { eligible, confidence, qualityScore, reason: `Based on ${span} days of weight and food history`, observedTdee: Math.round(observedTdee), predictedTdee: Math.round(averagePredicted), previousAdjustment, adjustment: Math.round(adjustment), change: Math.round(change), usableDays: usable.length, weighIns: trend.weighIns };
}

export function estimateUncertainty({ weightConfidence, activityConfidences, calibrationConfidence, baseline }: { weightConfidence: EnergyConfidence; activityConfidences: EnergyConfidence[]; calibrationConfidence: EnergyConfidence; baseline: number }): { confidence: EnergyConfidence; range: [number, number] } {
  const scores = [weightConfidence, calibrationConfidence, ...activityConfidences].map(value => confidenceRank(value));
  const average = scores.reduce((sum, value) => sum + value, 0) / Math.max(1, scores.length);
  const confidence: EnergyConfidence = average >= 1.6 ? 'high' : average >= 0.8 ? 'medium' : 'low';
  const ratio = confidence === 'high' ? 0.08 : confidence === 'medium' ? 0.12 : 0.18;
  return { confidence, range: [Math.round(baseline * (1 - ratio)), Math.round(baseline * (1 + ratio))] };
}

export function deriveProteinTarget(weightKg: number, goal: 'lose' | 'gain' | 'maintain' | null | undefined): number {
  const perKg = goal === 'lose' ? 2.2 : goal === 'gain' ? 1.8 : 2;
  return roundTo(clamp(weightKg * perKg, 80, 300), 5);
}

export function smoothCalorieTarget(previous: number | null | undefined, ideal: number): number {
  const rounded = roundTo(clamp(ideal, 1000, 5000), 25);
  if (!previous || previous <= 0) return rounded;
  if (Math.abs(rounded - previous) < 75) return roundTo(previous, 25);
  return roundTo(previous + clamp(rounded - previous, -100, 100), 25);
}

export function buildDailyEnergyModel({
  date,
  weights,
  profileInitialWeightKg,
  dateOfBirth,
  legacyAge,
  heightCm,
  sex,
  lifestyle,
  calibrationAdjustment = 0,
  workoutActivity = 0,
  otherActivity = 0,
  foodIntake = 0,
  goal,
  desiredAdjustment,
  previousCalorieTarget,
  lockedCalorieTarget,
  lockedProteinTarget,
  activityConfidences = [],
  calibrationConfidence = 'low',
}: {
  date: string;
  weights: WeightObservation[];
  profileInitialWeightKg?: number | null;
  dateOfBirth?: string | null;
  legacyAge?: number | null;
  heightCm: number;
  sex?: string | null;
  lifestyle?: string | null;
  calibrationAdjustment?: number;
  workoutActivity?: number;
  otherActivity?: number;
  foodIntake?: number;
  goal?: 'lose' | 'gain' | 'maintain' | null;
  desiredAdjustment?: number;
  previousCalorieTarget?: number | null;
  lockedCalorieTarget?: number | null;
  lockedProteinTarget?: number | null;
  activityConfidences?: EnergyConfidence[];
  calibrationConfidence?: EnergyConfidence;
}): DailyEnergyModel {
  const effectiveWeight = effectiveWeightAt(weights, date, profileInitialWeightKg);
  const age = ageOnDate(dateOfBirth, date, legacyAge);
  const ree = calculateRee(effectiveWeight.kg, heightCm, age, sex);
  const nonexerciseFactor = nonexerciseBaselineFactor(lifestyle);
  const formulaBaseline = Math.round(ree * nonexerciseFactor);
  const personalBaseline = Math.round(formulaBaseline + clamp(calibrationAdjustment, -500, 500));
  const deliberateActivity = Math.max(0, workoutActivity + otherActivity);
  const predictedTdee = Math.round(formulaBaseline + deliberateActivity);
  const calibratedTdee = Math.round(personalBaseline + deliberateActivity);
  const targetAdjustment = desiredAdjustment ?? (goal === 'lose' ? -500 : goal === 'gain' ? 250 : 0);
  const idealTarget = calibratedTdee + targetAdjustment;
  const calorieTarget = lockedCalorieTarget && lockedCalorieTarget > 0 ? Math.round(lockedCalorieTarget) : smoothCalorieTarget(previousCalorieTarget, idealTarget);
  const proteinTarget = lockedProteinTarget && lockedProteinTarget > 0 ? Math.round(lockedProteinTarget) : deriveProteinTarget(effectiveWeight.kg, goal);
  const uncertainty = estimateUncertainty({ weightConfidence: effectiveWeight.confidence, activityConfidences, calibrationConfidence, baseline: calibratedTdee });
  return {
    date,
    effectiveWeight,
    age,
    ree,
    nonexerciseFactor,
    formulaBaseline,
    calibrationAdjustment: Math.round(calibrationAdjustment),
    personalBaseline,
    deliberateActivity: Math.round(deliberateActivity),
    workoutActivity: Math.round(workoutActivity),
    otherActivity: Math.round(otherActivity),
    predictedTdee,
    calibratedTdee,
    foodIntake: Math.round(foodIntake),
    energyBalance: Math.round(foodIntake - calibratedTdee),
    likelyRange: uncertainty.range,
    confidence: uncertainty.confidence,
    calorieTarget,
    proteinTarget,
    targetAdjustment,
    targetReason: lockedCalorieTarget ? 'Manual target locked by you' : calibrationAdjustment ? 'Personalised from recent weight, food, and activity trends' : 'Formula estimate using current weight and goal',
    modelVersion: ENERGY_MODEL_VERSION,
  };
}
