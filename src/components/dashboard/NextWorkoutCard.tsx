/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useLastUsedWeights } from '@/hooks/useLastUsedWeights';
import type { WorkoutExercise } from '@/hooks/useWorkouts';
import { PPL_PROGRAM, PPL_SEQUENCE, resolveNextSession, SessionKey, sessionKeyFromWorkout } from '@/lib/adaptivePpl';
import { localDateKey } from '@/lib/dateKey';
import { haptic } from '@/lib/haptics';

const WORKING_PHASES = ['primary', 'compound', 'specialization', 'accessory', 'core'];
const storedSession = (userId: string): SessionKey | null => {
  const value = window.localStorage.getItem(`reptrack-next-session:${userId}`);
  return PPL_SEQUENCE.includes(value as SessionKey) ? value as SessionKey : null;
};
const rememberSession = (userId: string, value: SessionKey) => window.localStorage.setItem(`reptrack-next-session:${userId}`, value);
const exerciseType = (name: string): WorkoutExercise['exerciseType'] => /pull-?ups?|dips?|hanging|ab wheel|reverse crunch/i.test(name) ? 'bodyweight' : 'weighted';

export function NextWorkoutCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveDraft } = useDraftWorkout();
  const { getLastUsed } = useLastUsedWeights();
  const [key, setKey] = useState<SessionKey>('push_a');

  useEffect(() => {
    if (!user) return;
    const load = () => Promise.all([
      (supabase.from('training_state' as any) as any).select('next_session,updated_at').eq('user_id', user.id).maybeSingle(),
      (supabase.from('workouts') as any).select('session_key,day_name,completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([state, latest]: any[]) => {
      const last = sessionKeyFromWorkout(latest.data?.session_key, latest.data?.day_name);
      const resolved = resolveNextSession({
        persistedNextSession: state.data?.next_session,
        persistedUpdatedAt: state.data?.updated_at,
        latestCompletedSession: last,
        latestCompletedAt: latest.data?.completed_at,
        localFallback: storedSession(user.id),
      });
      const historyIsCurrent = !!last && resolved !== state.data?.next_session;
      setKey(resolved);
      rememberSession(user.id, resolved);
      if (historyIsCurrent && !state.error) {
        void (supabase.from('training_state') as any).upsert({ user_id: user.id, next_session: resolved, updated_at: new Date().toISOString() });
      }
    });
    void load();
    window.addEventListener('reptrack-training-state', load);
    return () => window.removeEventListener('reptrack-training-state', load);
  }, [user]);

  const session = PPL_PROGRAM[key];
  const working = session.exercises.filter(ex => WORKING_PHASES.includes(ex.phase));
  const workingSets = working.reduce((sum, exercise) => sum + exercise.sets, 0);
  const focus = session.objective.split(',').slice(0, 2).join(',');

  const startNow = () => {
    if (!user || key === 'recovery') { navigate('/app/train'); return; }
    const startedAt = new Date();
    const exercises: WorkoutExercise[] = working.map((item, exerciseIndex) => {
      const last = getLastUsed(item.name);
      return {
        name: item.name,
        category: item.phase,
        sort_order: exerciseIndex,
        exerciseType: item.timed ? 'timed' : exerciseType(item.name),
        restSeconds: item.rest,
        rir: item.rir,
        progression: item.progression,
        sets: Array.from({ length: item.sets }, (_, setIndex) => {
          const previous = last?.perSet?.[setIndex] ?? (last ? { weight: last.weight, reps: last.reps } : undefined);
          const targetReps = item.reps;
          const fallbackReps = targetReps.match(/\d+/)?.[0] || '8';
          return {
            setNumber: setIndex + 1,
            targetWeight: '',
            targetReps,
            actualWeight: previous?.weight ? String(previous.weight) : '',
            actualReps: previous?.reps ? String(previous.reps) : fallbackReps,
            targetTime: item.timed ? Number(fallbackReps) : undefined,
            completed: false,
          };
        }),
      };
    });

    saveDraft({
      day: key,
      dayName: session.name,
      date: localDateKey(startedAt),
      weekNumber: 1,
      exercises,
      habits: { pullups: 0, water_intake: 0, sleep_hours: 0 },
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      step: 'exercises',
      resumePath: '/app/train',
      saveId: crypto.randomUUID(),
      workoutStartTime: startedAt.toISOString(),
      elapsedSeconds: 0,
      pausedSeconds: 0,
      pauseIntervals: [],
    });
    haptic('medium');
    navigate('/app/train');
  };

  if (key === 'recovery') {
    return <section className="rounded-[24px] border border-border bg-card p-5"><div className="type-eyebrow">Recovery day</div><h2 className="type-section-title mt-1">Nothing required.</h2><p className="type-supporting mt-2">Easy movement or mobility is available in Train if you want it.</p><button onClick={() => navigate('/app/train')} className="mt-4 min-h-11 text-sm font-semibold underline underline-offset-4">View recovery options</button></section>;
  }

  return <section className="rounded-[24px] border border-border bg-card overflow-hidden">
    <div className="p-5">
      <div className="type-eyebrow">Next workout</div>
      <div className="mt-1 flex items-start justify-between gap-4"><div><h2 className="type-section-title">{session.name}</h2><p className="type-supporting mt-1">{focus}</p></div><div className="text-right type-caption shrink-0"><div>~{session.duration} min</div><div className="mt-1">{working.length} exercises · {workingSets} sets</div></div></div>
    </div>
    <button onClick={startNow} className="w-full min-h-14 bg-foreground text-background px-4 flex items-center justify-center gap-2 font-bold text-sm active:opacity-80"><Play className="h-4 w-4" fill="currentColor"/>Start {session.name}<ArrowRight className="h-4 w-4"/></button>
  </section>;
}
