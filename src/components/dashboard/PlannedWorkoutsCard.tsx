/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useLogDate } from '@/contexts/LogDateContext';
import type { WorkoutExercise } from '@/hooks/useWorkouts';
import { planToExercises, type PlannedExercise } from '@/lib/plannedWorkout';
import { haptic } from '@/lib/haptics';

interface Plan { id: string; date: string; title: string; duration_minutes: number | null; status: string; workout_id: string | null; exercises: PlannedExercise[] }

/** Workouts an assistant planned for the selected day. Start turns one into a live, prefilled session. */
export function PlannedWorkoutsCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveDraft } = useDraftWorkout();
  const { dateStr } = useLogDate();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase.from('planned_workouts' as any) as any).select('*').eq('user_id', user.id).eq('date', dateStr).neq('status', 'cancelled').order('created_at');
      let rows: Plan[] = data || [];
      const linked = rows.filter(p => p.status === 'started' && p.workout_id).map(p => p.workout_id!);
      if (linked.length) {
        const { data: done } = await supabase.from('workouts').select('id').in('id', linked);
        const ids = new Set((done || []).map(w => w.id));
        rows = rows.map(p => p.workout_id && ids.has(p.workout_id) ? { ...p, status: 'completed' } : p);
        rows.filter(p => p.status === 'completed' && ids.has(p.workout_id!)).forEach(p => void (supabase.from('planned_workouts' as any) as any).update({ status: 'completed' }).eq('id', p.id));
      }
      if (alive) setPlans(rows);
    })();
    return () => { alive = false; };
  }, [user, dateStr]);

  if (!plans.length) return null;

  const start = async (plan: Plan) => {
    if (!user) return;
    const startedAt = new Date();
    const saveId = crypto.randomUUID();
    const exercises: WorkoutExercise[] = planToExercises(plan.exercises);
    saveDraft({ day: 'custom', dayName: plan.title, date: dateStr, weekNumber: 1, exercises, habits: { pullups: 0, water_intake: 0, sleep_hours: 0 }, currentExerciseIndex: 0, currentSetIndex: 0, step: 'exercises', resumePath: '/app/train', saveId, workoutStartTime: startedAt.toISOString(), elapsedSeconds: 0, pausedSeconds: 0, pauseIntervals: [] } as any);
    await (supabase.from('planned_workouts' as any) as any).update({ status: 'started', workout_id: saveId }).eq('id', plan.id).eq('user_id', user.id);
    haptic('medium');
    // Full load so the Train screen restores the new draft even when already on it.
    window.location.assign('/app/train');
  };

  return <div className="space-y-3">{plans.map(plan => {
    const done = plan.status === 'completed';
    return <div key={plan.id} className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3"><div className="type-eyebrow">Planned workout</div><span className="type-caption">{plan.exercises.length} exercises{plan.duration_minutes ? ` · ${plan.duration_minutes} min` : ''}</span></div>
        <div className="type-section-title leading-tight mt-2">{plan.title}</div>
        <ul className="mt-3 space-y-1">{plan.exercises.slice(0, 6).map(e => <li key={e.name} className="flex justify-between gap-3 text-sm"><span className="truncate">{e.name}</span><span className="type-caption tabular-nums shrink-0">{e.sets} × {e.rep_min}{e.rep_max !== e.rep_min ? `-${e.rep_max}` : ''}{e.target_weight_kg != null ? ` · ${e.target_weight_kg} kg` : ''}</span></li>)}</ul>
      </div>
      {done
        ? <button onClick={() => navigate(`/app/progress/workout/${plan.workout_id}`)} className="w-full border-t border-border py-4 flex items-center justify-center gap-2 font-semibold text-sm"><Check className="h-4 w-4" />Completed, view workout</button>
        : <button onClick={() => void start(plan)} className="w-full bg-foreground text-background py-4 flex items-center justify-center gap-2 font-bold text-sm active:opacity-80"><Play className="h-4 w-4" fill="currentColor" />{plan.status === 'started' ? 'Start again' : 'Start'}</button>}
    </div>;
  })}</div>;
}
