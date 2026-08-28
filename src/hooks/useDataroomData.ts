import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDailyMetrics } from './useDailyMetrics';
import { useExerciseSets } from './useExerciseSets';
import { useCalorieHistory } from './useCalorieHistory';
import { useHydrationData } from './useHydrationData';
import { useWorkouts } from './useWorkouts';
import { useUserPreferences } from './useUserPreferences';
import { useManualActivitiesInRange } from './useCalorieBurn';
import { buildDataroomAnalysis } from '@/lib/dataroom/analysis';
import { fetchAllRows } from '@/lib/supabasePaging';
import type { EnergyDay, MealDay } from '@/lib/dataroom/types';
import type { DateRange } from '@/contexts/DateRangeContext';

export interface DataroomPhysiqueCheckin { id: string; checkin_date: string; bodyweight: number | null; waist_cm: number | null; chest_cm: number | null; upper_arm_left_cm: number | null; upper_arm_right_cm: number | null; calf_left_cm: number | null; calf_right_cm: number | null; body_fat_percentage: number | null; photo_paths: unknown; }
export interface DataroomMobilityAssessment { id: string; assessment_date: string; hip_90_90_left: number | null; hip_90_90_right: number | null; knee_to_wall_left_cm: number | null; knee_to_wall_right_cm: number | null; deep_squat_depth: string | null; heels_down: boolean | null; hip_flexion_restriction: number | null; discomfort: string | null; }
export interface DataroomReadinessCheckin { id: string; checkin_date: string; fatigue: number | null; joint_discomfort: number | null; motivation: number | null; readiness: number | null; resting_hr: number | null; sharp_pain: boolean | null; sleep_hours: number | null; soreness: number | null; recommendation: string | null; }
export interface DataroomPostWorkoutCheckin { id: string; created_at: string; workout_id: string | null; energy: number | null; joint_discomfort: number | null; pump: number | null; target_stimulus: number | null; workout_difficulty: number | null; exercise_felt_wrong: string | null; completion_percent: number | null; }

const DATAROOM_STALE = 2 * 60_000;
const DATAROOM_GC = 30 * 60_000;

export function useDataroomData(dateRange: DateRange) {
  const { user } = useAuth();
  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');
  const rangeDays = Math.max(1, differenceInCalendarDays(dateRange.to, dateRange.from) + 1);
  const metrics = useDailyMetrics(dateRange);
  const exerciseSets = useExerciseSets(dateRange);
  const calorieHistory = useCalorieHistory(dateRange);
  const hydration = useHydrationData(dateRange);
  const workouts = useWorkouts();
  const activities = useManualActivitiesInRange(dateRange.from, dateRange.to);
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();

  const meals = useQuery({
    queryKey: ['dataroom-meals', user?.id, startDate, endDate], enabled: !!user, staleTime: DATAROOM_STALE, gcTime: DATAROOM_GC,
    queryFn: async (): Promise<MealDay[]> => {
      if (!user) return [];
      const rows = await fetchAllRows<{ date: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; sugar: number | null; sodium: number | null; potassium: number | null; }>((from, to) => supabase.from('meals').select('date,calories,protein,carbs,fat,fiber,sugar,sodium,potassium').eq('user_id', user.id).gte('date', startDate).lte('date', endDate).order('date', { ascending: true }).range(from, to));
      const byDay = new Map<string, MealDay>();
      for (const row of rows) {
        const day = byDay.get(row.date) ?? { date: row.date, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, potassium: 0 };
        day.calories += Number(row.calories) || 0; day.protein += Number(row.protein) || 0; day.carbs += Number(row.carbs) || 0; day.fat += Number(row.fat) || 0; day.fiber += Number(row.fiber) || 0; day.sugar += Number(row.sugar) || 0; day.sodium += Number(row.sodium) || 0; day.potassium += Number(row.potassium) || 0; byDay.set(row.date, day);
      }
      return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  const physique = useQuery({ queryKey: ['dataroom-physique', user?.id, startDate, endDate], enabled: !!user, staleTime: DATAROOM_STALE, gcTime: DATAROOM_GC, queryFn: async (): Promise<DataroomPhysiqueCheckin[]> => {
    if (!user) return [];
    return fetchAllRows<DataroomPhysiqueCheckin>((from, to) => supabase.from('physique_checkins').select('id,checkin_date,bodyweight,waist_cm,chest_cm,upper_arm_left_cm,upper_arm_right_cm,calf_left_cm,calf_right_cm,body_fat_percentage,photo_paths').eq('user_id', user.id).gte('checkin_date', startDate).lte('checkin_date', endDate).order('checkin_date', { ascending: true }).range(from, to));
  }});

  const mobility = useQuery({ queryKey: ['dataroom-mobility', user?.id, startDate, endDate], enabled: !!user, staleTime: DATAROOM_STALE, gcTime: DATAROOM_GC, queryFn: async (): Promise<DataroomMobilityAssessment[]> => {
    if (!user) return [];
    return fetchAllRows<DataroomMobilityAssessment>((from, to) => supabase.from('mobility_assessments').select('id,assessment_date,hip_90_90_left,hip_90_90_right,knee_to_wall_left_cm,knee_to_wall_right_cm,deep_squat_depth,heels_down,hip_flexion_restriction,discomfort').eq('user_id', user.id).gte('assessment_date', startDate).lte('assessment_date', endDate).order('assessment_date', { ascending: true }).range(from, to));
  }});

  const readiness = useQuery({ queryKey: ['dataroom-readiness', user?.id, startDate, endDate], enabled: !!user, staleTime: DATAROOM_STALE, gcTime: DATAROOM_GC, queryFn: async (): Promise<DataroomReadinessCheckin[]> => {
    if (!user) return [];
    return fetchAllRows<DataroomReadinessCheckin>((from, to) => supabase.from('readiness_checkins').select('id,checkin_date,fatigue,joint_discomfort,motivation,readiness,resting_hr,sharp_pain,sleep_hours,soreness,recommendation').eq('user_id', user.id).gte('checkin_date', startDate).lte('checkin_date', endDate).order('checkin_date', { ascending: true }).range(from, to));
  }});

  const postWorkout = useQuery({ queryKey: ['dataroom-post-workout', user?.id, startDate, endDate], enabled: !!user, staleTime: DATAROOM_STALE, gcTime: DATAROOM_GC, queryFn: async (): Promise<DataroomPostWorkoutCheckin[]> => {
    if (!user) return [];
    const rows = await fetchAllRows<DataroomPostWorkoutCheckin & { workouts?: { date?: string; user_id?: string } | null }>((from, to) => supabase.from('post_workout_checkins').select('id,created_at,workout_id,energy,joint_discomfort,pump,target_stimulus,workout_difficulty,exercise_felt_wrong,completion_percent,workouts!inner(date,user_id)').eq('workouts.user_id', user.id).gte('workouts.date', startDate).lte('workouts.date', endDate).order('created_at', { ascending: true }).range(from, to));
    return rows.map(({ workouts: _workouts, ...row }) => row);
  }});

  const selectedWorkouts = useMemo(() => workouts.workouts.filter(workout => workout.date >= startDate && workout.date <= endDate), [workouts.workouts, startDate, endDate]);
  const analysis = useMemo(() => {
    if (!metrics.data || !exerciseSets.data || !calorieHistory.data || !meals.data) return null;
    const loggedDates = new Set(meals.data.map(day => day.date));
    const energy: EnergyDay[] = calorieHistory.data.map(day => ({ date: day.date, baseline: day.baseline, workout: day.workoutBurned, activity: day.manualBurned, expenditure: day.expenditure, intake: loggedDates.has(day.date) ? day.intake : undefined }));
    const rangeEndsToday = endDate === format(new Date(), 'yyyy-MM-dd');
    return buildDataroomAnalysis({
      metrics: metrics.data.dataPoints.map(day => ({ date: day.date, bodyweight: day.bodyweight, sleep: day.sleep_hours })), meals: meals.data,
      sets: exerciseSets.data.sets.map(set => ({ exercise: set.exercise_name, date: set.workout_date || '', weight: set.actual_weight || 0, reps: set.actual_reps || 0, rir: set.actual_rir, pain: set.pain_score, rom: set.rom_quality, setKind: set.set_kind })),
      workouts: selectedWorkouts.map(workout => ({ date: workout.date, duration: workout.workout_duration_minutes, completed: Boolean(workout.completed_at), skipped: Boolean((workout as typeof workout & { is_skipped?: boolean }).is_skipped), completionPercent: (workout as typeof workout & { completion_percent?: number | null }).completion_percent, sessionKey: (workout as typeof workout & { session_key?: string | null }).session_key, readinessBand: (workout as typeof workout & { readiness_band?: string | null }).readiness_band })),
      energy, goal: rangeEndsToday ? preferences?.weight_goal_type ?? null : null, sleepGoal: preferences?.sleep_goal || 8, proteinGoal: preferences?.daily_protein_goal || 165, endDate, rangeDays,
    });
  }, [metrics.data, exerciseSets.data, calorieHistory.data, meals.data, selectedWorkouts, preferences, endDate, rangeDays]);

  const domains = {
    body: { isLoading: metrics.isLoading || physique.isLoading, error: metrics.error || physique.error }, training: { isLoading: exerciseSets.isLoading || workouts.isLoading || postWorkout.isLoading, error: exerciseSets.error || workouts.error || postWorkout.error }, nutrition: { isLoading: calorieHistory.isLoading || meals.isLoading || hydration.isLoading, error: calorieHistory.error || meals.error || hydration.error }, recovery: { isLoading: metrics.isLoading || readiness.isLoading, error: metrics.error || readiness.error }, activity: { isLoading: activities.isLoading, error: activities.error }, mobility: { isLoading: mobility.isLoading, error: mobility.error },
  };
  return { analysis, rangeDays, startDate, endDate, metrics: metrics.data?.dataPoints ?? [], sets: exerciseSets.data?.sets ?? [], meals: meals.data ?? [], energy: calorieHistory.data ?? [], hydration: hydration.data, workouts: selectedWorkouts, activities: activities.data ?? [], physique: physique.data ?? [], mobility: mobility.data ?? [], readiness: readiness.data ?? [], postWorkout: postWorkout.data ?? [], preferences, domains, isLoading: metrics.isLoading || exerciseSets.isLoading || calorieHistory.isLoading || meals.isLoading || workouts.isLoading || preferencesLoading, isFetching: metrics.isFetching || exerciseSets.isFetching || calorieHistory.isFetching || meals.isFetching || workouts.isFetching || physique.isFetching || mobility.isFetching || readiness.isFetching || postWorkout.isFetching || hydration.isFetching || activities.isFetching, error: metrics.error && exerciseSets.error && meals.error ? metrics.error : null };
}
