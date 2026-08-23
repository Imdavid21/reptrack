/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Dumbbell, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { draftDateKey, isResumableDraft, useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useLogDate } from '@/contexts/LogDateContext';
import { PPL_PROGRAM, PPL_SEQUENCE, nextSession, resolveNextSession, sessionKeyFromWorkout, type SessionKey } from '@/lib/adaptivePpl';
import { haptic } from '@/lib/haptics';

const storedSession = (userId: string): SessionKey | null => {
  const value = window.localStorage.getItem(`reptrack-next-session:${userId}`);
  return PPL_SEQUENCE.includes(value as SessionKey) ? value as SessionKey : null;
};

function workingSummary(key: SessionKey) {
  const session = PPL_PROGRAM[key];
  const work = session.exercises.filter(exercise => ['primary', 'compound', 'specialization', 'accessory', 'core'].includes(exercise.phase));
  const sets = work.reduce((sum, exercise) => sum + exercise.sets, 0);
  return { exercises: work.length, sets, minutes: session.duration };
}

export function TodayHero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft } = useDraftWorkout();
  const { dateStr, isBackDated } = useLogDate();

  const { data, isLoading } = useQuery({
    queryKey: ['today-hero', user?.id, dateStr],
    enabled: !!user,
    staleTime: 20_000,
    queryFn: async () => {
      if (!user) return null;
      const [state, latest, completedToday] = await Promise.all([
        (supabase.from('training_state' as any) as any).select('next_session,updated_at').eq('user_id', user.id).maybeSingle(),
        (supabase.from('workouts') as any).select('id,date,session_key,day_name,completed_at,workout_duration_minutes').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase.from('workouts') as any).select('id,date,session_key,day_name,completed_at,workout_duration_minutes,exercises(completed)').eq('user_id', user.id).eq('date', dateStr).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      const latestSession = sessionKeyFromWorkout(latest.data?.session_key, latest.data?.day_name);
      const resolved = resolveNextSession({
        persistedNextSession: state.data?.next_session,
        persistedUpdatedAt: state.data?.updated_at,
        latestCompletedSession: latestSession,
        latestCompletedAt: latest.data?.completed_at,
        localFallback: storedSession(user.id),
      });

      return { key: resolved, completed: completedToday.data || null };
    },
  });

  const resumable = Boolean(draft && isResumableDraft(draft) && draftDateKey(draft) === dateStr);
  if (resumable && draft) {
    const exercise = draft.exercises[draft.currentExerciseIndex];
    const completed = draft.exercises.reduce((sum, item) => sum + item.sets.filter(set => set.completed).length, 0);
    const total = draft.exercises.reduce((sum, item) => sum + item.sets.length, 0);
    return (
      <section className="rounded-[24px] bg-foreground p-5 text-background sm:p-6" aria-label="Active workout">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background/10"><Dumbbell className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="type-eyebrow !text-background/60">Resume</div>
            <h2 className="mt-1 truncate text-[24px] font-semibold tracking-[-0.025em]">{exercise?.name || draft.dayName}</h2>
            <p className="mt-1 text-sm text-background/65">Set {(draft.currentSetIndex || 0) + 1} · {draft.dayName} · {completed}/{total} sets</p>
          </div>
        </div>
        <button onClick={() => { haptic('medium'); navigate(draft.resumePath || '/app/train/current'); }} className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-background px-4 text-sm font-semibold text-foreground active:scale-[.99]">Resume workout <ChevronRight className="h-4 w-4" /></button>
      </section>
    );
  }

  if (isLoading || !data) return <div className="h-36 animate-pulse rounded-[24px] bg-muted" aria-label="Loading today's training" />;

  if (data.completed) {
    const completedSets = Array.isArray(data.completed.exercises) ? data.completed.exercises.filter((exercise: any) => exercise.completed !== false).length : 0;
    const duration = Number(data.completed.workout_duration_minutes || 0);
    return (
      <section className="rounded-[24px] border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted"><Check className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><div className="type-eyebrow">Complete</div><h2 className="mt-1 text-[24px] font-semibold tracking-[-0.025em]">{data.completed.day_name || 'Workout complete'}</h2><p className="mt-1 text-sm text-muted-foreground">{[duration > 0 ? `${Math.round(duration)} min` : null, completedSets > 0 ? `${completedSets} sets` : null].filter(Boolean).join(' · ') || 'Logged today'}</p></div>
        </div>
        <button onClick={() => navigate(`/app/progress/workout/${data.completed.id}`)} className="mt-4 flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">View workout <ChevronRight className="h-4 w-4" /></button>
      </section>
    );
  }

  const key = data.key;
  if (key === 'recovery') {
    const tomorrow = nextSession('recovery');
    return (
      <section className="rounded-[24px] border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted"><RotateCcw className="h-5 w-5" /></div>
          <div><div className="type-eyebrow">Recovery day</div><h2 className="mt-1 text-[24px] font-semibold tracking-[-0.025em]">Nothing required.</h2><p className="mt-1 text-sm text-muted-foreground">Next: {PPL_PROGRAM[tomorrow].name}</p></div>
        </div>
        <button onClick={() => navigate('/app/train')} className="mt-4 min-h-11 text-sm font-medium text-muted-foreground hover:text-foreground">Optional mobility or conditioning</button>
      </section>
    );
  }

  const session = PPL_PROGRAM[key];
  const summary = workingSummary(key);
  return (
    <section className="rounded-[24px] border border-border bg-card p-5 sm:p-6">
      <div className="type-eyebrow">Next workout</div>
      <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.035em]">{session.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{session.objective}</p>
      <p className="mt-4 text-sm tabular-nums text-muted-foreground">~{summary.minutes} min · {summary.exercises} exercises · {summary.sets} working sets</p>
      {!isBackDated ? (
        <button onClick={() => { haptic('medium'); navigate('/app/train?start=1'); }} className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background active:scale-[.99]">Start workout <ChevronRight className="h-4 w-4" /></button>
      ) : <p className="mt-4 text-xs text-muted-foreground">Historical day selected. Training starts from Today.</p>}
    </section>
  );
}
