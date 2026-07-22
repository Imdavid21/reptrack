import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { useWorkouts } from './useWorkouts';
import { useExerciseSets } from './useExerciseSets';
import { usePersonalRecords } from './usePersonalRecords';
import { useDailyMetrics } from './useDailyMetrics';
import { useBodyOverview } from './useBodyOverview';
import { useManualActivitiesInRange } from './useCalorieBurn';
import { useCalorieHistory } from './useCalorieHistory';
import { analyzeMuscles, InsightActivity, InsightSet } from '@/lib/muscleInsights';
import { localDateKey } from '@/lib/dateKey';
import { normalizeWaterGoalLiters } from '@/lib/bodyScore';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// How far back the raw data context reaches. All-time aggregates (PRs,
// lifetime stats) aren't windowed by this — only day-by-day logs are.
const LOOKBACK_DAYS = 90;
// Recent-session detail is the most token-expensive part of the context
// (full exercise/set breakdown per workout), so it gets its own tighter cap.
const RECENT_WORKOUTS_LIMIT = 20;
const RECENT_DAYS_LIMIT = 30;

export function useDataChat() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { workouts, isLoading: workoutsLoading } = useWorkouts();

  const range = useMemo(() => {
    const to = endOfDay(new Date());
    return { from: startOfDay(subDays(to, LOOKBACK_DAYS - 1)), to };
  }, []);

  const { data: exerciseData, isLoading: exerciseLoading } = useExerciseSets(range);
  const { data: prs = [], isLoading: prsLoading } = usePersonalRecords();
  const { data: metrics, isLoading: metricsLoading } = useDailyMetrics(range);
  const { overview, isLoading: overviewLoading } = useBodyOverview(range);
  const { data: activities = [], isLoading: activitiesLoading } = useManualActivitiesInRange(range.from, range.to);
  const { data: calorieHistory = [], isLoading: calorieLoading } = useCalorieHistory(range);

  const fromKey = localDateKey(range.from);
  const toKey = localDateKey(range.to);

  const { data: nutritionHydration, isLoading: nutritionLoading } = useQuery({
    queryKey: ['dataChatNutritionHydration', user?.id, fromKey, toKey],
    enabled: !!user,
    queryFn: async () => {
      const [mealsRes, waterRes] = await Promise.all([
        supabase
          .from('meals')
          .select('date, calories, protein, carbs, fat, fiber, sugar, sodium')
          .eq('user_id', user!.id)
          .gte('date', fromKey)
          .lte('date', toKey),
        supabase
          .from('water_logs')
          .select('amount, timestamp')
          .eq('user_id', user!.id)
          .gte('timestamp', range.from.toISOString())
          .lte('timestamp', range.to.toISOString()),
      ]);

      const mealsByDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number }>();
      for (const m of mealsRes.data ?? []) {
        const cur = mealsByDay.get(m.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
        cur.calories += m.calories || 0;
        cur.protein += m.protein || 0;
        cur.carbs += m.carbs || 0;
        cur.fat += m.fat || 0;
        cur.fiber += m.fiber || 0;
        cur.sugar += m.sugar || 0;
        cur.sodium += m.sodium || 0;
        mealsByDay.set(m.date, cur);
      }

      const waterByDay = new Map<string, number>();
      for (const w of waterRes.data ?? []) {
        const day = localDateKey(new Date(w.timestamp as string));
        waterByDay.set(day, (waterByDay.get(day) ?? 0) + (w.amount || 0));
      }

      return {
        nutritionByDay: Array.from(mealsByDay.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, RECENT_DAYS_LIMIT)
          .map(([date, d]) => ({ date, ...d })),
        hydrationByDay: Array.from(waterByDay.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, RECENT_DAYS_LIMIT)
          .map(([date, liters]) => ({ date, liters: Math.round(liters * 100) / 100 })),
      };
    },
  });

  const isContextLoading =
    workoutsLoading || exerciseLoading || prsLoading || metricsLoading ||
    overviewLoading || activitiesLoading || calorieLoading || nutritionLoading;

  const hasData = workouts.length > 0 || prs.length > 0;

  const buildContext = useCallback(() => {
    const insightSets: InsightSet[] = (exerciseData?.sets ?? []).map(s => ({
      exercise_name: s.exercise_name,
      actual_weight: s.actual_weight,
      actual_reps: s.actual_reps,
      workout_date: s.workout_date,
    }));
    const insightActivities: InsightActivity[] = activities.map(a => ({
      activity_type: a.activity_type,
      duration_minutes: a.duration_minutes,
    }));
    const muscleIntel = analyzeMuscles(insightSets, LOOKBACK_DAYS, insightActivities);

    // useWorkouts()'s bulk list doesn't populate .exercises (that's a separate
    // per-workout fetch elsewhere), so recent-session detail is reconstructed
    // from useExerciseSets — which already carries workout_id — grouped back
    // into sessions and joined against the workout list for date/day/duration.
    const workoutById = new Map(workouts.map(w => [w.id, w]));
    type Session = { date: string; dayName: string; durationMinutes: number | null; exercises: Map<string, string[]> };
    const sessionsById = new Map<string, Session>();
    for (const s of exerciseData?.sets ?? []) {
      if (!s.completed || !s.workout_id) continue;
      const w = workoutById.get(s.workout_id);
      if (!w) continue;
      let session = sessionsById.get(s.workout_id);
      if (!session) {
        session = { date: w.date, dayName: w.day_name, durationMinutes: w.workout_duration_minutes ?? null, exercises: new Map() };
        sessionsById.set(s.workout_id, session);
      }
      const perSet = s.actual_weight ? `${s.actual_weight}kg×${s.actual_reps}` : `${s.actual_reps} reps`;
      const list = session.exercises.get(s.exercise_name) ?? [];
      list.push(perSet);
      session.exercises.set(s.exercise_name, list);
    }
    const recentWorkouts = Array.from(sessionsById.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, RECENT_WORKOUTS_LIMIT)
      .map(session => ({
        date: session.date,
        dayName: session.dayName,
        durationMinutes: session.durationMinutes,
        exercises: Array.from(session.exercises.entries()).map(([name, sets]) => ({ name, sets: sets.join(', ') })),
      }));

    return {
      lookbackDays: LOOKBACK_DAYS,
      profile: preferences ? {
        age: preferences.age,
        gender: preferences.gender,
        heightCm: preferences.height_cm,
        fitnessGoal: preferences.fitness_goal,
        trainingSplit: preferences.training_split,
        trainingFocus: preferences.training_focus,
        unitsSystem: preferences.units_system,
        weeklyWorkoutGoal: preferences.weekly_workout_goal,
        dailyCalorieGoal: preferences.daily_calorie_goal,
        dailyProteinGoal: preferences.daily_protein_goal,
        dailyWaterGoalLiters: normalizeWaterGoalLiters(preferences.daily_water_goal),
        sleepGoalHours: preferences.sleep_goal,
        weightGoal: preferences.weight_goal,
        weightGoalType: preferences.weight_goal_type,
      } : null,
      bodyScore: overview ? {
        overall: overview.overall,
        activeDays: overview.activeDays,
        rangeDays: overview.rangeDays,
        pillars: Object.fromEntries(
          Object.entries(overview.pillars).map(([k, p]) => [k, { score: p.score, valueLabel: p.valueLabel, trend: p.trend }])
        ),
      } : null,
      personalRecords: prs.slice(0, 100).map(pr => ({
        exercise: pr.exerciseName,
        best: pr.reps,
        weight: pr.prType === 'weight' ? pr.maxWeight : null,
        date: pr.date,
        type: pr.prType ?? 'weight',
      })),
      muscleBalance: muscleIntel.balance.map(b => ({
        bodyPart: b.bodyPart,
        weeklySets: b.weeklySets,
        status: b.status,
        fromActivity: b.fromActivity ?? 0,
      })),
      plateaus: muscleIntel.plateaus,
      recentWorkouts,
      totalWorkoutsLoggedAllTime: workouts.length,
      nutrition: nutritionHydration?.nutritionByDay ?? [],
      hydration: nutritionHydration?.hydrationByDay ?? [],
      bodyweightTrend: (metrics?.dataPoints ?? [])
        .filter(d => d.bodyweight != null)
        .map(d => ({ date: d.date, kg: d.bodyweight })),
      sleepTrend: (metrics?.dataPoints ?? [])
        .filter(d => d.sleep_hours != null)
        .map(d => ({ date: d.date, hours: d.sleep_hours })),
      totalPullupsInWindow: metrics?.totals.totalPullups ?? 0,
      burnHistory: calorieHistory.slice(-RECENT_DAYS_LIMIT).map(d => ({
        date: d.date,
        workoutBurn: d.workoutBurned,
        manualActivityBurn: d.manualBurned,
        totalBurn: d.burned,
        intake: d.intake,
      })),
      manualActivities: activities.slice(0, RECENT_DAYS_LIMIT).map(a => ({
        date: a.date,
        type: a.activity_type,
        durationMinutes: a.duration_minutes,
      })),
    };
  }, [preferences, overview, prs, exerciseData, activities, workouts, nutritionHydration, metrics, calorieHistory]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsSending(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('chat-with-data', {
        body: { messages: nextMessages, context: buildContext() },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (typeof data?.reply !== 'string') throw new Error('Unexpected response format');

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error('Chat with data failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to get a response. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [messages, isSending, buildContext]);

  return { messages, sendMessage, isSending, error, isContextLoading, hasData };
}
