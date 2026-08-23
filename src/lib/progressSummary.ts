import type { DailyMetric } from '@/hooks/useDailyMetrics';
import type { Workout } from '@/hooks/useWorkouts';

export type ProgressRangeKey = '7D' | '30D' | '3M' | '6M' | '1Y';

export const PROGRESS_RANGE_DAYS: Record<ProgressRangeKey, number> = {
  '7D': 7,
  '30D': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

export interface WeightSummary {
  latest: number | null;
  latestDate: string | null;
  average7d: number | null;
  change: number | null;
  weeklyRate: number | null;
  measurements: number;
}

const rounded = (value: number, digits = 2) => Number(value.toFixed(digits));

export function summarizeWeight(metrics: DailyMetric[], rangeDays: number): WeightSummary {
  const rows = metrics
    .filter(row => Number(row.bodyweight) > 0)
    .map(row => ({ date: row.date, value: Number(row.bodyweight) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!rows.length) {
    return { latest: null, latestDate: null, average7d: null, change: null, weeklyRate: null, measurements: 0 };
  }

  const latest = rows[rows.length - 1];
  const latestMs = new Date(`${latest.date}T12:00:00`).getTime();
  const sevenDayRows = rows.filter(row => latestMs - new Date(`${row.date}T12:00:00`).getTime() <= 6 * 86_400_000);
  const rangeRows = rows.filter(row => latestMs - new Date(`${row.date}T12:00:00`).getTime() <= Math.max(0, rangeDays - 1) * 86_400_000);
  const first = rangeRows[0] ?? latest;
  const firstMs = new Date(`${first.date}T12:00:00`).getTime();
  const elapsedDays = Math.max(1, (latestMs - firstMs) / 86_400_000);
  const change = rangeRows.length >= 2 ? latest.value - first.value : null;

  return {
    latest: rounded(latest.value),
    latestDate: latest.date,
    average7d: sevenDayRows.length ? rounded(sevenDayRows.reduce((sum, row) => sum + row.value, 0) / sevenDayRows.length) : null,
    change: change == null ? null : rounded(change),
    weeklyRate: change == null || elapsedDays < 6 ? null : rounded(change / elapsedDays * 7),
    measurements: rangeRows.length,
  };
}

export function summarizeSleep(metrics: DailyMetric[]) {
  const values = metrics.map(row => Number(row.sleep_hours)).filter(value => value > 0);
  return {
    average: values.length ? rounded(values.reduce((sum, value) => sum + value, 0) / values.length) : null,
    observations: values.length,
  };
}

export function summarizeTraining(workouts: Workout[], startDate: string, endDate: string) {
  const completed = workouts.filter(workout =>
    workout.date >= startDate && workout.date <= endDate &&
    Boolean(workout.completed_at) && !(workout as Workout & { is_skipped?: boolean }).is_skipped,
  );
  const completedSets = completed.reduce((sum, workout) => sum + (workout.exercises || []).reduce((exerciseSum, exercise) => exerciseSum + exercise.sets.filter(set => set.completed).length, 0), 0);
  const durations = completed.map(workout => Number(workout.workout_duration_minutes || 0)).filter(value => value > 0);
  return {
    workouts: completed.length,
    sets: completedSets,
    averageDuration: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
  };
}

export function progressInterpretation(input: {
  weight: WeightSummary;
  workouts: number;
  rangeDays: number;
  sleepAverage: number | null;
}) {
  const parts: string[] = [];
  if (input.weight.weeklyRate != null) {
    const magnitude = Math.abs(input.weight.weeklyRate).toFixed(2);
    if (input.weight.weeklyRate < -0.05) parts.push(`Bodyweight is trending down about ${magnitude} kg/week.`);
    else if (input.weight.weeklyRate > 0.05) parts.push(`Bodyweight is trending up about ${magnitude} kg/week.`);
    else parts.push('Bodyweight is broadly stable.');
  } else if (input.weight.measurements > 0) {
    parts.push('More weigh-ins are needed for a useful rate.');
  }

  if (input.workouts > 0) {
    const weekly = input.workouts / input.rangeDays * 7;
    parts.push(`Training frequency is ${weekly.toFixed(1)} sessions/week in this range.`);
  }

  if (input.sleepAverage != null && input.sleepAverage < 6.5) {
    parts.push('Logged sleep is averaging under 6.5 hours.');
  }

  return parts.slice(0, 2).join(' ') || 'Keep logging a few sessions and measurements to build a useful trend.';
}
