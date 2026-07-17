import { useMemo } from 'react';
import { useWorkouts } from './useWorkouts';
import { useUserPreferences } from './useUserPreferences';
import { useCustomRoutine } from './useCustomRoutine';
import { useLastUsedWeights } from './useLastUsedWeights';
import { resolveSplitDays } from '@/lib/splitTemplates';
import { findBestMatch } from '@/lib/exerciseMatching';
import { suggestProgression, ProgressionSuggestion } from '@/lib/progression';
import { localDateKey } from '@/lib/dateKey';

export interface NextWorkoutExercise extends ProgressionSuggestion {
  name: string;
  category: string;
}

export interface NextWorkout {
  dayKey: string;
  dayName: string;
  focus: string;
  /** Did the user already log a workout today? */
  completedToday: boolean;
  /** Today is a scheduled rest day. */
  isRestDay: boolean;
  exercises: NextWorkoutExercise[];
  totalExercises: number;
  /** How many exercises have a suggested progression (weight or rep bump). */
  upgrades: number;
}

/**
 * The "what should I do next" engine that powers the Today screen.
 *
 * Picks the next day in the user's split (the one after their most recent
 * session) and, for each exercise, computes an evidence-based progression
 * suggestion from their own logged history. This is the mechanism that nudges
 * people to do a little more each session without nagging.
 */
export function useNextWorkout(): NextWorkout | null {
  const { workouts } = useWorkouts();
  const { preferences } = useUserPreferences();
  const { customDays, hasCustomRoutine } = useCustomRoutine();
  const { lastUsedMap } = useLastUsedWeights();

  return useMemo(() => {
    // Same resolution as the workout screen: the chosen split is authoritative
    // unless it's explicitly 'custom', so the "next workout" suggestion can't be
    // hijacked by a leftover custom routine.
    const days = resolveSplitDays(preferences?.training_split, customDays, hasCustomRoutine);
    const entries = Object.entries(days);
    if (entries.length === 0) return null;

    const todayStr = localDateKey();
    const completedToday = workouts.some(w => w.date === todayStr);

    const todayDow = new Date().getDay();
    const restDays: number[] = Array.isArray(preferences?.rest_days)
      ? (preferences!.rest_days as number[])
      : [0];
    const isRestDay = restDays.includes(todayDow);

    // Next day = the one after the most recently logged day in the split.
    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    const lastKey = sorted[0]?.day ?? null;
    const lastIdx = lastKey ? entries.findIndex(([k]) => k === lastKey) : -1;
    const nextIdx = (lastIdx + 1) % entries.length;
    const [dayKey, day] = entries[nextIdx];

    const exercises: NextWorkoutExercise[] = (day.exercises || [])
      .filter((e: { category: string }) => e.category !== 'warmup')
      .map((ex: { name: string; category: string; targetWeight?: string; targetReps?: string }) => {
        const last = findBestMatch(ex.name, lastUsedMap) as { weight: number; reps: number } | undefined;
        const suggestion = suggestProgression(ex.name, ex.targetReps, last, ex.targetWeight);
        return { name: ex.name, category: ex.category, ...suggestion };
      });

    const upgrades = exercises.filter(e => e.trend === 'up').length;

    return {
      dayKey,
      dayName: day.name,
      focus: day.focus,
      completedToday,
      isRestDay,
      exercises,
      totalExercises: exercises.length,
      upgrades,
    };
  }, [workouts, preferences, hasCustomRoutine, customDays, lastUsedMap]);
}
