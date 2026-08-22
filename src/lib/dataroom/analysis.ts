import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import { estimateOneRepMax } from '@/lib/muscleInsights';
import { getMuscleSubRegions } from '@/lib/exerciseClassification';
import { LANDMARKS } from '@/lib/muscleInsights';
import type {
  BodyweightAnalysis, Confidence, DataroomAnalysis, DataroomFinding, EnergyDay,
  ExerciseExposure, ExerciseTrend, MealDay, MetricObservation, MuscleExposure,
  NutritionAnalysis, RecoveryAnalysis, TrainingSet, TrendState, WorkoutObservation,
} from './types';

export const DATAROOM_WINDOWS = {
  immediateRecoveryDays: 14,
  bodyweightDays: 28,
  nutritionDays: 14,
  resistanceVolumeDays: 42,
  exerciseExposureCount: 6,
} as const;

export const DATAROOM_HEURISTICS = {
  stableWeightPercentPerWeek: 0.15,
  meaningfulStrengthChangePercent: 2,
  possibleDeclinePercent: -5,
  minimumDeclineExposures: 4,
  highWeightObservations: 8,
  moderateWeightObservations: 4,
  highNutritionCoverage: 0.75,
  moderateNutritionCoverage: 0.5,
} as const;

const round = (value: number, places = 1) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

const exposureCountForRange = (rangeDays: number) => {
  if (rangeDays <= 14) return 4;
  if (rangeDays <= 30) return 6;
  if (rangeDays <= 60) return 8;
  if (rangeDays <= 90) return 10;
  return 12;
};

export function confidenceDots(confidence: Confidence): number {
  return confidence === 'high' ? 3 : confidence === 'moderate' ? 2 : confidence === 'low' ? 1 : 0;
}

export function analyzeBodyweight(
  metrics: MetricObservation[],
  goal: 'lose' | 'gain' | 'maintain' | null,
  endDate: string,
  windowDays: number = DATAROOM_WINDOWS.bodyweightDays,
): BodyweightAnalysis {
  const start = subDays(parseISO(endDate), Math.max(1, windowDays) - 1);
  const observations = metrics
    .filter(m => m.bodyweight != null && Number(m.bodyweight) > 0 && parseISO(m.date) >= start && m.date <= endDate)
    .map(m => ({ date: m.date, kg: Number(m.bodyweight) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const points = observations.map(observation => {
    const lower = subDays(parseISO(observation.date), 6);
    const window = observations.filter(item => parseISO(item.date) >= lower && item.date <= observation.date);
    return { date: observation.date, raw: observation.kg, trend: round(window.reduce((sum, item) => sum + item.kg, 0) / window.length, 2) };
  });
  const spanDays = observations.length > 1 ? differenceInCalendarDays(parseISO(observations.at(-1)!.date), parseISO(observations[0].date)) : 0;
  const confidence: Confidence = observations.length >= DATAROOM_HEURISTICS.highWeightObservations && spanDays >= 14
    ? 'high' : observations.length >= DATAROOM_HEURISTICS.moderateWeightObservations && spanDays >= 7
      ? 'moderate' : observations.length >= 2 ? 'low' : 'insufficient';
  const change = points.length >= 2 ? points.at(-1)!.trend - points[0].trend : null;
  const weeklyChange = change != null && spanDays > 0 ? change / spanDays * 7 : null;
  const meanWeight = points.length ? points.reduce((sum, point) => sum + point.trend, 0) / points.length : 0;
  const percentPerWeek = weeklyChange != null && meanWeight > 0 ? weeklyChange / meanWeight * 100 : null;
  const direction = confidence === 'insufficient' || percentPerWeek == null ? 'unclear'
    : Math.abs(percentPerWeek) < DATAROOM_HEURISTICS.stableWeightPercentPerWeek ? 'stable'
      : percentPerWeek < 0 ? 'falling' : 'rising';
  const aligned = direction === 'unclear' || !goal ? null
    : goal === 'lose' ? direction === 'falling'
      : goal === 'gain' ? direction === 'rising'
        : direction === 'stable';
  return {
    latest: observations.at(-1)?.kg ?? null,
    trendWeight: points.at(-1)?.trend ?? null,
    change: change == null ? null : round(change, 2),
    percentPerWeek: percentPerWeek == null ? null : round(percentPerWeek, 2),
    direction,
    aligned,
    confidence,
    observations: observations.length,
    spanDays,
    windowDays,
    points,
  };
}

export function analyzeExerciseProgression(sets: TrainingSet[], exposureCount: number = DATAROOM_WINDOWS.exerciseExposureCount): ExerciseTrend[] {
  const grouped = new Map<string, Map<string, ExerciseExposure>>();
  for (const set of sets) {
    if (!set.exercise || !set.date || set.reps <= 0) continue;
    const byDate = grouped.get(set.exercise) ?? new Map<string, ExerciseExposure>();
    const candidate = { date: set.date, weight: set.weight, reps: set.reps, e1rm: round(estimateOneRepMax(set.weight, set.reps), 1), volume: set.weight * set.reps };
    const current = byDate.get(set.date);
    if (!current || candidate.e1rm > current.e1rm || (candidate.e1rm === current.e1rm && candidate.reps > current.reps)) byDate.set(set.date, candidate);
    grouped.set(set.exercise, byDate);
  }
  return [...grouped.entries()].map(([exercise, byDate]) => {
    const exposures = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-Math.max(2, exposureCount));
    const confidence: Confidence = exposures.length >= 4 ? 'high' : exposures.length >= 2 ? 'moderate' : exposures.length === 1 ? 'low' : 'insufficient';
    if (exposures.length < 2) return { exercise, state: 'unclear' as const, confidence, exposures, deltaPercent: null, progressionType: 'unclear' as const };
    const first = exposures[0];
    const last = exposures.at(-1)!;
    const deltaPercent = first.e1rm > 0 ? round((last.e1rm - first.e1rm) / first.e1rm * 100, 1) : null;
    const sameLoadRepGain = last.weight === first.weight && last.reps > first.reps;
    const loadGain = last.weight > first.weight && last.reps >= first.reps - 2;
    const meaningfulGain = deltaPercent != null && deltaPercent >= DATAROOM_HEURISTICS.meaningfulStrengthChangePercent;
    const recentThreeDown = exposures.length >= DATAROOM_HEURISTICS.minimumDeclineExposures && exposures.slice(-3).every(point => point.e1rm < first.e1rm * 0.95);
    let state: TrendState = 'stable';
    let progressionType: ExerciseTrend['progressionType'] = 'stable';
    if (sameLoadRepGain) { state = 'progressing'; progressionType = 'reps'; }
    else if (loadGain) { state = 'progressing'; progressionType = 'load'; }
    else if (meaningfulGain) { state = 'progressing'; progressionType = 'estimated-strength'; }
    else if (recentThreeDown && deltaPercent != null && deltaPercent <= DATAROOM_HEURISTICS.possibleDeclinePercent) { state = 'declining'; progressionType = 'possible-decline'; }
    return { exercise, state, confidence, exposures, deltaPercent, progressionType };
  }).sort((a, b) => b.exposures.length - a.exposures.length || (b.deltaPercent ?? -999) - (a.deltaPercent ?? -999));
}

export function analyzeMuscleExposure(sets: TrainingSet[], exerciseTrends: ExerciseTrend[], rangeDays: number = DATAROOM_WINDOWS.resistanceVolumeDays): MuscleExposure[] {
  const weeks = Math.max(rangeDays / 7, 1);
  const counts = new Map<string, number>();
  const muscleStates = new Map<string, TrendState[]>();
  const trendByExercise = new Map(exerciseTrends.map(trend => [trend.exercise, trend.state]));
  for (const set of sets) {
    for (const region of getMuscleSubRegions(set.exercise)) {
      counts.set(region.region, (counts.get(region.region) ?? 0) + region.fraction);
      const states = muscleStates.get(region.region) ?? [];
      states.push(trendByExercise.get(set.exercise) ?? 'unclear');
      muscleStates.set(region.region, states);
    }
  }
  return Object.entries(LANDMARKS).map(([muscle, band]) => {
    const setsPerWeek = round((counts.get(muscle) ?? 0) / weeks, 1);
    const referenceState = setsPerWeek === 0 ? 'none' : setsPerWeek < band.mev ? 'below' : setsPerWeek <= band.mav ? 'within' : setsPerWeek <= band.mrv ? 'above' : 'well-above';
    const states = muscleStates.get(muscle) ?? [];
    const progression: TrendState = states.includes('progressing') ? 'progressing' : states.filter(s => s === 'declining').length >= 2 ? 'declining' : states.some(s => s === 'stable') ? 'stable' : 'unclear';
    return { muscle, setsPerWeek, reference: { low: band.mev, high: band.mrv }, referenceState, progression };
  });
}

export function analyzeNutrition(meals: MealDay[], energy: EnergyDay[], weight: BodyweightAnalysis, windowDays: number = DATAROOM_WINDOWS.nutritionDays): NutritionAnalysis {
  const loggedDates = new Set(meals.map(meal => meal.date));
  const loggedDays = loggedDates.size;
  const coverage = loggedDays / Math.max(windowDays, 1);
  const confidence: Confidence = coverage >= DATAROOM_HEURISTICS.highNutritionCoverage ? 'moderate' : coverage >= DATAROOM_HEURISTICS.moderateNutritionCoverage ? 'low' : 'insufficient';
  const average = (key: 'calories' | 'protein' | 'fiber') => loggedDays ? meals.reduce((sum, meal) => sum + meal[key], 0) / loggedDays : null;
  const coveredEnergy = energy.filter(day => loggedDates.has(day.date) && day.intake != null);
  const energyBalance = coveredEnergy.length ? Math.round(coveredEnergy.reduce((sum, day) => sum + (day.intake! - day.expenditure), 0)) : null;
  const predictedDirection = energyBalance == null ? null : energyBalance < -500 ? 'falling' : energyBalance > 500 ? 'rising' : 'stable';
  const modelDisagreesWithWeight = confidence !== 'insufficient' && weight.confidence !== 'insufficient' && predictedDirection != null && weight.direction !== 'unclear' && predictedDirection !== weight.direction;
  return {
    loggedDays, windowDays, coverage: round(coverage * 100, 0), confidence,
    averageCalories: average('calories') == null ? null : Math.round(average('calories')!),
    averageProtein: average('protein') == null ? null : Math.round(average('protein')!),
    averageFiber: average('fiber') == null ? null : Math.round(average('fiber')!),
    energyBalance, modelDisagreesWithWeight,
  };
}

export function analyzeRecovery(
  metrics: MetricObservation[],
  workouts: WorkoutObservation[],
  exerciseTrends: ExerciseTrend[],
  sleepGoal: number,
  endDate: string,
  windowDays: number = DATAROOM_WINDOWS.immediateRecoveryDays,
): RecoveryAnalysis {
  const effectiveWindow = Math.max(1, Math.min(windowDays, DATAROOM_WINDOWS.immediateRecoveryDays));
  const start = subDays(parseISO(endDate), effectiveWindow - 1);
  const sleeps = metrics.filter(m => m.sleep != null && Number(m.sleep) > 0 && parseISO(m.date) >= start && m.date <= endDate).map(m => Number(m.sleep));
  const recentWorkouts = workouts.filter(w => parseISO(w.date) >= start && w.date <= endDate);
  const workoutDates = [...new Set(recentWorkouts.map(w => w.date))].sort();
  let consecutiveTrainingDays = 0;
  if (workoutDates.length) {
    consecutiveTrainingDays = 1;
    for (let i = workoutDates.length - 1; i > 0; i--) {
      if (differenceInCalendarDays(parseISO(workoutDates[i]), parseISO(workoutDates[i - 1])) === 1) consecutiveTrainingDays++;
      else break;
    }
  }
  const averageSleep = sleeps.length ? sleeps.reduce((sum, value) => sum + value, 0) / sleeps.length : null;
  const decliningLifts = exerciseTrends.filter(trend => trend.state === 'declining' && trend.confidence !== 'low').length;
  const highSleepCoverage = Math.min(8, Math.ceil(effectiveWindow * 0.6));
  const moderateSleepCoverage = Math.min(4, Math.ceil(effectiveWindow * 0.35));
  const confidence: Confidence = sleeps.length >= highSleepCoverage ? 'high' : sleeps.length >= moderateSleepCoverage ? 'moderate' : sleeps.length >= 2 ? 'low' : 'insufficient';
  const strained = averageSleep != null && averageSleep < sleepGoal - 0.75 && (consecutiveTrainingDays >= 3 || decliningLifts >= 2);
  const improving = averageSleep != null && averageSleep >= sleepGoal && exerciseTrends.filter(t => t.state === 'progressing').length >= 2;
  const state: RecoveryAnalysis['state'] = confidence === 'insufficient' ? 'insufficient' : strained ? 'strained' : improving ? 'improving' : 'normal';
  const reason = state === 'strained' ? `${round(averageSleep!, 1)}h sleep, ${consecutiveTrainingDays} consecutive training days, ${decliningLifts} lifts trending down`
    : state === 'improving' ? `${round(averageSleep!, 1)}h sleep with performance progressing`
      : state === 'normal' ? `${averageSleep == null ? 'Sleep unavailable' : `${round(averageSleep, 1)}h sleep`}; no repeated performance decline`
        : `Only ${sleeps.length} sleep ${sleeps.length === 1 ? 'entry' : 'entries'} in ${effectiveWindow} days`;
  return {
    state,
    confidence,
    averageSleep: averageSleep == null ? null : round(averageSleep, 1),
    sleepNights: sleeps.length,
    consecutiveTrainingDays,
    recentTrainingDays: workoutDates.length,
    windowDays: effectiveWindow,
    reason,
  };
}

function rankFindings(candidates: DataroomFinding[]): DataroomFinding[] {
  const seen = new Set<string>();
  return candidates.sort((a, b) => b.priority - a.priority).filter(item => {
    if (seen.has(item.domain)) return false;
    seen.add(item.domain);
    return true;
  }).slice(0, 3);
}

export function buildDataroomAnalysis(input: {
  metrics: MetricObservation[]; meals: MealDay[]; sets: TrainingSet[]; workouts: WorkoutObservation[];
  energy: EnergyDay[]; goal: 'lose' | 'gain' | 'maintain' | null; sleepGoal: number; proteinGoal: number; endDate: string; rangeDays?: number;
}): DataroomAnalysis {
  const rangeDays = Math.max(1, input.rangeDays ?? DATAROOM_WINDOWS.bodyweightDays);
  const weight = analyzeBodyweight(input.metrics, input.goal, input.endDate, rangeDays);
  const exercises = analyzeExerciseProgression(input.sets, exposureCountForRange(rangeDays));
  const muscles = analyzeMuscleExposure(input.sets, exercises, rangeDays);
  const nutrition = analyzeNutrition(input.meals, input.energy, weight, rangeDays);
  const recovery = analyzeRecovery(input.metrics, input.workouts, exercises, input.sleepGoal, input.endDate, rangeDays);
  const progressing = exercises.filter(item => item.state === 'progressing');
  const declining = exercises.filter(item => item.state === 'declining');
  const candidates: DataroomFinding[] = [];

  if (weight.aligned && progressing.length + exercises.filter(e => e.state === 'stable').length >= 2) candidates.push({
    id: 'trajectory-aligned', domain: 'bodyweight', title: input.goal === 'lose' ? 'Cut progressing while performance holds' : 'Bodyweight trajectory matches the plan',
    signal: `${weight.direction} at ${Math.abs(weight.percentPerWeek ?? 0).toFixed(2)}% per week`, evidence: [`${weight.observations} weigh-ins across ${weight.spanDays} days`, `${progressing.length} key lifts progressing; ${declining.length} repeatedly declining`, `Selected analysis range: ${rangeDays} days`],
    interpretation: 'Observed bodyweight and comparable training exposures support the current direction.', action: 'Keep calories and training unchanged.', actionKind: 'keep', confidence: weight.confidence, priority: 95,
  });
  if (nutrition.confidence === 'insufficient' || nutrition.confidence === 'low') candidates.push({
    id: 'nutrition-coverage', domain: 'nutrition', title: 'Energy data is incomplete', signal: `Meals logged on ${nutrition.loggedDays} of ${nutrition.windowDays} days`,
    evidence: [`${nutrition.coverage}% meal-log coverage`, 'Unlogged days are excluded, not treated as zero calories'], interpretation: 'The selected-range deficit cannot be estimated reliably.',
    action: 'Log more intake days before changing calories.', actionKind: 'log', confidence: 'high', priority: 90,
  }); else if (nutrition.modelDisagreesWithWeight) candidates.push({
    id: 'energy-disagreement', domain: 'nutrition', title: 'Energy model and scale trend disagree', signal: `Modeled balance ${nutrition.energyBalance! < 0 ? 'predicts loss' : 'predicts gain'}, while trend is ${weight.direction}`,
    evidence: [`${nutrition.loggedDays}/${nutrition.windowDays} intake days`, `${weight.observations} weigh-ins`], interpretation: 'Intake coverage, expenditure estimates, water weight, or the observation window may explain the mismatch.',
    action: 'Review the evidence; do not change calories yet.', actionKind: 'watch', confidence: 'moderate', priority: 92,
  });
  else if (nutrition.averageProtein != null && nutrition.averageProtein < input.proteinGoal * 0.8) candidates.push({
    id: 'protein-low', domain: 'nutrition', title: 'Protein is consistently below target', signal: `${nutrition.averageProtein}g average on logged days vs ${input.proteinGoal}g target`,
    evidence: [`${nutrition.loggedDays}/${nutrition.windowDays} days contain intake logs`, `Observed gap: ${Math.round(input.proteinGoal - nutrition.averageProtein)}g/day`], interpretation: 'Protein is a decision-relevant nutrition gap with adequate coverage to act conservatively.',
    action: `Add roughly ${Math.round(input.proteinGoal - nutrition.averageProtein)}g protein on logged days.`, actionKind: 'change', confidence: nutrition.confidence, priority: 84,
  });
  if (recovery.state === 'strained') candidates.push({ id: 'recovery-strained', domain: 'recovery', title: 'Recovery context is strained', signal: recovery.reason, evidence: [`${recovery.sleepNights}/${recovery.windowDays} nights logged`, `${recovery.recentTrainingDays} training days in ${recovery.windowDays} days`], interpretation: 'Short sleep and repeated workload/performance signals make additional training stress hard to justify.', action: 'Hold volume and prioritize recovery.', actionKind: 'change', confidence: recovery.confidence, priority: 94 });
  else candidates.push({ id: 'recovery-normal', domain: 'recovery', title: recovery.state === 'insufficient' ? 'Recovery evidence is limited' : 'Recovery context supports the current plan', signal: recovery.reason, evidence: [`${recovery.sleepNights}/${recovery.windowDays} nights logged`, `${recovery.recentTrainingDays} training days in ${recovery.windowDays} days`], interpretation: recovery.state === 'insufficient' ? 'There is not enough evidence to prescribe a recovery change.' : 'No repeated cross-domain recovery problem is visible.', action: recovery.state === 'insufficient' ? 'Log sleep; make no recovery change yet.' : 'Keep the current recovery approach.', actionKind: recovery.state === 'insufficient' ? 'log' : 'keep', confidence: recovery.confidence, priority: 55 });
  if (declining.length >= 2) candidates.push({ id: 'training-softening', domain: 'training', title: 'Several lifts may be softening', signal: `${declining.length} exercises declined across repeated comparable exposures`, evidence: declining.slice(0, 3).map(item => `${item.exercise}: ${item.deltaPercent}% estimated-strength change`), interpretation: 'The pattern is broader than one poor session and deserves review alongside recovery and energy context.', action: 'Review; do not replace exercises automatically.', actionKind: 'watch', confidence: 'moderate', priority: 88 });
  else if (progressing.length) candidates.push({ id: 'training-working', domain: 'training', title: 'Current training is producing progression', signal: `${progressing.length} exercises improved across comparable exposures`, evidence: progressing.slice(0, 3).map(item => `${item.exercise}: ${item.progressionType.replace('-', ' ')}`), interpretation: 'A working prescription should not be changed without stronger contrary evidence.', action: 'Keep the current exercise selection and volume.', actionKind: 'keep', confidence: progressing.some(item => item.confidence === 'high') ? 'high' : 'moderate', priority: 82 });
  else {
    const smallIncreaseCandidate = muscles.find(muscle => muscle.referenceState === 'below' && muscle.progression === 'stable' && muscle.setsPerWeek > 0);
    if (smallIncreaseCandidate && recovery.state === 'normal' && exercises.filter(exercise => exercise.state === 'stable' && exercise.confidence !== 'low').length >= 2) candidates.push({
      id: 'small-volume-test', domain: 'training', title: `${smallIncreaseCandidate.muscle} exposure may be worth a small test`, signal: `${smallIncreaseCandidate.setsPerWeek} direct sets/week with stable recent performance`,
      evidence: [`Reference band ${smallIncreaseCandidate.reference.low}–${smallIncreaseCandidate.reference.high} sets/week`, 'Recovery context is normal', 'No repeated performance improvement is visible'], interpretation: 'Low direct exposure is only actionable because performance is also flat and recovery does not appear strained.',
      action: `Consider adding one ${smallIncreaseCandidate.muscle.toLowerCase()} set, then reassess.`, actionKind: 'change', confidence: 'moderate', priority: 76,
    });
  }

  const findings = rankFindings(candidates);
  const headline = findings[0]?.title ?? 'No change is currently justified by the available data';
  const confidence = findings[0]?.confidence ?? 'insufficient';
  return { headline, confidence, rangeDays, weight, exercises, muscles, nutrition, recovery, findings };
}
