/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Checkbox, Dialog, DialogContent, IconButton, TextField, Typography } from '@mui/material';
import { ArrowLeft, CalendarDays, Check, ChevronRight, Clock3, Dumbbell, Gauge, ListChecks, Pause, Pencil, Play, RefreshCw, SkipForward, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ExerciseReview } from '@/components/workout/ExerciseReview';
import { SetBySetCard } from '@/components/workout/SetBySetCard';
import { useAuth } from '@/hooks/useAuth';
import { useLastUsedWeights } from '@/hooks/useLastUsedWeights';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { useWorkouts, type WorkoutExercise } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useWorkoutWakeLock } from '@/hooks/useWorkoutWakeLock';
import { useWorkoutTabGuard } from '@/hooks/useWorkoutTabGuard';
import { supabase } from '@/integrations/supabase/client';
import { adaptSession, CONDITIONING_OPTIONS, CONDITIONING_SPLITS, type ConditioningOptionKey, nextSession, PPL_PROGRAM, PPL_SEQUENCE, type ReadinessBand, resolveNextSession, type SessionKey, sessionKeyFromWorkout } from '@/lib/adaptivePpl';
import { localDateKey } from '@/lib/dateKey';
import { toast } from '@/lib/toast';

type Stage = 'prepare' | 'warmup' | 'edit' | 'train' | 'finish';
const workingPhases = ['primary', 'compound', 'specialization', 'accessory', 'core'];
const prepPhases = ['mobility', 'activation', 'warmup'];
const exerciseType = (name: string): WorkoutExercise['exerciseType'] => /pull-?ups?|dips?|hanging|ab wheel|reverse crunch/i.test(name) ? 'bodyweight' : 'weighted';
const trainingStateKey = (userId: string) => `reptrack-next-session:${userId}`;
const storedSession = (userId: string): SessionKey | null => { const value = window.localStorage.getItem(trainingStateKey(userId)); return PPL_SEQUENCE.includes(value as SessionKey) ? value as SessionKey : null; };
const rememberSession = (userId: string, value: SessionKey) => window.localStorage.setItem(trainingStateKey(userId), value);
const trainingStateUnavailable = (error: any) => error?.code === 'PGRST205' || /training_state.*schema cache/i.test(error?.message || '');

interface LastUsedSetData { weight: number; reps: number }
interface LastUsedData { weight: number; reps: number; perSet?: LastUsedSetData[] }

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

function previousSummary(lastUsed?: LastUsedData) {
  if (!lastUsed) return 'First logged session';
  if (lastUsed.perSet?.length) {
    return lastUsed.perSet.slice(0, 4).map(set => `${set.weight} × ${set.reps}`).join(' · ');
  }
  return `${lastUsed.weight} × ${lastUsed.reps}`;
}

function ExerciseContext({ exercise, lastUsed }: { exercise: WorkoutExercise; lastUsed?: LastUsedData }) {
  const target = exercise.sets[0]?.targetReps || 'Programmed work';
  return (
    <div className="grid grid-cols-2 gap-3 border-y border-border py-3" aria-label="Exercise context">
      <div className="min-w-0">
        <div className="type-caption">Previous</div>
        <div className="mt-1 truncate text-sm font-medium tabular-nums" title={previousSummary(lastUsed)}>{previousSummary(lastUsed)}</div>
      </div>
      <div className="min-w-0 border-l border-border pl-3">
        <div className="type-caption">Target</div>
        <div className="mt-1 text-sm font-medium tabular-nums">{exercise.sets.length} × {target}{exercise.rir ? ` · ${exercise.rir} RIR` : ''}</div>
      </div>
    </div>
  );
}

function WarmupDialog({ open, items, selected, onToggle, onClose }: { open: boolean; items: string[]; selected: Set<string>; onToggle: (name: string) => void; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '24px', m: 2 } }}>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box><Typography variant="overline" color="text.secondary">Optional preparation</Typography><Typography variant="h4">Warm-up</Typography></Box>
          <IconButton onClick={onClose} aria-label="Close"><X size={20} /></IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>The default is already selected. Change only what helps you train better today.</Typography>
        <Box sx={{ display: 'grid', gap: .5 }}>
          {items.map(name => <Button key={name} onClick={() => onToggle(name)} sx={{ minHeight: 46, justifyContent: 'flex-start', color: 'text.primary' }}><Checkbox checked={selected.has(name)} tabIndex={-1}/>{name}</Button>)}
        </Box>
        <Button fullWidth size="large" variant="contained" onClick={onClose} sx={{ mt: 2, minHeight: 50, borderRadius: '14px' }}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutPicker({ open, value, onSelect, onClose }: { open: boolean; value: SessionKey; onSelect: (key: SessionKey) => void; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { m: 2, maxHeight: 'min(82dvh, 680px)', borderRadius: '24px', bgcolor: 'background.paper', backgroundImage: 'none', border: 1, borderColor: 'divider' } }}>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Box><Typography variant="overline" color="text.secondary">Escape hatch</Typography><Typography variant="h4">Change workout</Typography></Box>
          <IconButton onClick={onClose} aria-label="Close workout picker" size="small"><X size={19}/></IconButton>
        </Box>
        <Box role="listbox" aria-label="Workout" sx={{ px: 1.5, py: 1 }}>
          {PPL_SEQUENCE.map((item, index) => {
            const session = PPL_PROGRAM[item];
            const exercises = session.exercises.filter(ex => workingPhases.includes(ex.phase));
            const preview = exercises.slice(0, 3).map(ex => ex.name).join(' · ');
            const selected = value === item;
            return (
              <Button key={item} role="option" aria-selected={selected} onClick={() => { onSelect(item); onClose(); }} sx={{ width: '100%', display: 'block', minHeight: 68, textAlign: 'left', color: 'text.primary', px: 1.5, py: 1.5, borderRadius: '12px', borderBottom: index < PPL_SEQUENCE.length - 1 ? 1 : 0, borderColor: 'divider', bgcolor: selected ? 'action.selected' : 'transparent' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="h5" sx={{ flex: 1 }}>{session.name}</Typography><Typography variant="caption" color="text.secondary">~{session.duration} min</Typography>{selected && <Check size={17}/>}</Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</Typography>
              </Button>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function ConditioningPicker({ open, value, onSelect, onClose }: { open: boolean; value: ConditioningOptionKey; onSelect: (key: ConditioningOptionKey) => void; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { m: 2, borderRadius: '24px' } }}>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}><Typography variant="h4">Choose conditioning</Typography><IconButton onClick={onClose} aria-label="Close" size="small"><X size={19}/></IconButton></Box>
        <Box role="listbox" aria-label="Conditioning workout" sx={{ px: 1.5, py: 1 }}>
          {(Object.entries(CONDITIONING_OPTIONS) as Array<[ConditioningOptionKey, typeof CONDITIONING_OPTIONS[ConditioningOptionKey]]>).map(([optionKey, option]) => {
            const selected = optionKey === value;
            return <Button key={optionKey} role="option" aria-selected={selected} onClick={() => { onSelect(optionKey); onClose(); }} sx={{ width: '100%', minHeight: 62, display: 'block', textAlign: 'left', color: 'text.primary', px: 1.5, py: 1.5, borderRadius: '12px', bgcolor: selected ? 'action.selected' : 'transparent' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="h5" sx={{ flex: 1 }}>{option.name}</Typography><Typography variant="caption" color="text.secondary">{option.duration} min</Typography>{selected && <Check size={17}/>}</Box><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{option.objective}</Typography></Button>;
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function CircuitLogger({ exercise, exerciseIndex, totalExercises, currentSetIndex, completed, total, unit, onChange, onSetIndexChange, onNextExercise, onFinish }: { exercise: WorkoutExercise; exerciseIndex: number; totalExercises: number; currentSetIndex: number; completed: number; total: number; unit: 'round'|'minute'|'stage'; onChange: (exercise: WorkoutExercise) => void; onSetIndexChange: (index: number) => void; onNextExercise: () => void; onFinish: () => void }) {
  const currentSet = exercise.sets[currentSetIndex];
  const exerciseDone = exercise.sets.every(set => set.completed);
  const prescription = currentSet?.targetReps.replace(/^1 (round|minute) · /, '') || '';
  const complete = () => {
    if (!currentSet || currentSet.completed) return;
    const next = { ...exercise, sets: exercise.sets.map((set, index) => index === currentSetIndex ? { ...set, completed: true, actualReps: set.actualReps || set.targetReps.match(/\d+/)?.[0] || '1', actualWeight: '' } : set) };
    onChange(next);
    const nextSet = next.sets.findIndex((set, index) => index > currentSetIndex && !set.completed);
    if (nextSet >= 0) onSetIndexChange(nextSet);
    else if (exerciseIndex < totalExercises - 1) onNextExercise();
  };
  const nextNumber = Math.min(total, completed + 1);
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box><Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}><Typography variant="h4">{exercise.name}</Typography><Typography variant="caption" color="text.secondary" className="tabular-nums">{completed}/{total} {unit}{total === 1 ? '' : 's'}</Typography></Box><Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>{prescription}</Typography></Box>
      <Box sx={{ py: 3, borderBlock: 1, borderColor: 'divider', textAlign: 'center' }}><Typography variant="overline" color="text.secondary">{unit} {nextNumber}</Typography><Typography variant="h2" sx={{ mt: .75 }}>{exerciseDone ? 'Complete' : prescription}</Typography></Box>
      <Button fullWidth size="large" variant="contained" disabled={exerciseDone} onClick={complete} sx={{ minHeight: 56, borderRadius: '14px' }}>{exerciseDone ? `${unit[0].toUpperCase()}${unit.slice(1)} logged` : `Complete ${unit} ${nextNumber}`}</Button>
      <Button variant="text" disabled={completed === 0} onClick={onFinish} sx={{ minHeight: 44, color: 'text.secondary' }}>End workout</Button>
    </Box>
  );
}

export default function AdaptiveWorkout() {
  const { user, loading } = useAuth();
  const { createWorkout } = useWorkouts();
  const { getLastUsed, lastUsedMap } = useLastUsedWeights();
  const { getPRForExercise, getFamilyPRForExercise } = usePersonalRecords();
  const { draft, loaded: draftLoaded, saveDraft, clearDraft } = useDraftWorkout();
  const navigate = useNavigate();
  const location = useLocation();
  const autoStartRequested = new URLSearchParams(location.search).get('start') === '1';
  const autoStartedRef = useRef(false);
  const savingRef = useRef(false);

  const [stage, setStage] = useState<Stage>('prepare');
  const [key, setKey] = useState<SessionKey>('push_a');
  const [band, setBand] = useState<ReadinessBand>('green');
  const [sleep, setSleep] = useState<number | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [conditioningOption, setConditioningOption] = useState<ConditioningOptionKey>('cindy');
  const [conditioningPickerOpen, setConditioningPickerOpen] = useState(false);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [warmupExercises, setWarmupExercises] = useState<WorkoutExercise[]>([]);
  const [extraExercises, setExtraExercises] = useState<WorkoutExercise[]>([]);
  const [selectedWork, setSelectedWork] = useState<Set<string>>(new Set());
  const [selectedPrep, setSelectedPrep] = useState<Set<string>>(new Set());
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [warmupIndex, setWarmupIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [roughOpen, setRoughOpen] = useState(false);
  const [warmupEditorOpen, setWarmupEditorOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const [pauseStartedAt, setPauseStartedAt] = useState<Date | null>(null);
  const [pauseIntervals, setPauseIntervals] = useState<Array<{ pausedAt: string; resumedAt?: string }>>([]);
  const [exitOpen, setExitOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [longPromptDismissed, setLongPromptDismissed] = useState(false);
  const [saveId, setSaveId] = useState<string>(() => crypto.randomUUID());
  const [completedSummary, setCompletedSummary] = useState<{ workoutId: string; name: string; duration: number; completedSets: number; totalSets: number; following: SessionKey; offline: boolean } | null>(null);
  const [logDate, setLogDate] = useState<string>(localDateKey());
  const [manualTime, setManualTime] = useState<string>('');
  const [manualDuration, setManualDuration] = useState<string>('');
  const [logOptionsOpen, setLogOptionsOpen] = useState(false);

  const isBackdated = logDate !== localDateKey() || !!manualTime;
  const template = key === 'recovery' ? CONDITIONING_OPTIONS[conditioningOption] : PPL_PROGRAM[key];
  const adapted = useMemo(() => adaptSession(template, band), [template, band]);
  const prep = useMemo(() => adapted.exercises.filter(ex => prepPhases.includes(ex.phase)), [adapted]);
  const work = useMemo(() => adapted.exercises.filter(ex => workingPhases.includes(ex.phase)), [adapted]);
  const planned = useMemo(() => [...work, ...extraExercises], [work, extraExercises]);
  const selectedPlan = planned.filter(ex => selectedWork.has(ex.name));
  const plannedSets = selectedPlan.reduce((sum, exercise) => sum + exercise.sets, 0);
  const planItems = key === 'recovery'
    ? CONDITIONING_SPLITS[conditioningOption]
    : selectedPlan.map(exercise => ({ name: exercise.name, prescription: `${exercise.sets} × ${exercise.reps}` }));
  const dayType = template.name.startsWith('Push') ? 'Push' : template.name.startsWith('Pull') ? 'Pull' : template.name.startsWith('Legs') ? 'Legs' : 'Conditioning';
  const completedWorkoutSets = workoutExercises.reduce((sum, current) => sum + current.sets.filter(set => set.completed).length, 0);
  const totalWorkoutSets = workoutExercises.reduce((sum, current) => sum + current.sets.length, 0);
  const incompleteWorkoutSets = Math.max(0, totalWorkoutSets - completedWorkoutSets);
  const activeSession = stage === 'warmup' || stage === 'edit' || stage === 'train';
  const wakeLock = useWorkoutWakeLock(activeSession);
  const tabGuard = useWorkoutTabGuard(user?.id, activeSession);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      (supabase.from('training_state' as any) as any).select('next_session,updated_at').eq('user_id', user.id).maybeSingle(),
      (supabase.from('workouts') as any).select('session_key,day_name,completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      (supabase.from('daily_metrics') as any).select('sleep_hours').eq('user_id', user.id).eq('date', localDateKey()).maybeSingle(),
    ]).then(([state, latest, metric]: any[]) => {
      const last = sessionKeyFromWorkout(latest.data?.session_key, latest.data?.day_name);
      const resolved = resolveNextSession({ persistedNextSession: state.data?.next_session, persistedUpdatedAt: state.data?.updated_at, latestCompletedSession: last, latestCompletedAt: latest.data?.completed_at, localFallback: storedSession(user.id) });
      const historyIsCurrent = !!last && resolved !== state.data?.next_session;
      setKey(resolved);
      rememberSession(user.id, resolved);
      if (historyIsCurrent && !trainingStateUnavailable(state.error)) (supabase.from('training_state') as any).upsert({ user_id: user.id, next_session: resolved, updated_at: new Date().toISOString() });
      setSleep(metric.data?.sleep_hours ?? null);
      setSessionResolved(true);
    });
  }, [user]);

  useEffect(() => { setShowFullPlan(false); }, [key]);
  useEffect(() => {
    setSelectedPrep(new Set(prep.map(ex => ex.name)));
    setSelectedWork(new Set([...work.map(ex => ex.name), ...extraExercises.map(ex => ex.name)]));
  }, [key, band, prep, work, extraExercises]);

  useEffect(() => {
    if (!draftLoaded || draftRestored) return;
    setDraftRestored(true);
    if (!draft?.exercises?.length || draft.step === 'select-day') return;
    if (PPL_SEQUENCE.includes(draft.day as SessionKey)) setKey(draft.day as SessionKey);
    setWorkoutExercises(draft.exercises);
    setSelectedWork(new Set(draft.exercises.map(ex => ex.name)));
    setExerciseIndex(draft.currentExerciseIndex || 0);
    setSetIndex(draft.currentSetIndex || 0);
    const restoredStart = draft.workoutStartTime ? new Date(draft.workoutStartTime) : new Date(Date.now() - Math.max(0, draft.elapsedSeconds || 0) * 1000);
    setSessionStartedAt(restoredStart);
    setPausedSeconds(Math.max(0, draft.pausedSeconds || 0));
    setPauseStartedAt(draft.pauseStartedAt ? new Date(draft.pauseStartedAt) : null);
    setPauseIntervals(draft.pauseIntervals || []);
    if (draft.saveId) setSaveId(draft.saveId);
    setStage('train');
  }, [draftLoaded, draftRestored, draft]);

  useEffect(() => {
    if (stage !== 'train' || !workoutExercises.length) return;
    saveDraft({
      day: key,
      dayName: template.name,
      date: localDateKey(),
      weekNumber: 1,
      exercises: workoutExercises,
      habits: { pullups: 0, water_intake: 0, sleep_hours: sleep || 0 },
      currentExerciseIndex: exerciseIndex,
      currentSetIndex: setIndex,
      step: 'exercises',
      resumePath: '/app/train/current',
      saveId,
      workoutStartTime: sessionStartedAt?.toISOString(),
      elapsedSeconds,
      pausedSeconds,
      pauseStartedAt: pauseStartedAt?.toISOString(),
      pauseIntervals,
    });
  }, [stage, workoutExercises, exerciseIndex, setIndex, key, template.name, sleep, saveDraft, sessionStartedAt, elapsedSeconds, pausedSeconds, pauseStartedAt, pauseIntervals, saveId]);

  useEffect(() => {
    if (!sessionStartedAt || stage === 'prepare' || stage === 'finish') return;
    const update = () => {
      const openPause = pauseStartedAt ? Date.now() - pauseStartedAt.getTime() : 0;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - sessionStartedAt.getTime() - pausedSeconds * 1000 - openPause) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [sessionStartedAt, stage, pausedSeconds, pauseStartedAt]);

  useEffect(() => {
    if (!activeSession) return;
    const blockNavigation = (event: Event) => {
      event.preventDefault();
      setPendingPath((event as CustomEvent<{ path?: string }>).detail?.path ?? null);
      setExitOpen(true);
    };
    window.addEventListener('reptrack-request-leave-session', blockNavigation);
    return () => window.removeEventListener('reptrack-request-leave-session', blockNavigation);
  }, [activeSession]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, name: string) => setter(old => {
    const next = new Set(old);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  const applyHistory = (exercise: WorkoutExercise, index: number): WorkoutExercise => {
    const last = getLastUsed(exercise.name);
    return {
      ...exercise,
      sort_order: index,
      sets: exercise.sets.map((set, setIndex) => ({
        ...set,
        setNumber: setIndex + 1,
        actualWeight: last?.perSet?.[setIndex]?.weight?.toString() || last?.weight?.toString() || set.actualWeight,
        actualReps: last?.perSet?.[setIndex]?.reps?.toString() || last?.reps?.toString() || set.actualReps || (set.targetReps.match(/\d+/)?.[0] || '8'),
      })),
    };
  };

  const buildPrescription = (readiness: ReadinessBand) => adaptSession(template, readiness).exercises
    .filter(ex => workingPhases.includes(ex.phase) && selectedWork.has(ex.name))
    .map((ex, index) => ({
      name: ex.name,
      category: ex.phase,
      sort_order: index,
      exerciseType: ex.timed ? 'timed' : key === 'recovery' ? 'bodyweight' : exerciseType(ex.name),
      restSeconds: ex.rest,
      rir: ex.rir,
      progression: ex.progression,
      sets: Array.from({ length: ex.sets }, (_, set) => ({ setNumber: set + 1, targetWeight: '', targetReps: ex.reps, actualWeight: '', actualReps: ex.reps.match(/\d+/)?.[0] || '8', targetTime: ex.timed ? Number(ex.reps.match(/\d+/)?.[0]) : undefined, completed: false })),
    } as WorkoutExercise));

  const beginSession = (readiness: ReadinessBand = 'green', destination: Stage = 'train') => {
    setSessionStartedAt(previous => previous || new Date());
    setBand(readiness);
    const prescription = buildPrescription(readiness);
    setWorkoutExercises([...prescription, ...extraExercises.filter(ex => selectedWork.has(ex.name))].map(applyHistory));
    setExerciseIndex(0);
    setSetIndex(0);
    setStage(destination);
    setRoughOpen(false);
    navigate('/app/train/current', { replace: true });
  };

  const startWarmup = (readiness: ReadinessBand = 'green') => {
    setSessionStartedAt(previous => previous || new Date());
    setBand(readiness);
    const availablePrep = adaptSession(template, readiness).exercises.filter(ex => prepPhases.includes(ex.phase));
    const exercises = availablePrep.filter(exercise => selectedPrep.has(exercise.name)).map((exercise, index) => ({
      name: exercise.name,
      category: exercise.phase,
      sort_order: index,
      exerciseType: exercise.timed ? 'timed' : 'bodyweight',
      sets: Array.from({ length: exercise.sets }, (_, set) => ({ setNumber: set + 1, targetWeight: '', targetReps: exercise.reps, actualWeight: '', actualReps: exercise.reps.match(/\d+/)?.[0] || '', targetTime: exercise.timed ? Number(exercise.reps.match(/\d+/)?.[0]) : undefined, completed: false })),
    } as WorkoutExercise));
    setWarmupExercises(exercises);
    setWarmupIndex(0);
    setSetIndex(0);
    if (exercises.length) {
      setStage('warmup');
      navigate('/app/train/current', { replace: true });
    } else beginSession(readiness);
  };

  useEffect(() => {
    if (!autoStartRequested || autoStartedRef.current || !draftLoaded || !draftRestored || !sessionResolved || stage !== 'prepare' || selectedWork.size === 0) return;
    if (draft?.exercises?.length) return;
    autoStartedRef.current = true;
    beginSession('green');
    // Intentional one-shot start from Today. beginSession is derived from the resolved session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartRequested, draftLoaded, draftRestored, sessionResolved, stage, selectedWork.size, draft?.exercises?.length, key]);

  const selectSession = async (selected: SessionKey) => {
    if (!user) return;
    const { error } = await (supabase.from('training_state') as any).upsert({ user_id: user.id, next_session: selected, updated_at: new Date().toISOString() });
    if (error && !trainingStateUnavailable(error)) { toast.error(`Could not change workout: ${error.message}`); return; }
    rememberSession(user.id, selected);
    setKey(selected);
    window.dispatchEvent(new Event('reptrack-training-state'));
  };

  const skipWorkout = async () => {
    if (!user) return;
    const following = nextSession(key);
    const now = new Date();
    const { error } = await (supabase.from('workouts') as any).insert({ user_id: user.id, day: key, day_name: template.name, week_number: 1, date: localDateKey(now), completed_at: now.toISOString(), workout_duration_minutes: 0, is_skipped: true, session_key: key });
    if (error) { toast.error(`Could not record skip: ${error.message}`); return; }
    const { error: stateError } = await (supabase.from('training_state') as any).upsert({ user_id: user.id, next_session: following, updated_at: now.toISOString() });
    if (stateError && !trainingStateUnavailable(stateError)) { toast.error(`Skip recorded, but next session could not update: ${stateError.message}`); return; }
    rememberSession(user.id, following);
    setKey(following);
    window.dispatchEvent(new Event('reptrack-training-state'));
  };

  const togglePause = () => {
    if (pauseStartedAt) {
      const resumedAt = new Date();
      setPausedSeconds(total => total + Math.max(0, Math.round((resumedAt.getTime() - pauseStartedAt.getTime()) / 1000)));
      setPauseIntervals(items => items.map((item, index) => index === items.length - 1 && !item.resumedAt ? { ...item, resumedAt: resumedAt.toISOString() } : item));
      setPauseStartedAt(null);
    } else {
      const pausedAt = new Date();
      setPauseStartedAt(pausedAt);
      setPauseIntervals(items => [...items, { pausedAt: pausedAt.toISOString() }]);
    }
  };

  const resetLocalSession = () => {
    setWorkoutExercises([]);
    setWarmupExercises([]);
    setExtraExercises([]);
    setSessionStartedAt(null);
    setElapsedSeconds(0);
    setPausedSeconds(0);
    setPauseStartedAt(null);
    setPauseIntervals([]);
    setExerciseIndex(0);
    setSetIndex(0);
    setLongPromptDismissed(false);
    setLogDate(localDateKey());
    setManualTime('');
    setManualDuration('');
    setSaveId(crypto.randomUUID());
  };

  const cancelSession = async () => {
    await clearDraft();
    resetLocalSession();
    setStage('prepare');
    setExitOpen(false);
    const destination = pendingPath;
    setPendingPath(null);
    if (destination) navigate(destination);
  };

  const pauseAndExit = async () => {
    if (workoutExercises.length) {
      saveDraft({ day: key, dayName: template.name, date: localDateKey(), weekNumber: 1, exercises: workoutExercises, habits: { pullups: 0, water_intake: 0, sleep_hours: sleep || 0 }, currentExerciseIndex: exerciseIndex, currentSetIndex: setIndex, step: 'exercises', resumePath: '/app/train/current', saveId, workoutStartTime: sessionStartedAt?.toISOString(), elapsedSeconds, pausedSeconds, pauseStartedAt: pauseStartedAt?.toISOString(), pauseIntervals });
    }
    setExitOpen(false);
    const destination = pendingPath;
    setPendingPath(null);
    navigate(destination || '/app');
  };

  const handleExercise = (changed: WorkoutExercise) => setWorkoutExercises(old => old.map((exercise, index) => index === exerciseIndex ? changed : exercise));
  const move = (direction: 1|-1) => {
    const next = Math.max(0, Math.min(exerciseIndex + direction, workoutExercises.length - 1));
    setExerciseIndex(next);
    const incomplete = workoutExercises[next]?.sets.findIndex(set => !set.completed) ?? 0;
    setSetIndex(incomplete >= 0 ? incomplete : Math.max(0, workoutExercises[next].sets.length - 1));
  };

  const finishSession = () => {
    if (!completedWorkoutSets) { toast.error('Log at least one set before finishing.'); return; }
    if (busy) return;
    if (incompleteWorkoutSets > 0) { setFinishOpen(true); return; }
    void saveWorkout();
  };

  const saveWorkout = async () => {
    if (!user || savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    try {
      const completedSets = completedWorkoutSets;
      if (!completedSets) { toast.error('Log at least one set before saving.'); return; }
      const totalSets = totalWorkoutSets;
      const completionPercent = Math.round(completedSets / Math.max(1, totalSets) * 100);
      const liveCompletedAt = new Date();
      const liveStartedAt = sessionStartedAt || liveCompletedAt;
      const backdatedStart = (() => {
        if (!isBackdated) return null;
        const [y, mo, d] = logDate.split('-').map(Number);
        const [h, mi] = (manualTime || '18:00').split(':').map(Number);
        const start = new Date(y, (mo || 1) - 1, d || 1, Number.isFinite(h) ? h : 18, Number.isFinite(mi) ? mi : 0, 0, 0);
        return Number.isNaN(start.getTime()) ? null : start;
      })();
      const manualMinutes = Math.max(0, Math.round(Number(manualDuration) || 0));
      const startedAt = backdatedStart || liveStartedAt;
      const openPauseSeconds = pauseStartedAt ? Math.max(0, Math.round((liveCompletedAt.getTime() - pauseStartedAt.getTime()) / 1000)) : 0;
      const totalPausedSeconds = pausedSeconds + openPauseSeconds;
      const liveDuration = Math.max(1, Math.round(elapsedSeconds / 60));
      const durationMinutes = backdatedStart ? (manualMinutes || liveDuration) : liveDuration;
      const completedAt = backdatedStart ? new Date(startedAt.getTime() + durationMinutes * 60000) : liveCompletedAt;
      const completedPauseIntervals = pauseIntervals.map((interval, index) => index === pauseIntervals.length - 1 && !interval.resumedAt ? { ...interval, resumedAt: completedAt.toISOString() } : interval);
      const workout = await createWorkout({ clientId: saveId, day: key, day_name: template.name, week_number: 1, date: completedAt, exercises: workoutExercises, durationMinutes, startedAt, completedAt, explicitPauseSeconds: totalPausedSeconds, pauseIntervals: completedPauseIntervals });

      const { error: workoutError } = await (supabase.from('workouts') as any).update({ session_key: key, readiness_band: band, completion_percent: completionPercent }).eq('id', workout.id);
      if (workoutError) console.error('[AdaptiveWorkout] saved workout metadata update failed', workoutError);
      const following = nextSession(key);
      const { error: stateError } = await (supabase.from('training_state') as any).upsert({ user_id: user.id, next_session: following, updated_at: completedAt.toISOString() });
      if (stateError && !trainingStateUnavailable(stateError)) console.error('[AdaptiveWorkout] saved workout rotation update failed', stateError);
      rememberSession(user.id, following);
      await clearDraft();
      window.dispatchEvent(new Event('reptrack-training-state'));
      setCompletedSummary({ workoutId: workout.id, name: template.name, duration: durationMinutes, completedSets, totalSets, following, offline: !navigator.onLine });
      setFinishOpen(false);
      setStage('finish');
    } catch (error: any) {
      console.error('[AdaptiveWorkout] save failed', error);
      if (workoutExercises.length) saveDraft({ day: key, dayName: template.name, date: localDateKey(), weekNumber: 1, exercises: workoutExercises, habits: { pullups: 0, water_intake: 0, sleep_hours: sleep || 0 }, currentExerciseIndex: exerciseIndex, currentSetIndex: setIndex, step: 'exercises', resumePath: '/app/train/current', saveId, workoutStartTime: sessionStartedAt?.toISOString(), elapsedSeconds, pausedSeconds, pauseStartedAt: pauseStartedAt?.toISOString(), pauseIntervals });
      toast.error(`Workout was not saved: ${error?.message || 'Please try again.'} Your sets are safe, tap finish to retry.`);
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  };

  const leaveCompletion = (destination = '/app') => {
    const following = completedSummary?.following;
    resetLocalSession();
    if (following) setKey(following);
    setCompletedSummary(null);
    setStage('prepare');
    navigate(destination);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace/>;

  return (
    <MainLayout>
      <Box sx={{ maxWidth: 720, mx: 'auto', minHeight: 'calc(100dvh - 128px)', pb: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {tabGuard.conflict && activeSession && (
          <Box role="alert" sx={{ p: 2, border: 1, borderColor: 'warning.main', borderRadius: '16px', bgcolor: 'background.paper' }}>
            <Typography variant="h6">This workout is active in another tab.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Use the other tab, or take control here before logging more sets.</Typography>
            <Button onClick={tabGuard.takeOver} sx={{ mt: 1, px: 0 }}>Take over here</Button>
          </Box>
        )}

        {activeSession && sessionStartedAt && (
          <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 12, mx: -1, px: 1, py: .5, bgcolor: 'background.default', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', minHeight: 48 }}>
            <Button size="small" startIcon={<ArrowLeft size={16}/>} onClick={() => setExitOpen(true)} sx={{ justifySelf: 'start', px: 0, minHeight: 44, color: 'text.secondary' }}>Back</Button>
            <Box sx={{ textAlign: 'center', minWidth: 0 }}><Typography variant="caption" color="text.secondary">{template.name}</Typography><Typography variant="body2" fontWeight={650} className="tabular-nums">{formatElapsed(elapsedSeconds)}</Typography></Box>
            <Button size="small" startIcon={pauseStartedAt ? <Play size={14}/> : <Pause size={14}/>} onClick={togglePause} sx={{ justifySelf: 'end', minHeight: 44, color: 'text.secondary' }}>{pauseStartedAt ? 'Resume' : 'Pause'}</Button>
          </Box>
        )}

        {activeSession && elapsedSeconds >= 4 * 3600 && !longPromptDismissed && (
          <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: '16px', bgcolor: 'background.paper' }}>
            <Typography variant="h6">Workout has been running for {Math.floor(elapsedSeconds / 3600)}h {Math.floor((elapsedSeconds % 3600) / 60)}m.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Still training?</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}><Button onClick={() => setLongPromptDismissed(true)}>Continue</Button><Button onClick={finishSession} sx={{ color: 'text.secondary' }}>End workout</Button></Box>
          </Box>
        )}

        {stage === 'prepare' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {autoStartRequested && (!sessionResolved || !draftRestored || selectedWork.size === 0) ? (
              <Box sx={{ py: 8, textAlign: 'center' }}><Typography variant="overline" color="text.secondary">Preparing workout</Typography><Typography variant="h3" sx={{ mt: 1 }}>Loading your next session…</Typography></Box>
            ) : (
              <>
                <Box component="section">
                  <Box component="header" sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                    <Box sx={{ minWidth: 0 }}><Typography variant="overline" color="text.secondary">{key === 'recovery' ? 'Recovery' : 'Next workout'}</Typography><Typography variant="h1" sx={{ mt: .5 }}>{template.name}</Typography></Box>
                    <Button size="small" onClick={() => setLogOptionsOpen(value => !value)} startIcon={<CalendarDays size={14}/>} sx={{ minHeight: 40, flexShrink: 0, color: isBackdated ? 'text.primary' : 'text.secondary', borderRadius: '12px', px: 1.25 }}>{isBackdated ? `${new Date(`${logDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}${manualTime ? ` · ${manualTime}` : ''}` : 'Log live'}</Button>
                  </Box>

                  {logOptionsOpen && (
                    <Box sx={{ mb: 2.5, p: 2, border: 1, borderColor: 'divider', borderRadius: '16px', bgcolor: 'background.paper' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}><Typography variant="h6">Historical log</Typography>{isBackdated && <Button size="small" onClick={() => { setLogDate(localDateKey()); setManualTime(''); setManualDuration(''); }} sx={{ ml: 'auto', color: 'text.secondary' }}>Reset to now</Button>}</Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}><TextField size="small" type="date" label="Date" value={logDate} onChange={event => setLogDate(event.target.value)} InputLabelProps={{ shrink: true }}/><TextField size="small" type="time" label="Start" value={manualTime} onChange={event => setManualTime(event.target.value)} InputLabelProps={{ shrink: true }}/><TextField size="small" type="number" label="Minutes" value={manualDuration} onChange={event => setManualDuration(event.target.value)} placeholder="60" InputLabelProps={{ shrink: true }} inputProps={{ min: 1 }}/></Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>{isBackdated ? 'This session saves to the selected date and time.' : 'Leave unchanged for live training.'}</Typography>
                    </Box>
                  )}

                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>{template.objective}</Typography>
                  <Typography variant="body2" sx={{ mt: 1.25 }}>{band === 'green' ? 'Normal session.' : band === 'yellow' ? 'Reduced session.' : 'Recovery-biased session.'}</Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', mt: 3, borderBlock: 1, borderColor: 'divider' }}>
                    {[
                      { icon: Clock3, value: `~${template.duration} min`, label: 'Estimate' },
                      { icon: Dumbbell, value: `${planItems.length}`, label: 'Exercises' },
                      { icon: ListChecks, value: `${plannedSets}`, label: key === 'recovery' && conditioningOption !== 'mobility' ? 'Rounds' : 'Working sets' },
                    ].map((metric, index) => <Box key={metric.label} sx={{ py: 2, px: index === 0 ? 0 : 1.5, borderLeft: index ? 1 : 0, borderColor: 'divider', minWidth: 0 }}><metric.icon size={16}/><Typography variant="h5" sx={{ mt: 1 }} noWrap className="tabular-nums">{metric.value}</Typography><Typography variant="caption" color="text.secondary">{metric.label}</Typography></Box>)}
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}><Typography variant="h6">Plan</Typography>{key === 'recovery' && <Button size="small" startIcon={<RefreshCw size={15}/>} onClick={() => setConditioningPickerOpen(true)} sx={{ color: 'text.secondary' }}>Change conditioning</Button>}</Box>
                    <Box sx={{ display: 'grid' }}>
                      {(showFullPlan ? planItems : planItems.slice(0, 5)).map((exercise, index) => <Box key={`${exercise.name}-${index}`} sx={{ display: 'grid', gridTemplateColumns: '2rem minmax(0,1fr) auto', gap: 1, alignItems: 'center', py: 1.5, borderTop: index ? 1 : 0, borderColor: 'divider' }}><Typography variant="caption" color="text.secondary" className="tabular-nums">{String(index + 1).padStart(2, '0')}</Typography><Typography variant="body2" fontWeight={600}>{exercise.name}</Typography><Typography variant="caption" color="text.secondary" className="tabular-nums">{exercise.prescription}</Typography></Box>)}
                      {planItems.length > 5 && <Button size="small" aria-expanded={showFullPlan} onClick={() => setShowFullPlan(value => !value)} sx={{ justifySelf: 'start', minWidth: 0, px: 0, pt: 1.5, color: 'text.secondary' }}>{showFullPlan ? 'Show less' : `+${planItems.length - 5} more exercises`}</Button>}
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ mt: 'auto', pt: 4 }}>
                  <Button fullWidth size="large" variant="contained" startIcon={<Play size={17}/>} onClick={() => beginSession('green')} sx={{ minHeight: 56, borderRadius: '14px' }}>{key === 'recovery' ? `Start ${template.name}` : 'Start workout'}</Button>
                  {key !== 'recovery' && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, mt: 1 }}>
                      <Button variant="outlined" onClick={() => startWarmup('green')} sx={{ minHeight: 46, borderRadius: '12px' }}>Warm-up first</Button>
                      <Button variant="text" startIcon={<Gauge size={15}/>} onClick={() => setRoughOpen(true)} sx={{ minHeight: 46, color: 'text.secondary' }}>Feeling rough?</Button>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}><Button variant="text" startIcon={<RefreshCw size={15}/>} onClick={() => setPickerOpen(true)} sx={{ minHeight: 44, color: 'text.secondary' }}>Change workout</Button><Button variant="text" startIcon={<SkipForward size={15}/>} onClick={skipWorkout} sx={{ minHeight: 44, color: 'text.secondary' }}>Skip</Button></Box>
                </Box>
              </>
            )}
          </Box>
        )}

        {stage === 'warmup' && warmupExercises[warmupIndex] && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}><Box><Typography variant="overline" color="text.secondary">Optional warm-up</Typography><Typography variant="body2" color="text.secondary">Easy preparation. Skip whenever you are ready.</Typography></Box><IconButton size="small" aria-label="Edit warm-up" onClick={() => setWarmupEditorOpen(true)}><Pencil size={16}/></IconButton></Box>
            <SetBySetCard exercise={warmupExercises[warmupIndex]} exerciseIndex={warmupIndex} totalExercises={warmupExercises.length} completedWorkoutSets={warmupExercises.reduce((sum, current) => sum + current.sets.filter(set => set.completed).length, 0)} totalWorkoutSets={warmupExercises.reduce((sum, current) => sum + current.sets.length, 0)} currentSetIndex={setIndex} onChange={changed => setWarmupExercises(items => items.map((item, index) => index === warmupIndex ? changed : item))} onSetIndexChange={setSetIndex} onNextExercise={() => { setWarmupIndex(index => index + 1); setSetIndex(0); }} onPrevExercise={() => { setWarmupIndex(index => Math.max(0, index - 1)); setSetIndex(0); }} onSkipExercise={() => { if (warmupIndex >= warmupExercises.length - 1) beginSession(band); else { setWarmupIndex(index => index + 1); setSetIndex(0); } }} onJumpToExercise={index => { setWarmupIndex(index); setSetIndex(0); }} onComplete={() => beginSession(band)} isFirstExercise={warmupIndex === 0} isLastExercise={warmupIndex === warmupExercises.length - 1} autoRestTimer={false}/>
            <Button onClick={() => beginSession(band)} variant="text" sx={{ minHeight: 44, color: 'text.secondary' }}>Skip warm-up and train</Button>
          </>
        )}

        {stage === 'edit' && <ExerciseReview exercises={workoutExercises} dayName={template.name} dayFocus={template.objective} dayType={dayType === 'Conditioning' ? undefined : dayType} onChange={next => { setWorkoutExercises(next.map((exercise, index) => ({ ...exercise, sort_order: index }))); setSelectedWork(new Set(next.map(exercise => exercise.name))); setExerciseIndex(index => Math.min(index, Math.max(0, next.length - 1))); }} onStart={() => setStage('train')} startLabel="Done editing" lastUsedNames={new Set(Object.keys(lastUsedMap))}/>}

        {stage === 'train' && workoutExercises[exerciseIndex] && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
              <Box><Typography variant="overline" color="text.secondary">{exerciseIndex + 1} of {workoutExercises.length}</Typography><Typography variant="body2" color="text.secondary">{exerciseIndex < workoutExercises.length - 1 ? `Next: ${workoutExercises[exerciseIndex + 1].name}` : 'Final exercise'}</Typography></Box>
              {(key !== 'recovery' || conditioningOption === 'mobility') && <IconButton size="small" aria-label="Edit exercises" onClick={() => setStage('edit')}><Pencil size={16}/></IconButton>}
            </Box>
            {key === 'recovery' && conditioningOption !== 'mobility' ? (
              <CircuitLogger exercise={workoutExercises[exerciseIndex]} exerciseIndex={exerciseIndex} totalExercises={workoutExercises.length} currentSetIndex={setIndex} completed={completedWorkoutSets} total={totalWorkoutSets} unit={conditioningOption === 'chelsea' || conditioningOption === 'bodyweight_emom' ? 'minute' : conditioningOption === 'annie' ? 'stage' : 'round'} onChange={handleExercise} onSetIndexChange={setSetIndex} onNextExercise={() => move(1)} onFinish={finishSession}/>
            ) : (
              <>
                <ExerciseContext exercise={workoutExercises[exerciseIndex]} lastUsed={getLastUsed(workoutExercises[exerciseIndex].name)} />
                <SetBySetCard exercise={workoutExercises[exerciseIndex]} exerciseIndex={exerciseIndex} totalExercises={workoutExercises.length} completedWorkoutSets={completedWorkoutSets} totalWorkoutSets={totalWorkoutSets} currentSetIndex={setIndex} onChange={handleExercise} onSetIndexChange={setSetIndex} onNextExercise={() => move(1)} onPrevExercise={() => move(-1)} onSkipExercise={() => exerciseIndex >= workoutExercises.length - 1 ? finishSession() : move(1)} onJumpToExercise={index => { setExerciseIndex(index); const incomplete = workoutExercises[index].sets.findIndex(set => !set.completed); setSetIndex(incomplete >= 0 ? incomplete : 0); }} onComplete={finishSession} isFirstExercise={exerciseIndex === 0} isLastExercise={exerciseIndex === workoutExercises.length - 1} personalRecord={getPRForExercise(workoutExercises[exerciseIndex].name)} familyRecord={getFamilyPRForExercise(workoutExercises[exerciseIndex].name)} lastUsed={getLastUsed(workoutExercises[exerciseIndex].name)}/>
              </>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 1, borderColor: 'divider', pt: 1 }}><Button onClick={() => setStage('edit')} variant="text" sx={{ minHeight: 44, color: 'text.secondary' }}>Exercises</Button><Button onClick={finishSession} disabled={busy || completedWorkoutSets === 0} variant="text" sx={{ minHeight: 44, color: 'text.secondary' }}>{busy ? 'Saving…' : 'End workout'}</Button></Box>
          </>
        )}

        {stage === 'finish' && completedSummary && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
            <Typography variant="overline" color="text.secondary">Workout complete</Typography>
            <Typography variant="h1" sx={{ mt: .5 }}>{completedSummary.name}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBlock: 1, borderColor: 'divider', mt: 3 }}>
              <Box sx={{ py: 2 }}><Typography variant="caption" color="text.secondary">Duration</Typography><Typography variant="h5" className="tabular-nums" sx={{ mt: .5 }}>{completedSummary.duration} min</Typography></Box>
              <Box sx={{ py: 2, px: 2, borderLeft: 1, borderColor: 'divider' }}><Typography variant="caption" color="text.secondary">Working sets</Typography><Typography variant="h5" className="tabular-nums" sx={{ mt: .5 }}>{completedSummary.completedSets}</Typography></Box>
              <Box sx={{ py: 2, px: 2, borderLeft: 1, borderColor: 'divider' }}><Typography variant="caption" color="text.secondary">Completion</Typography><Typography variant="h5" className="tabular-nums" sx={{ mt: .5 }}>{Math.round(completedSummary.completedSets / Math.max(1, completedSummary.totalSets) * 100)}%</Typography></Box>
            </Box>
            <Typography variant="body1" sx={{ mt: 3 }}>Next: {PPL_PROGRAM[completedSummary.following].name}</Typography>
            {completedSummary.offline && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Saved on this device and queued to sync when connection returns.</Typography>}
            <Button fullWidth variant="contained" size="large" onClick={() => leaveCompletion('/app')} sx={{ minHeight: 56, borderRadius: '14px', mt: 4 }}>Done</Button>
            <Button fullWidth variant="text" size="large" endIcon={<ChevronRight size={16}/>} onClick={() => leaveCompletion(`/app/progress/workout/${completedSummary.workoutId}`)} sx={{ minHeight: 48, mt: 1, color: 'text.secondary' }}>Review workout</Button>
          </Box>
        )}

        <WorkoutPicker open={pickerOpen} value={key} onSelect={selectSession} onClose={() => setPickerOpen(false)}/>
        <ConditioningPicker open={conditioningPickerOpen} value={conditioningOption} onSelect={setConditioningOption} onClose={() => setConditioningPickerOpen(false)}/>
        <WarmupDialog open={warmupEditorOpen} items={prep.map(ex => ex.name)} selected={selectedPrep} onToggle={name => toggle(setSelectedPrep, name)} onClose={() => setWarmupEditorOpen(false)}/>

        <Dialog open={exitOpen} onClose={() => { setExitOpen(false); setPendingPath(null); }} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px', m: 2 } }}>
          <DialogContent sx={{ p: 3 }}><Typography variant="h4">Leave this session?</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Pause and the exact exercise, set, timer context, and logged work remain ready to resume. Discard removes the local draft.</Typography><Box sx={{ display: 'grid', gap: 1, mt: 3 }}><Button fullWidth size="large" variant="contained" onClick={pauseAndExit}>Pause and exit</Button><Button fullWidth size="large" variant="outlined" onClick={() => { setExitOpen(false); setPendingPath(null); }}>Keep training</Button><Button fullWidth size="large" variant="text" onClick={cancelSession} sx={{ color: 'error.main' }}>Discard workout</Button></Box></DialogContent>
        </Dialog>

        <Dialog open={finishOpen} onClose={() => setFinishOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px', m: 2 } }}>
          <DialogContent sx={{ p: 3 }}><Typography variant="h4">End workout?</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{incompleteWorkoutSets} set{incompleteWorkoutSets === 1 ? '' : 's'} still incomplete.</Typography><Box sx={{ display: 'grid', gap: 1, mt: 3 }}><Button fullWidth size="large" variant="contained" onClick={() => setFinishOpen(false)}>Keep training</Button><Button fullWidth size="large" variant="outlined" disabled={busy} onClick={() => { setFinishOpen(false); void saveWorkout(); }}>End anyway</Button></Box></DialogContent>
        </Dialog>

        <Dialog open={roughOpen} onClose={() => setRoughOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px', m: 2 } }}>
          <DialogContent sx={{ p: 3 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Box><Typography variant="overline" color="text.secondary">Only if it changes the plan</Typography><Typography variant="h4">How are you feeling?</Typography></Box><IconButton onClick={() => setRoughOpen(false)} aria-label="Close"><X size={20}/></IconButton></Box><Box sx={{ display: 'grid', gap: 1, mt: 3 }}><Button size="large" variant="outlined" onClick={() => beginSession('green')}>Normal</Button><Button size="large" variant="outlined" onClick={() => beginSession('yellow')}>Low energy</Button><Button size="large" variant="outlined" color="warning" onClick={() => beginSession('red')}>Something hurts</Button></Box></DialogContent>
        </Dialog>

        {activeSession && wakeLock.supported && (
          <button onClick={() => wakeLock.setEnabled(!wakeLock.enabled)} className="mx-auto min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground">{wakeLock.enabled ? 'Screen stays awake during training' : 'Keep screen awake during training'}</button>
        )}
      </Box>
    </MainLayout>
  );
}
