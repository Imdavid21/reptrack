import { differenceInCalendarDays, format, subDays } from 'date-fns';

export interface DataroomDateRange {
  from: Date;
  to: Date;
}

export interface PeriodMetricRow {
  date: string;
  bodyweight?: number | null;
  sleep_hours?: number | null;
}

export interface PeriodWorkoutRow {
  date: string;
  completed_at?: string | null;
  is_skipped?: boolean | null;
  workout_duration_minutes?: number | null;
}

export interface PeriodSetRow {
  workout_date?: string;
  completed?: boolean;
}

export interface PeriodMealRow {
  date: string;
  calories: number;
  protein: number;
}

export interface PeriodActivityRow {
  date: string;
  duration_minutes: number;
  distance_km?: number | null;
}

export interface DataroomPeriodSummary {
  days: number;
  weightLatest: number | null;
  weightFirst: number | null;
  weightChange: number | null;
  weightMeasurements: number;
  sleepAverage: number | null;
  sleepNights: number;
  workouts: number;
  sets: number;
  averageWorkoutMinutes: number | null;
  nutritionLoggedDays: number;
  caloriesPerLoggedDay: number | null;
  proteinPerLoggedDay: number | null;
  activityMinutes: number;
  activityDistanceKm: number;
}

const rounded = (value: number, places = 1) => Number(value.toFixed(places));

export function rangeDays(range: DataroomDateRange) {
  return Math.max(1, differenceInCalendarDays(range.to, range.from) + 1);
}

export function previousComparableRange(range: DataroomDateRange): DataroomDateRange {
  const days = rangeDays(range);
  const previousTo = subDays(range.from, 1);
  return { from: subDays(previousTo, days - 1), to: previousTo };
}

function inRange(date: string, range: DataroomDateRange) {
  const from = format(range.from, 'yyyy-MM-dd');
  const to = format(range.to, 'yyyy-MM-dd');
  return date >= from && date <= to;
}

export function summarizeDataroomPeriod(input: {
  range: DataroomDateRange;
  metrics: PeriodMetricRow[];
  workouts: PeriodWorkoutRow[];
  sets: PeriodSetRow[];
  meals: PeriodMealRow[];
  activities: PeriodActivityRow[];
}): DataroomPeriodSummary {
  const metrics = input.metrics.filter(row => inRange(row.date, input.range));
  const weightRows = metrics
    .filter(row => Number(row.bodyweight) > 0)
    .map(row => ({ date: row.date, value: Number(row.bodyweight) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const sleepRows = metrics.map(row => Number(row.sleep_hours)).filter(value => value > 0);
  const workouts = input.workouts.filter(workout => inRange(workout.date, input.range) && Boolean(workout.completed_at) && !workout.is_skipped);
  const durations = workouts.map(workout => Number(workout.workout_duration_minutes || 0)).filter(value => value > 0);
  const sets = input.sets.filter(set => set.completed !== false && set.workout_date && inRange(set.workout_date, input.range));
  const meals = input.meals.filter(meal => inRange(meal.date, input.range));
  const nutritionByDate = new Map<string, { calories: number; protein: number }>();
  meals.forEach(meal => {
    const existing = nutritionByDate.get(meal.date) ?? { calories: 0, protein: 0 };
    existing.calories += Number(meal.calories || 0);
    existing.protein += Number(meal.protein || 0);
    nutritionByDate.set(meal.date, existing);
  });
  const nutritionDays = [...nutritionByDate.values()].filter(day => day.calories > 0 || day.protein > 0);
  const activities = input.activities.filter(activity => inRange(activity.date, input.range));

  return {
    days: rangeDays(input.range),
    weightLatest: weightRows.length ? rounded(weightRows.at(-1)!.value, 2) : null,
    weightFirst: weightRows.length ? rounded(weightRows[0].value, 2) : null,
    weightChange: weightRows.length >= 2 ? rounded(weightRows.at(-1)!.value - weightRows[0].value, 2) : null,
    weightMeasurements: weightRows.length,
    sleepAverage: sleepRows.length ? rounded(sleepRows.reduce((sum, value) => sum + value, 0) / sleepRows.length, 2) : null,
    sleepNights: sleepRows.length,
    workouts: workouts.length,
    sets: sets.length,
    averageWorkoutMinutes: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
    nutritionLoggedDays: nutritionDays.length,
    caloriesPerLoggedDay: nutritionDays.length ? Math.round(nutritionDays.reduce((sum, day) => sum + day.calories, 0) / nutritionDays.length) : null,
    proteinPerLoggedDay: nutritionDays.length ? Math.round(nutritionDays.reduce((sum, day) => sum + day.protein, 0) / nutritionDays.length) : null,
    activityMinutes: Math.round(activities.reduce((sum, activity) => sum + Number(activity.duration_minutes || 0), 0)),
    activityDistanceKm: rounded(activities.reduce((sum, activity) => sum + Number(activity.distance_km || 0), 0), 1),
  };
}

export function absoluteDelta(current: number | null, previous: number | null, places = 1) {
  if (current == null || previous == null) return null;
  return rounded(current - previous, places);
}

export function percentDelta(current: number | null, previous: number | null, places = 1) {
  if (current == null || previous == null || previous === 0) return null;
  return rounded((current - previous) / Math.abs(previous) * 100, places);
}

export function evidenceCoverage(input: {
  days: number;
  weightMeasurements: number;
  workouts: number;
  nutritionLoggedDays: number;
  sleepNights: number;
  activitySessions: number;
}) {
  const days = Math.max(1, input.days);
  return {
    weight: { count: input.weightMeasurements, denominator: days, percent: Math.min(100, Math.round(input.weightMeasurements / days * 100)) },
    training: { count: input.workouts, denominator: null, percent: null },
    nutrition: { count: input.nutritionLoggedDays, denominator: days, percent: Math.min(100, Math.round(input.nutritionLoggedDays / days * 100)) },
    sleep: { count: input.sleepNights, denominator: days, percent: Math.min(100, Math.round(input.sleepNights / days * 100)) },
    activity: { count: input.activitySessions, denominator: null, percent: null },
  };
}
