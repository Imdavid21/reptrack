/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Play, Plus } from 'lucide-react';
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
  const [timeBudget, setTimeBudget] = useState<number | null>(null);
  const [setOffset, setSetOffset] = useState(0);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      (supabase.from('training_state' as any) as any).select('next_session,updated_at').eq('user_id', user.id).maybeSingle(),
      (supabase.from('workouts') as any).select('session_key,day_name,completed_at').eq('user_id', user.id).not('completed_at','is',null).order('completed_at',{ ascending:false }).limit(1).maybeSingle(),
    ]).then(([state, latest]: any[]) => setKey(resolveNextSession({ persistedNextSession: state.data?.next_session, persistedUpdatedAt: state.data?.updated_at, latestCompletedSession: sessionKeyFromWorkout(latest.data?.session_key, latest.data?.day_name), latestCompletedAt: latest.data?.completed_at, localFallback: storedSession(user.id) })));
  }, [user]);

  const session = PPL_PROGRAM[key];
  const working = useMemo(() => session.exercises.filter(item => WORKING_PHASES.includes(item.phase)), [session]);
  const budgetModifier = timeBudget == null ? settings.sessionVolumeModifier : Math.max(0.55, Math.min(1, timeBudget / Math.max(1, session.duration)));
  const plan = useMemo(() => working.map(item => {
    const specialized = settings.specializationMuscles.some(muscle => muscle.toLowerCase() === getBodyPart(item.name).toLowerCase());
    const base = sessionVolumePlan(item.sets, budgetModifier).targetSets;
    const floor = item.phase === 'primary' || item.phase === 'compound' ? 2 : 1;
    return { ...item, plannedSets: Math.max(floor, base + (specialized ? 1 : 0) + setOffset), why: exerciseWhy(item.name, settings.specializationMuscles), specialized };
  }), [working, budgetModifier, settings.specializationMuscles, setOffset]);

  const warmups = useMemo(() => plan.filter(item => ['primary','compound'].includes(item.phase)).slice(0,2).map(item => {
    const last = getLastUsed(item.name);
    const target = last?.weight || 0;
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
  const selectedBudget = timeBudget == null ? session.duration : Math.min(timeBudget, session.duration);

  return <MainLayout showBack backTo="/app" hideNav>
    <div className="mx-auto max-w-[720px] pb-12">
      <header className="mb-5"><div className="type-eyebrow">Next</div><div className="flex items-end justify-between gap-4"><h1 className="type-page-title mt-1">{session.name}</h1><span className="type-caption tabular-nums">~{selectedBudget} min</span></div></header>

      <div className="grid grid-cols-3 gap-2 mb-5" aria-label="Time budget">{[{ label:'30m', value:30 },{ label:'45m', value:45 },{ label:'Full', value:null }].map(option => <button key={option.label} onClick={() => { setTimeBudget(option.value); setSetOffset(0); }} className={cn('min-h-12 rounded-xl text-sm font-semibold border', timeBudget === option.value ? 'bg-foreground text-background border-foreground' : 'border-border bg-card')}>{option.label}</button>)}</div>

      <section className="rounded-[20px] border border-border bg-card overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3"><div><span className="text-sm font-semibold">Working plan</span><span className="type-caption ml-2 tabular-nums">{totalSets} sets</span></div><div className="flex items-center gap-1" aria-label="Override session volume"><button onClick={() => setSetOffset(value => Math.max(-1, value - 1))} disabled={setOffset <= -1} aria-label="Reduce one set per exercise" className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center disabled:opacity-30"><Minus className="h-4 w-4"/></button><span className="w-9 text-center type-caption tabular-nums">{setOffset > 0 ? `+${setOffset}` : setOffset}</span><button onClick={() => setSetOffset(value => Math.min(1, value + 1))} disabled={setOffset >= 1} aria-label="Add one set per exercise" className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center disabled:opacity-30"><Plus className="h-4 w-4"/></button></div></div>
        <div className="divide-y divide-border">{plan.map((item, index) => <div key={item.name} className="px-4 py-3 grid grid-cols-[24px_minmax(0,1fr)_auto] gap-3 items-center"><span className="type-caption tabular-nums">{index + 1}</span><div className="min-w-0"><div className="text-sm font-semibold truncate">{item.name}</div><div className="type-caption mt-0.5">{item.why}{item.specialized ? ' · priority' : ''}</div></div><div className="text-sm font-semibold tabular-nums">{item.plannedSets} × {item.reps}</div></div>)}</div>
      </section>

      {!!warmups.length && <section className="rounded-[20px] border border-border bg-card overflow-hidden mb-5"><div className="px-4 py-3 border-b border-border text-sm font-semibold">Warm-up</div><div className="divide-y divide-border">{warmups.map(item => <div key={item.name} className="p-4"><div className="text-sm font-semibold">{item.name}</div><div className="mt-2 flex flex-wrap gap-2">{item.sets.map(set => <span key={`${set.weight}-${set.reps}`} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold tabular-nums">{set.weight ? `${set.weight} kg × ` : ''}{set.reps}</span>)}</div></div>)}</div></section>}

      <button onClick={start} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2"><Play className="h-4 w-4" fill="currentColor"/>Start working sets</button>
      <div className="mt-3 text-center type-caption"><Check className="inline h-3.5 w-3.5 mr-1"/>Sets remain editable during training.</div>
    </div>
  </MainLayout>;
}
