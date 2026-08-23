/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Check, Play } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useAuth } from '@/hooks/useAuth';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useLastUsedWeights } from '@/hooks/useLastUsedWeights';
import type { WorkoutExercise } from '@/hooks/useWorkouts';
import { PPL_PROGRAM, PPL_SEQUENCE, resolveNextSession, type SessionKey, sessionKeyFromWorkout } from '@/lib/adaptivePpl';
import { supabase } from '@/integrations/supabase/client';
import { getBodyPart } from '@/lib/exerciseClassification';
import { exerciseWhy, sessionVolumePlan, warmupAutopilot } from '@/lib/advanced/engine';
import { localDateKey } from '@/lib/dateKey';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

const WORKING_PHASES = ['primary','compound','specialization','accessory','core'];
const storedSession = (userId: string): SessionKey | null => { const value = window.localStorage.getItem(`reptrack-next-session:${userId}`); return PPL_SEQUENCE.includes(value as SessionKey) ? value as SessionKey : null; };
const exerciseType = (name: string): WorkoutExercise['exerciseType'] => /pull-?ups?|dips?|hanging|ab wheel|reverse crunch/i.test(name) ? 'bodyweight' : 'weighted';

export default function AdvancedSessionStart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useAdvancedMode();
  const { saveDraft } = useDraftWorkout();
  const { getLastUsed } = useLastUsedWeights();
  const [key, setKey] = useState<SessionKey>('push_a');
  const [modifier, setModifier] = useState<number | null>(null);
  const effectiveModifier = modifier ?? settings.sessionVolumeModifier;

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      (supabase.from('training_state' as any) as any).select('next_session,updated_at').eq('user_id', user.id).maybeSingle(),
      (supabase.from('workouts') as any).select('session_key,day_name,completed_at').eq('user_id', user.id).not('completed_at','is',null).order('completed_at',{ ascending:false }).limit(1).maybeSingle(),
    ]).then(([state, latest]: any[]) => setKey(resolveNextSession({ persistedNextSession: state.data?.next_session, persistedUpdatedAt: state.data?.updated_at, latestCompletedSession: sessionKeyFromWorkout(latest.data?.session_key, latest.data?.day_name), latestCompletedAt: latest.data?.completed_at, localFallback: storedSession(user.id) })));
  }, [user]);

  const session = PPL_PROGRAM[key];
  const working = useMemo(() => session.exercises.filter(item => WORKING_PHASES.includes(item.phase)), [session]);
  const plan = useMemo(() => working.map(item => {
    const specialized = settings.specializationMuscles.some(muscle => muscle.toLowerCase() === getBodyPart(item.name).toLowerCase());
    const base = sessionVolumePlan(item.sets, effectiveModifier).targetSets;
    return { ...item, plannedSets: Math.max(item.phase === 'primary' || item.phase === 'compound' ? 2 : 1, base + (specialized ? 1 : 0)), why: exerciseWhy(item.name, settings.specializationMuscles), specialized };
  }), [working, effectiveModifier, settings.specializationMuscles]);

  const warmups = useMemo(() => plan.filter(item => ['primary','compound'].includes(item.phase)).slice(0,2).map(item => {
    const last = getLastUsed(item.name);
    const target = last?.weight || Number(item.weight?.match(/[\d.]+/)?.[0] || 0);
    const reps = Number(item.reps.match(/\d+/)?.[0] || 8);
    return { name: item.name, sets: warmupAutopilot(target, reps) };
  }).filter(item => item.sets.length), [plan, getLastUsed]);

  if (!settings.enabled) return <MainLayout showBack backTo="/app" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><h1 className="type-page-title">Advanced Mode is off</h1></div></MainLayout>;

  const start = () => {
    if (!user || key === 'recovery') { navigate('/app/train'); return; }
    const startedAt = new Date();
    const exercises: WorkoutExercise[] = plan.map((item, exerciseIndex) => {
      const last = getLastUsed(item.name);
      return {
        name: item.name,
        category: item.phase,
        sort_order: exerciseIndex,
        exerciseType: item.timed ? 'timed' : exerciseType(item.name),
        restSeconds: item.rest,
        rir: item.rir,
        progression: item.progression,
        sets: Array.from({ length: item.plannedSets }, (_, setIndex) => {
          const previous = last?.perSet?.[setIndex] ?? (last ? { weight: last.weight, reps: last.reps } : undefined);
          const fallbackReps = item.reps.match(/\d+/)?.[0] || '8';
          return { setNumber: setIndex + 1, targetWeight: '', targetReps: item.reps, actualWeight: previous?.weight ? String(previous.weight) : '', actualReps: previous?.reps ? String(previous.reps) : fallbackReps, targetTime: item.timed ? Number(fallbackReps) : undefined, completed: false };
        }),
      };
    });
    saveDraft({ day: key, dayName: session.name, date: localDateKey(startedAt), weekNumber: 1, exercises, habits: { pullups: 0, water_intake: 0, sleep_hours: 0 }, currentExerciseIndex: 0, currentSetIndex: 0, step: 'exercises', resumePath: '/app/train', saveId: crypto.randomUUID(), workoutStartTime: startedAt.toISOString(), elapsedSeconds: 0, pausedSeconds: 0, pauseIntervals: [] });
    haptic('medium');
    navigate('/app/train');
  };

  const totalSets = plan.reduce((sum, item) => sum + item.plannedSets, 0);

  return <MainLayout showBack backTo="/app" hideNav>
    <div className="mx-auto max-w-[720px] pb-12">
      <header className="mb-5"><div className="type-eyebrow">Next</div><h1 className="type-page-title mt-1">{session.name}</h1></header>

      <div className="grid grid-cols-3 gap-2 mb-5">{[{ label:'Compact', value:.75 },{ label:'Normal', value:1 },{ label:'Expand', value:1.25 }].map(option => <button key={option.label} onClick={() => setModifier(option.value)} className={cn('min-h-12 rounded-xl text-sm font-semibold border', Math.abs(effectiveModifier - option.value) < .01 ? 'bg-foreground text-background border-foreground' : 'border-border bg-card')}>{option.label}</button>)}</div>

      <section className="rounded-[20px] border border-border bg-card overflow-hidden mb-5"><div className="px-4 py-3 border-b border-border flex justify-between gap-3"><span className="text-sm font-semibold">Working plan</span><span className="type-caption tabular-nums">{plan.length} · {totalSets} sets</span></div><div className="divide-y divide-border">{plan.map((item, index) => <div key={item.name} className="px-4 py-3 grid grid-cols-[24px_minmax(0,1fr)_auto] gap-3 items-center"><span className="type-caption tabular-nums">{index + 1}</span><div className="min-w-0"><div className="text-sm font-semibold truncate">{item.name}</div><div className="type-caption mt-0.5">{item.why}{item.specialized ? ' · priority' : ''}</div></div><div className="text-sm font-semibold tabular-nums">{item.plannedSets} × {item.reps}</div></div>)}</div></section>

      {!!warmups.length && <section className="rounded-[20px] border border-border bg-card overflow-hidden mb-5"><div className="px-4 py-3 border-b border-border text-sm font-semibold">Warm-up</div><div className="divide-y divide-border">{warmups.map(item => <div key={item.name} className="p-4"><div className="text-sm font-semibold">{item.name}</div><div className="mt-2 flex flex-wrap gap-2">{item.sets.map(set => <span key={`${set.weight}-${set.reps}`} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold tabular-nums">{set.weight ? `${set.weight} kg × ` : ''}{set.reps}</span>)}</div></div>)}</div></section>}

      <button onClick={start} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2"><Play className="h-4 w-4" fill="currentColor"/>Start working sets</button>
      <div className="mt-3 text-center type-caption"><Check className="inline h-3.5 w-3.5 mr-1"/>Volume can still be edited inside the workout.</div>
    </div>
  </MainLayout>;
}
