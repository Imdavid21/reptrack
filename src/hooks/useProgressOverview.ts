import { useQuery } from '@tanstack/react-query';
import { format, parseISO, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getCanonicalName } from '@/lib/exerciseMatching';

export type ProgressRangeDays = 7 | 30 | 90 | 180 | 365;

export interface ProgressWorkoutRow {
  id: string;
  date: string;
  day_name: string;
  workout_duration_minutes: number | null;
  completed_at: string | null;
  exercises: Array<{
    name: string;
    category: string | null;
    actual_weight: string | null;
    actual_reps: string | null;
    completed: boolean | null;
  }>;
}

export interface ProgressWeightPoint {
  date: string;
  weight: number;
  average7d: number;
}

export interface ProgressTimelineItem {
  id: string;
  date: string;
  kind: 'workout' | 'weight' | 'sleep' | 'activity';
  title: string;
  detail: string;
  workoutId?: string;
}

export interface ProgressOverview {
  from: string;
  to: string;
  workouts: ProgressWorkoutRow[];
  workoutCount: number;
  workoutsPerWeek: number;
  workingSets: number;
  averageWorkoutMinutes: number | null;
  muscleSets: Array<{ label: string; sets: number }>;
  exerciseLeaders: Array<{ name: string; sets: number }>;
  weightPoints: ProgressWeightPoint[];
  latestWeight: number | null;
  average7d: number | null;
  weightChange: number | null;
  ratePerWeek: number | null;
  averageSleep: number | null;
  sleepDays: number;
  averageCalories: number | null;
  averageProtein: number | null;
  nutritionDays: number;
  proteinTargetDays: number | null;
  activity: Array<{ type: string; distanceKm: number; minutes: number }>;
  timeline: ProgressTimelineItem[];
}

function baseExerciseName(name: string) {
  return getCanonicalName(name.replace(/\s*\(Set \d+\)$/, '').trim());
}

function muscleLabel(category?: string | null, exerciseName?: string) {
  const text = `${category || ''} ${exerciseName || ''}`.toLowerCase();
  if (/lat|row|pull.?up|pulldown|back/.test(text)) return 'Back';
  if (/chest|bench|fly|pec|dip/.test(text)) return 'Chest';
  if (/lateral|shoulder|overhead|rear.?delt/.test(text)) return 'Shoulders';
  if (/curl|bicep/.test(text)) return /reverse|hammer|wrist/.test(text) ? 'Forearms' : 'Biceps';
  if (/tricep|skull|pushdown/.test(text)) return 'Triceps';
  if (/squat|leg press|leg extension|lunge|split squat|quad/.test(text)) return 'Quads';
  if (/rdl|deadlift|leg curl|hamstring|pull through/.test(text)) return 'Hamstrings';
  if (/hip thrust|glute|bridge/.test(text)) return 'Glutes';
  if (/calf/.test(text)) return 'Calves';
  if (/crunch|plank|ab |core|hanging/.test(text)) return 'Core';
  return 'Other';
}

function rolling7DayAverage(points: Array<{ date: string; weight: number }>) {
  return points.map(point => {
    const current = parseISO(point.date).getTime();
    const values = points
      .filter(candidate => {
        const t = parseISO(candidate.date).getTime();
        return t <= current && t >= current - 6 * 86400000;
      })
      .map(candidate => candidate.weight);
    return {
      ...point,
      average7d: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    };
  });
}

export function useProgressOverview(days: ProgressRangeDays) {
  const { user } = useAuth();
  const to = new Date();
  const from = subDays(to, days - 1);
  const fromKey = format(from, 'yyyy-MM-dd');
  const toKey = format(to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['progress-overview', user?.id, days, fromKey, toKey],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<ProgressOverview> => {
      if (!user) throw new Error('Not authenticated');

      const [workoutsRes, metricsRes, mealsRes, activityRes] = await Promise.all([
        supabase
          .from('workouts')
          .select(`
            id,
            date,
            day_name,
            workout_duration_minutes,
            completed_at,
            exercises ( name, category, actual_weight, actual_reps, completed )
          `)
          .eq('user_id', user.id)
          .gte('date', fromKey)
          .lte('date', toKey)
          .not('completed_at', 'is', null)
          .order('date', { ascending: false }),
        supabase
          .from('daily_metrics')
          .select('date,bodyweight,sleep_hours')
          .eq('user_id', user.id)
          .gte('date', fromKey)
          .lte('date', toKey)
          .order('date', { ascending: true }),
        supabase
          .from('meals')
          .select('date,calories,protein')
          .eq('user_id', user.id)
          .gte('date', fromKey)
          .lte('date', toKey),
        supabase
          .from('calorie_burns')
          .select('id,date,activity_type,duration_minutes,distance_km,source')
          .eq('user_id', user.id)
          .eq('source', 'manual')
          .gte('date', fromKey)
          .lte('date', toKey)
          .order('date', { ascending: false }),
      ]);

      const error = workoutsRes.error || metricsRes.error || mealsRes.error || activityRes.error;
      if (error) throw error;

      const workouts = (workoutsRes.data || []) as unknown as ProgressWorkoutRow[];
      const metrics = (metricsRes.data || []) as Array<{ date: string; bodyweight: number | null; sleep_hours: number | null }>;
      const meals = (mealsRes.data || []) as Array<{ date: string; calories: number | null; protein: number | null }>;
      const activities = (activityRes.data || []) as Array<{ id: string; date: string; activity_type: string | null; duration_minutes: number | null; distance_km: number | null }>;

      const completedExerciseRows = workouts.flatMap(workout =>
        (workout.exercises || []).filter(exercise => exercise.completed !== false),
      );
      const workingSets = completedExerciseRows.length;

      const muscleCounts = new Map<string, number>();
      const exerciseCounts = new Map<string, number>();
      for (const exercise of completedExerciseRows) {
        const name = baseExerciseName(exercise.name);
        exerciseCounts.set(name, (exerciseCounts.get(name) || 0) + 1);
        const muscle = muscleLabel(exercise.category, name);
        muscleCounts.set(muscle, (muscleCounts.get(muscle) || 0) + 1);
      }

      const muscleSets = [...muscleCounts.entries()]
        .filter(([label]) => label !== 'Other')
        .map(([label, sets]) => ({ label, sets }))
        .sort((a, b) => b.sets - a.sets);
      const exerciseLeaders = [...exerciseCounts.entries()]
        .map(([name, sets]) => ({ name, sets }))
        .sort((a, b) => b.sets - a.sets)
        .slice(0, 8);

      const weightRaw = metrics
        .filter(row => row.bodyweight != null && Number(row.bodyweight) > 0)
        .map(row => ({ date: row.date, weight: Number(row.bodyweight) }));
      const weightPoints = rolling7DayAverage(weightRaw);
      const latestWeightPoint = weightPoints.at(-1);
      const firstTrendPoint = weightPoints[0];
      const latestWeight = latestWeightPoint?.weight ?? null;
      const average7d = latestWeightPoint?.average7d ?? null;
      const weightChange = latestWeightPoint && firstTrendPoint
        ? Number((latestWeightPoint.average7d - firstTrendPoint.average7d).toFixed(2))
        : null;
      const trendSpanDays = latestWeightPoint && firstTrendPoint
        ? Math.max(1, (parseISO(latestWeightPoint.date).getTime() - parseISO(firstTrendPoint.date).getTime()) / 86400000)
        : 0;
      const ratePerWeek = weightChange != null && trendSpanDays >= 7
        ? Number(((weightChange / trendSpanDays) * 7).toFixed(2))
        : null;

      const sleepRows = metrics.filter(row => row.sleep_hours != null && Number(row.sleep_hours) > 0);
      const averageSleep = sleepRows.length
        ? Number((sleepRows.reduce((sum, row) => sum + Number(row.sleep_hours), 0) / sleepRows.length).toFixed(2))
        : null;

      const nutritionByDate = new Map<string, { calories: number; protein: number }>();
      for (const meal of meals) {
        const current = nutritionByDate.get(meal.date) || { calories: 0, protein: 0 };
        current.calories += Number(meal.calories || 0);
        current.protein += Number(meal.protein || 0);
        nutritionByDate.set(meal.date, current);
      }
      const nutritionDays = [...nutritionByDate.values()].filter(day => day.calories > 0 || day.protein > 0);
      const averageCalories = nutritionDays.length
        ? Math.round(nutritionDays.reduce((sum, day) => sum + day.calories, 0) / nutritionDays.length)
        : null;
      const averageProtein = nutritionDays.length
        ? Math.round(nutritionDays.reduce((sum, day) => sum + day.protein, 0) / nutritionDays.length)
        : null;

      const activityByType = new Map<string, { distanceKm: number; minutes: number }>();
      for (const activity of activities) {
        const type = activity.activity_type || 'other';
        const current = activityByType.get(type) || { distanceKm: 0, minutes: 0 };
        current.distanceKm += Number(activity.distance_km || 0);
        current.minutes += Number(activity.duration_minutes || 0);
        activityByType.set(type, current);
      }
      const activity = [...activityByType.entries()]
        .map(([type, values]) => ({ type, distanceKm: Number(values.distanceKm.toFixed(1)), minutes: Math.round(values.minutes) }))
        .sort((a, b) => b.minutes - a.minutes);

      const timeline: ProgressTimelineItem[] = [];
      for (const workout of workouts.slice(0, 10)) {
        const sets = (workout.exercises || []).filter(exercise => exercise.completed !== false).length;
        timeline.push({
          id: `workout-${workout.id}`,
          date: workout.date,
          kind: 'workout',
          title: workout.day_name || 'Workout',
          detail: [workout.workout_duration_minutes ? `${Math.round(workout.workout_duration_minutes)} min` : null, sets ? `${sets} sets` : null].filter(Boolean).join(' · '),
          workoutId: workout.id,
        });
      }
      for (const metric of metrics.slice(-10)) {
        if (metric.bodyweight != null && Number(metric.bodyweight) > 0) {
          timeline.push({ id: `weight-${metric.date}`, date: metric.date, kind: 'weight', title: 'Bodyweight', detail: `${Number(metric.bodyweight).toFixed(2).replace(/\.00$/, '').replace(/0$/, '')} kg` });
        }
        if (metric.sleep_hours != null && Number(metric.sleep_hours) > 0) {
          const hours = Math.floor(Number(metric.sleep_hours));
          const minutes = Math.round((Number(metric.sleep_hours) - hours) * 60);
          timeline.push({ id: `sleep-${metric.date}`, date: metric.date, kind: 'sleep', title: 'Sleep', detail: `${hours}h ${minutes}m` });
        }
      }
      for (const item of activities.slice(0, 10)) {
        const distance = item.distance_km != null ? `${Number(item.distance_km).toFixed(1)} km` : null;
        const minutes = item.duration_minutes != null ? `${Math.round(item.duration_minutes)} min` : null;
        timeline.push({ id: `activity-${item.id}`, date: item.date, kind: 'activity', title: (item.activity_type || 'Activity').replace(/^./, char => char.toUpperCase()), detail: [distance, minutes].filter(Boolean).join(' · ') });
      }
      timeline.sort((a, b) => b.date.localeCompare(a.date));

      const durations = workouts.map(workout => Number(workout.workout_duration_minutes || 0)).filter(value => value > 0);

      return {
        from: fromKey,
        to: toKey,
        workouts,
        workoutCount: workouts.length,
        workoutsPerWeek: Number((workouts.length / Math.max(days / 7, 1)).toFixed(1)),
        workingSets,
        averageWorkoutMinutes: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
        muscleSets,
        exerciseLeaders,
        weightPoints,
        latestWeight,
        average7d,
        weightChange,
        ratePerWeek,
        averageSleep,
        sleepDays: sleepRows.length,
        averageCalories,
        averageProtein,
        nutritionDays: nutritionDays.length,
        proteinTargetDays: null,
        activity,
        timeline: timeline.slice(0, 24),
      };
    },
  });
}
