// Retroactive scoring: replays the session rating engine over historical
// workouts so past sessions can be compared and trended over time.
import { rateWorkout, type RatingSet, type WorkoutRating } from '@/lib/workoutRating';

export interface HistorySet {
  workout_id: string;
  exercise_name: string;
  exercise_category: string;
  actual_weight: number | null;
  actual_reps: number | null;
  actual_rir?: number | null;
  pain_score?: number | null;
  completed: boolean;
}

export interface HistoryWorkout {
  id: string;
  date: string;
  day_name: string;
  workout_duration_minutes?: number | null;
  completed_at?: string | null;
  is_skipped?: boolean | null;
}

export interface ScoredSession {
  id: string;
  date: string;
  dayName: string;
  rating: WorkoutRating;
}

export interface SessionRatingHistory {
  sessions: ScoredSession[];
  average: number | null;
  best: ScoredSession | null;
  worst: ScoredSession | null;
  /** Average of the most recent third vs the earliest third, when there are enough sessions. */
  trend: number | null;
  /** Most common weak dimension across the scored sessions. */
  weakestDimension: { label: string; averagePercent: number } | null;
}

function toRatingSets(sets: HistorySet[]): RatingSet[] {
  return sets.map(set => ({
    name: set.exercise_name,
    category: set.exercise_category,
    weight: Number(set.actual_weight) || 0,
    reps: Number(set.actual_reps) || 0,
    completed: set.completed,
    rir: set.actual_rir ?? null,
    pain: set.pain_score ?? null,
  }));
}

export function buildSessionRatingHistory(input: {
  workouts: HistoryWorkout[];
  sets: HistorySet[];
  sleepByDate?: Record<string, number | null | undefined>;
  inDeficit?: boolean;
}): SessionRatingHistory {
  const setsByWorkout = new Map<string, HistorySet[]>();
  for (const set of input.sets) {
    const bucket = setsByWorkout.get(set.workout_id);
    if (bucket) bucket.push(set); else setsByWorkout.set(set.workout_id, [set]);
  }

  const ordered = input.workouts
    .filter(workout => !workout.is_skipped && setsByWorkout.has(workout.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  const lastByDay = new Map<string, RatingSet[]>();
  const sessions: ScoredSession[] = [];

  for (const workout of ordered) {
    const sets = toRatingSets(setsByWorkout.get(workout.id) || []);
    const dayKey = (workout.day_name || '').toLowerCase();
    const previousSets = lastByDay.get(dayKey);
    const rating = rateWorkout({
      dayName: workout.day_name || 'Session',
      durationMinutes: workout.workout_duration_minutes ?? null,
      sets,
      previousSets,
      plannedSets: sets.length || null,
      sleepHours: input.sleepByDate?.[workout.date] ?? null,
      inDeficit: input.inDeficit,
    });
    if (!rating) continue;
    sessions.push({ id: workout.id, date: workout.date, dayName: workout.day_name || 'Session', rating });
    if (sets.some(set => set.completed)) lastByDay.set(dayKey, sets);
  }

  if (sessions.length === 0) {
    return { sessions: [], average: null, best: null, worst: null, trend: null, weakestDimension: null };
  }

  const scores = sessions.map(session => session.rating.score);
  const average = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  const best = sessions.reduce((top, session) => (session.rating.score > top.rating.score ? session : top));
  const worst = sessions.reduce((low, session) => (session.rating.score < low.rating.score ? session : low));

  let trend: number | null = null;
  if (sessions.length >= 4) {
    const size = Math.max(2, Math.floor(sessions.length / 3));
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    trend = Math.round(mean(scores.slice(-size)) - mean(scores.slice(0, size)));
  }

  const totals = new Map<string, { label: string; score: number; max: number }>();
  for (const session of sessions) {
    for (const dimension of session.rating.dimensions) {
      const entry = totals.get(dimension.key) || { label: dimension.label, score: 0, max: 0 };
      entry.score += dimension.score;
      entry.max += dimension.max;
      totals.set(dimension.key, entry);
    }
  }
  let weakestDimension: SessionRatingHistory['weakestDimension'] = null;
  for (const entry of totals.values()) {
    if (entry.max <= 0) continue;
    const percent = Math.round((entry.score / entry.max) * 100);
    if (!weakestDimension || percent < weakestDimension.averagePercent) {
      weakestDimension = { label: entry.label, averagePercent: percent };
    }
  }

  return { sessions, average, best, worst, trend, weakestDimension };
}
