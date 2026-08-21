import { parseISO, subDays } from 'date-fns';
import { estimateOneRepMax } from '@/lib/muscleInsights';
import type { Confidence, MetricObservation, MealDay, TrainingSet, WorkoutObservation } from './types';

export type TemporalHorizon = 'today' | 'week' | 'month';
export type TemporalTone = 'positive' | 'neutral' | 'watch' | 'insufficient';

export interface TemporalMetric {
  key: 'bodyweight' | 'training' | 'strength' | 'sleep' | 'protein';
  label: string;
  value: string;
  previous?: string;
  delta?: string;
  tone: TemporalTone;
  confidence: Confidence;
  detail: string;
}

export interface TemporalPanel {
  horizon: TemporalHorizon;
  eyebrow: string;
  title: string;
  subtitle: string;
  decision: string;
  decisionTone: TemporalTone;
  metrics: TemporalMetric[];
}

export interface TemporalAnalysis {
  today: TemporalPanel;
  week: TemporalPanel;
  month: TemporalPanel;
}

type Input = {
  metrics: MetricObservation[];
  meals: MealDay[];
  sets: TrainingSet[];
  workouts: WorkoutObservation[];
  proteinGoal: number;
  sleepGoal: number;
  endDate: string;
};

const n = (value: number, digits = 1) => Number(value.toFixed(digits));
const pct = (current: number, previous: number) => previous > 0 ? (current - previous) / previous * 100 : null;
const between = (date: string, from: Date, to: string) => parseISO(date) >= from && date <= to;

function confidenceFromCoverage(observed: number, expected: number): Confidence {
  if (!expected || observed <= 0) return 'insufficient';
  const coverage = observed / expected;
  if (coverage >= 0.75) return 'high';
  if (coverage >= 0.5) return 'moderate';
  return 'low';
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function periodData(input: Input, days: number, offsetDays = 0) {
  const end = subDays(parseISO(input.endDate), offsetDays);
  const start = subDays(end, days - 1);
  const endKey = end.toISOString().slice(0, 10);
  const metrics = input.metrics.filter(item => between(item.date, start, endKey));
  const meals = input.meals.filter(item => between(item.date, start, endKey));
  const sets = input.sets.filter(item => between(item.date, start, endKey));
  const workouts = input.workouts.filter(item => between(item.date, start, endKey));
  return { metrics, meals, sets, workouts, start, endKey };
}

function periodSummary(input: Input, days: number, offsetDays = 0) {
  const data = periodData(input, days, offsetDays);
  const weights = data.metrics.filter(item => Number(item.bodyweight) > 0).map(item => Number(item.bodyweight));
  const sleeps = data.metrics.filter(item => Number(item.sleep) > 0).map(item => Number(item.sleep));
  const proteinDays = data.meals.filter(item => item.protein > 0);
  const protein = proteinDays.map(item => item.protein);
  const workoutDates = new Set(data.workouts.map(item => item.date));
  const completedSets = data.sets.filter(item => item.reps > 0).length;
  return {
    avgWeight: average(weights), weightN: weights.length,
    avgSleep: average(sleeps), sleepN: sleeps.length,
    avgProtein: average(protein), proteinN: proteinDays.length,
    workouts: workoutDates.size,
    completedSets,
  };
}

function strengthIndex(sets: TrainingSet[], currentFrom: Date, currentTo: string, previousFrom: Date, previousTo: string) {
  const grouped = new Map<string, { current: number; previous: number }>();
  for (const set of sets) {
    if (!set.exercise || !set.date || set.reps <= 0 || set.weight <= 0) continue;
    const e1rm = estimateOneRepMax(set.weight, set.reps);
    const existing = grouped.get(set.exercise) ?? { current: 0, previous: 0 };
    if (between(set.date, currentFrom, currentTo)) existing.current = Math.max(existing.current, e1rm);
    if (between(set.date, previousFrom, previousTo)) existing.previous = Math.max(existing.previous, e1rm);
    grouped.set(set.exercise, existing);
  }
  const deltas = [...grouped.values()]
    .filter(item => item.current > 0 && item.previous > 0)
    .map(item => (item.current - item.previous) / item.previous * 100)
    .sort((a, b) => a - b);
  if (!deltas.length) return { delta: null, exercises: 0 };
  const middle = Math.floor(deltas.length / 2);
  const median = deltas.length % 2 ? deltas[middle] : (deltas[middle - 1] + deltas[middle]) / 2;
  return { delta: n(median, 1), exercises: deltas.length };
}

function deltaText(value: number | null, suffix = '%') {
  if (value == null || !Number.isFinite(value)) return undefined;
  return `${value > 0 ? '+' : ''}${n(value, 1)}${suffix}`;
}

function directionalTone(delta: number | null, positiveThreshold = 2, negativeThreshold = -2): TemporalTone {
  if (delta == null) return 'insufficient';
  if (delta >= positiveThreshold) return 'positive';
  if (delta <= negativeThreshold) return 'watch';
  return 'neutral';
}

function makeComparisonPanel(input: Input, horizon: 'week' | 'month', days: number): TemporalPanel {
  const current = periodSummary(input, days, 0);
  const previous = periodSummary(input, days, days);
  const currentStart = subDays(parseISO(input.endDate), days - 1);
  const previousEnd = subDays(parseISO(input.endDate), days);
  const previousStart = subDays(previousEnd, days - 1);
  const previousEndKey = previousEnd.toISOString().slice(0, 10);
  const allSets = input.sets;
  const strength = strengthIndex(allSets, currentStart, input.endDate, previousStart, previousEndKey);

  const weightDelta = current.avgWeight != null && previous.avgWeight != null ? current.avgWeight - previous.avgWeight : null;
  const workoutDelta = pct(current.workouts, previous.workouts);
  const sleepDelta = current.avgSleep != null && previous.avgSleep != null ? current.avgSleep - previous.avgSleep : null;
  const proteinDelta = current.avgProtein != null && previous.avgProtein != null ? current.avgProtein - previous.avgProtein : null;

  const metrics: TemporalMetric[] = [
    {
      key: 'bodyweight', label: 'Bodyweight',
      value: current.avgWeight == null ? 'No trend' : `${n(current.avgWeight)} kg`,
      previous: previous.avgWeight == null ? undefined : `${n(previous.avgWeight)} kg`,
      delta: weightDelta == null ? undefined : `${weightDelta > 0 ? '+' : ''}${n(weightDelta, 2)} kg`,
      tone: 'neutral', confidence: confidenceFromCoverage(current.weightN, Math.min(days, 7)),
      detail: `${current.weightN} weigh-ins in current ${days}-day window`,
    },
    {
      key: 'training', label: 'Training', value: `${current.workouts} sessions`, previous: `${previous.workouts} sessions`,
      delta: deltaText(workoutDelta), tone: directionalTone(workoutDelta, 20, -20),
      confidence: current.workouts >= 3 ? 'high' : current.workouts >= 1 ? 'moderate' : 'insufficient',
      detail: `${current.completedSets} completed resistance sets`,
    },
    {
      key: 'strength', label: 'Comparable strength', value: strength.delta == null ? 'No comparison' : `${strength.delta > 0 ? '+' : ''}${strength.delta}%`,
      delta: strength.delta == null ? undefined : `${strength.exercises} exercises`, tone: directionalTone(strength.delta, 2, -5),
      confidence: strength.exercises >= 4 ? 'high' : strength.exercises >= 2 ? 'moderate' : strength.exercises === 1 ? 'low' : 'insufficient',
      detail: strength.exercises ? `Median best-e1RM change across ${strength.exercises} exercises present in both windows` : 'Comparable exercises are required',
    },
    {
      key: 'sleep', label: 'Sleep', value: current.avgSleep == null ? 'No data' : `${n(current.avgSleep)}h`, previous: previous.avgSleep == null ? undefined : `${n(previous.avgSleep)}h`,
      delta: sleepDelta == null ? undefined : `${sleepDelta > 0 ? '+' : ''}${n(sleepDelta, 1)}h`,
      tone: current.avgSleep == null ? 'insufficient' : current.avgSleep < input.sleepGoal - 0.75 ? 'watch' : 'neutral',
      confidence: confidenceFromCoverage(current.sleepN, days), detail: `${current.sleepN}/${days} nights logged · ${input.sleepGoal}h goal`,
    },
    {
      key: 'protein', label: 'Protein', value: current.avgProtein == null ? 'No data' : `${Math.round(current.avgProtein)}g`, previous: previous.avgProtein == null ? undefined : `${Math.round(previous.avgProtein)}g`,
      delta: proteinDelta == null ? undefined : `${proteinDelta > 0 ? '+' : ''}${Math.round(proteinDelta)}g`,
      tone: current.avgProtein == null ? 'insufficient' : current.avgProtein < input.proteinGoal * 0.8 ? 'watch' : current.avgProtein >= input.proteinGoal ? 'positive' : 'neutral',
      confidence: confidenceFromCoverage(current.proteinN, days), detail: `${current.proteinN}/${days} intake days · ${input.proteinGoal}g target`,
    },
  ];

  const actionable = metrics.filter(metric => metric.tone === 'watch' && metric.confidence !== 'low' && metric.confidence !== 'insufficient');
  const positive = metrics.filter(metric => metric.tone === 'positive' && metric.confidence !== 'low' && metric.confidence !== 'insufficient');
  const decision = actionable.length
    ? `Review ${actionable.map(item => item.label.toLowerCase()).slice(0, 2).join(' and ')} before changing the plan.`
    : positive.length
      ? `The ${days}-day comparison supports keeping the current plan unless another high-confidence signal conflicts.`
      : `No ${days}-day change is strong enough to justify an automatic intervention.`;

  return {
    horizon,
    eyebrow: horizon === 'week' ? 'Week to week' : 'Month to month',
    title: horizon === 'week' ? 'Rolling 7 days' : 'Rolling 28 days',
    subtitle: `Compared with the previous ${days} days`,
    decision,
    decisionTone: actionable.length ? 'watch' : positive.length ? 'positive' : 'neutral',
    metrics,
  };
}

function makeTodayPanel(input: Input): TemporalPanel {
  const todayMetrics = input.metrics.filter(item => item.date === input.endDate);
  const todayMeals = input.meals.filter(item => item.date === input.endDate);
  const todaySets = input.sets.filter(item => item.date === input.endDate && item.reps > 0);
  const todayWorkouts = new Set(input.workouts.filter(item => item.date === input.endDate).map(item => item.date)).size;
  const previousMetric = input.metrics.filter(item => item.date < input.endDate).sort((a, b) => b.date.localeCompare(a.date))[0];
  const weight = todayMetrics.find(item => Number(item.bodyweight) > 0)?.bodyweight ?? null;
  const sleep = todayMetrics.find(item => Number(item.sleep) > 0)?.sleep ?? null;
  const protein = todayMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const previousWeight = Number(previousMetric?.bodyweight) > 0 ? Number(previousMetric?.bodyweight) : null;
  const weightDelta = weight != null && previousWeight != null ? Number(weight) - previousWeight : null;

  const metrics: TemporalMetric[] = [
    { key: 'bodyweight', label: 'Scale', value: weight == null ? 'Not logged' : `${n(Number(weight))} kg`, previous: previousWeight == null ? undefined : `${n(previousWeight)} kg prev`, delta: weightDelta == null ? undefined : `${weightDelta > 0 ? '+' : ''}${n(weightDelta, 2)} kg`, tone: 'neutral', confidence: weight == null ? 'insufficient' : 'low', detail: 'Daily scale movement is descriptive, not a calorie-adjustment signal.' },
    { key: 'training', label: 'Training today', value: todayWorkouts ? `${todayWorkouts} session` : 'No session', delta: todaySets.length ? `${todaySets.length} sets` : undefined, tone: 'neutral', confidence: todayWorkouts ? 'high' : 'low', detail: 'Today is an execution view, not a weekly-volume verdict.' },
    { key: 'sleep', label: 'Last sleep', value: sleep == null ? 'Not logged' : `${n(Number(sleep))}h`, tone: sleep == null ? 'insufficient' : Number(sleep) < input.sleepGoal - 0.75 ? 'watch' : 'neutral', confidence: sleep == null ? 'insufficient' : 'moderate', detail: `${input.sleepGoal}h configured sleep goal` },
    { key: 'protein', label: 'Protein logged', value: todayMeals.length ? `${Math.round(protein)}g` : 'No intake data', previous: `${input.proteinGoal}g target`, tone: 'neutral', confidence: todayMeals.length ? 'low' : 'insufficient', detail: 'Current-day nutrition is provisional until the day is complete.' },
  ];
  return {
    horizon: 'today', eyebrow: 'Day to day', title: 'Today', subtitle: 'Live execution state',
    decision: 'Use today to execute and observe. Reserve programme and calorie changes for repeated week-to-week or month-to-month signals.',
    decisionTone: metrics.some(metric => metric.key === 'sleep' && metric.tone === 'watch') ? 'watch' : 'neutral',
    metrics,
  };
}

export function buildTemporalAnalysis(input: Input): TemporalAnalysis {
  return {
    today: makeTodayPanel(input),
    week: makeComparisonPanel(input, 'week', 7),
    month: makeComparisonPanel(input, 'month', 28),
  };
}
