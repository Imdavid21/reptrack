/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { localDateKey } from '@/lib/dateKey';
import { planToExercises, type PlannedExercise } from '@/lib/plannedWorkout';
import { haptic } from '@/lib/haptics';

export interface PlannedWorkout { id: string; date: string; title: string; duration_minutes: number | null; status: string; workout_id: string | null; exercises: PlannedExercise[] }

/** Today's not-yet-finished workouts planned by an assistant, plus a starter that opens a prefilled live session. */
export function usePlannedWorkouts() {
  const { user } = useAuth();
  const { saveDraft } = useDraftWorkout();
  const [plans, setPlans] = useState<PlannedWorkout[]>([]);
  const today = localDateKey();

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase.from('planned_workouts' as any) as any).select('*').eq('user_id', user.id).eq('date', today).in('status', ['planned', 'started']).order('created_at');
      let rows: PlannedWorkout[] = data || [];
      const linked = rows.filter(p => p.workout_id).map(p => p.workout_id!);
      if (linked.length) {
        const { data: done } = await supabase.from('workouts').select('id').in('id', linked);
        const ids = new Set((done || []).map(w => w.id));
        rows.filter(p => p.workout_id && ids.has(p.workout_id)).forEach(p => void (supabase.from('planned_workouts' as any) as any).update({ status: 'completed' }).eq('id', p.id));
        rows = rows.filter(p => !(p.workout_id && ids.has(p.workout_id)));
      }
      if (alive) setPlans(rows);
    })();
    return () => { alive = false; };
  }, [user, today]);

  const start = useCallback(async (plan: PlannedWorkout) => {
    if (!user) return;
    const saveId = crypto.randomUUID();
    saveDraft({ day: 'custom', dayName: plan.title, date: today, weekNumber: 1, exercises: planToExercises(plan.exercises), habits: { pullups: 0, water_intake: 0, sleep_hours: 0 }, currentExerciseIndex: 0, currentSetIndex: 0, step: 'exercises', resumePath: '/app/train', saveId, workoutStartTime: new Date().toISOString(), elapsedSeconds: 0, pausedSeconds: 0, pauseIntervals: [] } as any);
    await (supabase.from('planned_workouts' as any) as any).update({ status: 'started', workout_id: saveId }).eq('id', plan.id).eq('user_id', user.id);
    haptic('medium');
    // Full load so the Train screen restores the new draft even when already on it.
    window.location.assign('/app/train');
  }, [user, saveDraft, today]);

  return { plans, start };
}
