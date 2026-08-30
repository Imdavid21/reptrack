import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clock3, History, MoreHorizontal, Plus, SkipForward, Trash2, Undo2 } from 'lucide-react';
import type { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { RestTimer } from './RestTimer';
import { ExerciseHistorySheet } from './ExerciseHistorySheet';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getExerciseRelationships, getPrTransferability } from '@/lib/exerciseRelationships';
import { getExerciseVariants, getEquipmentType, getWeightLabel } from '@/lib/exerciseVariants';
import { readDevicePreference } from '@/hooks/useDevicePreferences';
import { useActiveWorkoutEnvironment } from '@/hooks/useActiveWorkoutEnvironment';

interface PersonalRecord {
  maxWeight: number;
  reps: string;
  date: string;
  prType?: 'weight' | 'reps' | 'duration';
}

interface FamilyRecord extends PersonalRecord {
  exerciseName: string;
  familyLabel: string;
  transferability?: 'comparable';
}

interface LastUsedSetData { weight: number; reps: number }
interface LastUsedData { weight: number; reps: number; perSet?: LastUsedSetData[] }
interface WakeLockSentinelLike { release?: () => Promise<void> | void }

interface SetBySetCardProps {
  exercise: WorkoutExercise;
  exerciseIndex: number;
  totalExercises: number;
  completedWorkoutSets?: number;
  totalWorkoutSets?: number;
  currentSetIndex: number;
  onChange: (exercise: WorkoutExercise) => void;
  onSetIndexChange: (index: number) => void;
  onNextExercise: () => void;
  onPrevExercise: () => void;
  onSkipExercise: () => void;
  onSwapExercise?: () => void;
  onJumpToExercise?: (index: number) => void;
  onComplete: () => void;
  isFirstExercise: boolean;
  isLastExercise: boolean;
  personalRecord?: PersonalRecord;
  familyRecord?: FamilyRecord;
  lastUsed?: LastUsedData;
  workoutBias?: 'heavy' | 'volume';
  defaultRestSeconds?: number;
  autoRestTimer?: boolean;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

function numberLabel(value: number) {
  if (!Number.isFinite(value)) return '0';
  return Number(value.toFixed(2)).toString();
}

function parseTargetReps(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 8;
}

function renumberSets(sets: ExerciseSet[]) {
  return sets.map((set, index) => ({ ...set, setNumber: index + 1 }));
}

export function SetBySetCard({
  exercise,
  exerciseIndex,
  totalExercises,
  completedWorkoutSets,
  totalWorkoutSets,
  currentSetIndex,
  onChange,
  onSetIndexChange,
  onNextExercise,
  onPrevExercise,
  onSkipExercise,
  onSwapExercise,
  onJumpToExercise,
  onComplete,
  isFirstExercise,
  isLastExercise,
  personalRecord,
  familyRecord,
  lastUsed,
  workoutBias,
  defaultRestSeconds = 90,
  autoRestTimer = true,
}: SetBySetCardProps) {
  const currentSet = exercise.sets[currentSetIndex];
  const [editing, setEditing] = useState<'weight' | 'reps' | 'time' | null>(null);
  const [restOpen, setRestOpen] = useState(false);
  const [restDuration, setRestDuration] = useState(defaultRestSeconds);
  const [timedRunning, setTimedRunning] = useState(false);
  const [timedSeconds, setTimedSeconds] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [removedSet, setRemovedSet] = useState<{ set: ExerciseSet; index: number } | null>(null);
  const timedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const environment = useActiveWorkoutEnvironment();

  const exType = exercise.exerciseType || 'weighted';
  const isTimed = exType === 'timed';
  const isBodyweight = exType === 'bodyweight';
  const isWeightedBW = exType === 'weighted_bw';
  const showWeight = exType === 'weighted' || isWeightedBW;
  const showReps = !isTimed;
  const isFirstSet = currentSetIndex === 0;
  const isLastSet = currentSetIndex === exercise.sets.length - 1;
  const completedAcrossWorkout = completedWorkoutSets ?? exercise.sets.filter(set => set.completed).length;
  const totalAcrossWorkout = totalWorkoutSets ?? exercise.sets.length;
  const remainingAcrossWorkout = Math.max(0, totalAcrossWorkout - completedAcrossWorkout);

  useEffect(() => {
    if (!readDevicePreference('keepScreenAwake')) return;
    let cancelled = false;
    const request = async () => {
      const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
      if (!wakeLock || document.visibilityState !== 'visible') return;
      try {
        const sentinel = await wakeLock.request('screen');
        if (cancelled) await sentinel.release?.();
        else wakeLockRef.current = sentinel;
      } catch {
        // Wake Lock is an enhancement. Training must never depend on it.
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible' && !wakeLockRef.current) void request(); };
    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const release = wakeLockRef.current?.release?.();
      if (release && typeof release.catch === 'function') release.catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  useEffect(() => () => { if (timedRef.current) clearInterval(timedRef.current); }, []);

  useEffect(() => {
    setEditing(null);
    setRestOpen(false);
    setTimedRunning(false);
    setTimedSeconds(0);
    setRemovedSet(null);
    setFinishConfirm(false);
    if (timedRef.current) {
      clearInterval(timedRef.current);
      timedRef.current = null;
    }
  }, [exerciseIndex]);

  useEffect(() => {
    if (!removedSet) return;
    const timer = window.setTimeout(() => setRemovedSet(null), 7000);
    return () => window.clearTimeout(timer);
  }, [removedSet]);

  if (!currentSet) return null;

  const previous = lastUsed?.perSet?.[currentSetIndex] ?? (lastUsed ? { weight: lastUsed.weight, reps: lastUsed.reps } : undefined);
  const previousCompleted = currentSetIndex > 0 && exercise.sets[currentSetIndex - 1]?.completed ? exercise.sets[currentSetIndex - 1] : undefined;

  const baseWeight = (() => {
    const current = Number(currentSet.actualWeight);
    if (current > 0 || (isWeightedBW && current === 0 && currentSet.actualWeight !== '')) return current;
    const prior = Number(previousCompleted?.actualWeight);
    if (prior > 0 || (isWeightedBW && prior === 0 && previousCompleted?.actualWeight !== '')) return prior;
    if (previous?.weight != null && Number.isFinite(previous.weight)) return previous.weight;
    const target = Number(currentSet.targetWeight);
    return Number.isFinite(target) ? target : 0;
  })();

  const baseReps = (() => {
    const current = Number(currentSet.actualReps);
    if (current > 0) return current;
    const prior = Number(previousCompleted?.actualReps);
    if (prior > 0) return prior;
    if (previous?.reps) return previous.reps;
    return parseTargetReps(currentSet.targetReps);
  })();

  const baseTime = currentSet.actualTime || currentSet.targetTime || parseTargetReps(currentSet.targetReps) || 30;
  const selectedWeight = currentSet.actualWeight !== '' ? Number(currentSet.actualWeight) : baseWeight;
  const selectedReps = currentSet.actualReps !== '' ? Number(currentSet.actualReps) : baseReps;
  const selectedTime = currentSet.actualTime || baseTime;
  const equipment = getEquipmentType(exercise.name);
  const weightLabel = isWeightedBW ? '+kg' : getWeightLabel(equipment);

  const patchSet = (patch: Partial<ExerciseSet>) => {
    if (!environment.canEdit) return;
    const sets = exercise.sets.map((set, index) => index === currentSetIndex ? { ...set, ...patch } : set);
    onChange({ ...exercise, sets });
  };

  const setWeight = (value: number) => patchSet({ actualWeight: numberLabel(Math.max(0, value)) });
  const setReps = (value: number) => patchSet({ actualReps: String(Math.max(0, Math.round(value))) });
  const setTime = (value: number) => patchSet({ actualTime: Math.max(0, Math.round(value)) });

  const defaultRest = () => {
    if (exercise.restSeconds) return exercise.restSeconds;
    if (workoutBias === 'heavy') return 180;
    if (workoutBias === 'volume') return 90;
    if (exercise.category === 'primary') return 120;
    if (isTimed) return 60;
    return defaultRestSeconds;
  };

  const completeSet = () => {
    if (!environment.canEdit) return;
    haptic('success');
    const finalTime = isTimed ? (currentSet.actualTime || (timedRunning ? timedSeconds : baseTime)) : undefined;
    if (timedRef.current) clearInterval(timedRef.current);
    timedRef.current = null;
    setTimedRunning(false);

    const finalWeight = showWeight ? numberLabel(selectedWeight) : '';
    const finalReps = isTimed ? String(finalTime) : String(selectedReps);
    const sets = exercise.sets.map((set, index) => index === currentSetIndex ? {
      ...set,
      completed: true,
      actualWeight: finalWeight,
      actualReps: finalReps,
      actualTime: finalTime,
    } : set);

    if (!isLastSet) {
      const next = sets[currentSetIndex + 1];
      sets[currentSetIndex + 1] = {
        ...next,
        actualWeight: next.actualWeight || finalWeight,
        actualReps: next.actualReps || finalReps,
        actualTime: next.actualTime || finalTime,
      };
    }
    onChange({ ...exercise, sets });

    if (!isLastSet && autoRestTimer) {
      setRestDuration(defaultRest());
      setRestOpen(true);
    } else if (!isLastSet) {
      onSetIndexChange(currentSetIndex + 1);
    }
  };

  const advanceAfterRest = () => {
    setRestOpen(false);
    if (!isLastSet) onSetIndexChange(currentSetIndex + 1);
  };

  const addSet = () => {
    if (!environment.canEdit) return;
    const lastCompleted = [...exercise.sets].reverse().find(set => set.completed);
    const last = exercise.sets[exercise.sets.length - 1];
    const next: ExerciseSet = {
      setNumber: last.setNumber + 1,
      targetWeight: lastCompleted?.actualWeight || last.targetWeight,
      targetReps: lastCompleted?.actualReps || last.targetReps,
      actualWeight: lastCompleted?.actualWeight || '',
      actualReps: lastCompleted?.actualReps || '',
      targetTime: lastCompleted?.actualTime || last.targetTime,
      completed: false,
    };
    const updated = { ...exercise, sets: [...exercise.sets, next] };
    onChange(updated);
    onSetIndexChange(updated.sets.length - 1);
    haptic('light');
  };

  const removeCurrentSet = () => {
    if (!environment.canEdit || exercise.sets.length <= 1) return;
    const removed = exercise.sets[currentSetIndex];
    const nextSets = renumberSets(exercise.sets.filter((_, index) => index !== currentSetIndex));
    setRestOpen(false);
    setRemovedSet({ set: removed, index: currentSetIndex });
    onChange({ ...exercise, sets: nextSets });
    onSetIndexChange(Math.min(currentSetIndex, nextSets.length - 1));
    haptic('light');
  };

  const undoRemoveSet = () => {
    if (!environment.canEdit || !removedSet) return;
    const nextSets = [...exercise.sets];
    nextSets.splice(Math.min(removedSet.index, nextSets.length), 0, removedSet.set);
    const renumbered = renumberSets(nextSets);
    onChange({ ...exercise, sets: renumbered });
    onSetIndexChange(Math.min(removedSet.index, renumbered.length - 1));
    setRemovedSet(null);
    haptic('light');
  };

  const toggleTimed = () => {
    if (!environment.canEdit) return;
    if (timedRunning) {
      if (timedRef.current) clearInterval(timedRef.current);
      timedRef.current = null;
      setTimedRunning(false);
      setTime(timedSeconds);
      return;
    }
    setTimedSeconds(selectedTime > 0 ? selectedTime : 0);
    setTimedRunning(true);
    const started = Date.now() - (selectedTime > 0 ? selectedTime * 1000 : 0);
    timedRef.current = setInterval(() => setTimedSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
  };

  const relationshipOptions = getExerciseRelationships(exercise.name);
  const legacyOptions = getExerciseVariants(exercise.name).filter(option => option.name !== exercise.name);

  const replaceWith = (name: string) => {
    if (!environment.canEdit) return;
    const transfer = getPrTransferability(exercise.name, name);
    const keepLoad = transfer === 'shared' || transfer === 'comparable';
    const sets = exercise.sets.map(set => ({ ...set, targetWeight: keepLoad ? set.targetWeight : '', actualWeight: keepLoad ? set.actualWeight : '' }));
    onChange({ ...exercise, name, sets });
    haptic('medium');
  };

  const completedSets = exercise.sets.filter(set => set.completed).length;
  const completedWeightSets = exercise.sets.filter(set => set.completed && Number(set.actualWeight) > 0);
  const bestWeight = Math.max(0, ...completedWeightSets.map(set => Number(set.actualWeight)));
  const bestRepsAtWeight = Math.max(0, ...completedWeightSets.filter(set => Number(set.actualWeight) === bestWeight).map(set => Number(set.actualReps) || 0));
  const currentBest = isTimed
    ? Math.max(0, ...exercise.sets.filter(set => set.completed).map(set => set.actualTime || 0))
    : isBodyweight
      ? Math.max(0, ...exercise.sets.filter(set => set.completed).map(set => Number(set.actualReps) || 0))
      : bestWeight;
  const historicalPrReps = personalRecord ? Number.parseInt(personalRecord.reps) || 0 : 0;
  const isNewPR = currentBest > 0 && (!personalRecord || (isTimed || isBodyweight
    ? currentBest > personalRecord.maxWeight
    : bestWeight > personalRecord.maxWeight || (bestWeight === personalRecord.maxWeight && bestRepsAtWeight > historicalPrReps)));

  const previousLabel = previous
    ? showWeight ? `${numberLabel(previous.weight)} ${weightLabel.replace('+', '')} × ${previous.reps}` : `${previous.reps} reps`
    : 'First logged session';
  const targetLabel = isTimed
    ? formatTime(baseTime)
    : `${showWeight && currentSet.targetWeight ? `${currentSet.targetWeight} ${weightLabel.replace('+', '')} · ` : ''}${currentSet.targetReps || `${baseReps} reps`}`;

  const requestFinish = () => {
    if (!environment.canEdit) return;
    if (remainingAcrossWorkout > 0) {
      setFinishConfirm(true);
      return;
    }
    onComplete();
  };

  const completeOrAdvance = () => {
    if (!environment.canEdit) return;
    if (!currentSet.completed) completeSet();
    else if (!isLastSet) advanceAfterRest();
    else if (isLastExercise) requestFinish();
    else onNextExercise();
  };

  if (environment.otherTabActive) {
    return <div className="w-full min-w-0 space-y-4">
      <div className="flex items-center gap-2">
        <span className="type-meta whitespace-nowrap tabular-nums">{exerciseIndex + 1}/{totalExercises}</span>
        <div className="flex flex-1 gap-1" aria-label={`Exercise ${exerciseIndex + 1} of ${totalExercises}`}>{Array.from({ length: totalExercises }).map((_, index) => <span key={index} className={cn('h-1.5 flex-1 rounded-full', index < exerciseIndex ? 'bg-foreground' : index === exerciseIndex ? 'bg-foreground/55' : 'bg-muted')} />)}</div>
        <span className="inline-flex items-center gap-1 type-meta whitespace-nowrap tabular-nums"><Clock3 className="h-3.5 w-3.5" aria-hidden />{environment.elapsedLabel}</span>
      </div>
      <section className="rounded-[22px] border border-warning/40 bg-card p-5" role="status">
        <div className="flex gap-3"><AlertTriangle className="h-5 w-5 mt-0.5 shrink-0"/><div className="min-w-0 flex-1"><div className="font-semibold">This workout is active in another tab.</div><p className="type-supporting mt-1">Set editing is locked here so two tabs cannot race the same draft. Take over only if this is the tab you want to keep using.</p></div></div>
        <div className="mt-4 rounded-xl bg-muted/50 p-3"><div className="type-eyebrow">Current set</div><div className="mt-1 text-lg font-semibold">{exercise.name}</div><div className="type-caption mt-1">Set {currentSetIndex + 1} · Previous: {previousLabel} · Target: {targetLabel}</div></div>
        <button onClick={() => environment.takeOver()} className="mt-4 w-full min-h-12 rounded-xl bg-foreground text-background text-sm font-semibold">Take over in this tab</button>
      </section>
    </div>;
  }

  return (
    <div className="w-full min-w-0 space-y-4">

      <div className="flex items-center gap-2">
        <span className="type-meta whitespace-nowrap tabular-nums">{exerciseIndex + 1}/{totalExercises}</span>
        <div className="flex flex-1 gap-1" aria-label={`Exercise ${exerciseIndex + 1} of ${totalExercises}`}>
          {Array.from({ length: totalExercises }).map((_, index) => <button key={index} onClick={() => onJumpToExercise?.(index)} aria-label={`Go to exercise ${index + 1}`} className={cn('h-1.5 flex-1 rounded-full', index < exerciseIndex ? 'bg-foreground' : index === exerciseIndex ? 'bg-foreground/55' : 'bg-muted')} />)}
        </div>
        <span className="inline-flex items-center gap-1 type-meta whitespace-nowrap tabular-nums"><Clock3 className="h-3.5 w-3.5" aria-hidden />{environment.elapsedLabel}</span>
        {typeof completedWorkoutSets === 'number' && typeof totalWorkoutSets === 'number' && <span className="type-meta whitespace-nowrap tabular-nums hidden sm:inline">{completedWorkoutSets}/{totalWorkoutSets} sets</span>}
      </div>

      {environment.unusuallyLong && <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm"><span className="font-semibold">Workout has been running for {environment.elapsedLabel}.</span><span className="text-muted-foreground"> If you are still training, continue normally. RepTrack will not auto-finish it.</span></div>}

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="type-eyebrow">Current exercise</div>
          <h2 className="type-section-title mt-1 break-words">{exercise.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 type-caption"><span>{exercise.category}</span><span>·</span><span className="tabular-nums">{completedSets}/{exercise.sets.length} sets</span>{exercise.rir && <><span>·</span><span>{exercise.rir} RIR target</span></>}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button aria-label="Exercise options" className="h-11 w-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50 max-h-[60dvh] overflow-y-auto min-w-64">
            <DropdownMenuLabel>Exercise</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setHistoryOpen(true)}><History className="mr-2 h-4 w-4"/>View history</DropdownMenuItem>
            {onSwapExercise && <DropdownMenuItem onClick={onSwapExercise}>Search exercise library</DropdownMenuItem>}
            {relationshipOptions.filter(option => option.kind === 'variation').length > 0 && <><DropdownMenuSeparator/><DropdownMenuLabel>Variations</DropdownMenuLabel>{relationshipOptions.filter(option => option.kind === 'variation').map(option => <DropdownMenuItem key={option.name} onClick={() => replaceWith(option.name)}><span className="flex-1">{option.name}</span><span className="ml-3 type-meta">{option.prTransfer === 'comparable' ? 'PR comparable' : 'own PR'}</span></DropdownMenuItem>)}</>}
            {relationshipOptions.filter(option => option.kind === 'alternative').length > 0 && <><DropdownMenuSeparator/><DropdownMenuLabel>Alternatives</DropdownMenuLabel>{relationshipOptions.filter(option => option.kind === 'alternative').map(option => <DropdownMenuItem key={option.name} onClick={() => replaceWith(option.name)}><span className="flex-1">{option.name}</span><span className="ml-3 type-meta">separate PR</span></DropdownMenuItem>)}</>}
            {!relationshipOptions.length && legacyOptions.map(option => <DropdownMenuItem key={option.name} onClick={() => replaceWith(option.name)}>{option.name}</DropdownMenuItem>)}
            {completedAcrossWorkout > 0 && <><DropdownMenuSeparator/><DropdownMenuItem onClick={requestFinish}>Finish workout</DropdownMenuItem></>}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <section className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border" aria-label="Set context">
        <div className="grid grid-cols-[72px_1fr] px-4 py-2.5"><span className="type-caption">Previous</span><span className="text-sm font-medium tabular-nums text-right">{previousLabel}</span></div>
        <div className="grid grid-cols-[72px_1fr] px-4 py-2.5"><span className="type-caption">Target</span><span className="text-sm font-medium tabular-nums text-right">{targetLabel}</span></div>
        {personalRecord && <div className="grid grid-cols-[72px_1fr] px-4 py-2.5"><span className="type-caption">Record</span><span className="text-sm font-medium tabular-nums text-right">{personalRecord.prType === 'duration' ? formatTime(personalRecord.maxWeight) : personalRecord.prType === 'reps' ? `${personalRecord.maxWeight} reps` : `${numberLabel(personalRecord.maxWeight)} ${weightLabel.replace('+','')}${personalRecord.reps ? ` × ${personalRecord.reps}` : ''}`}</span></div>}
        {!personalRecord && familyRecord && <div className="grid grid-cols-[72px_1fr] px-4 py-2.5"><span className="type-caption">Reference</span><span className="text-sm font-medium tabular-nums text-right">{familyRecord.exerciseName} · {numberLabel(familyRecord.maxWeight)} kg</span></div>}
      </section>

      <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {exercise.sets.map((set, index) => <button key={index} onClick={() => onSetIndexChange(index)} aria-label={`Go to set ${index + 1}`} aria-current={index === currentSetIndex ? 'step' : undefined} className={cn('h-10 min-w-10 rounded-full type-meta tabular-nums flex items-center justify-center', set.completed ? 'bg-foreground text-background' : index === currentSetIndex ? 'border-2 border-foreground text-foreground' : 'bg-muted text-muted-foreground')}>{set.completed ? <Check className="h-4 w-4" /> : index + 1}</button>)}
        <button onClick={addSet} aria-label="Add set" className="h-10 min-w-10 rounded-full border border-dashed border-border text-muted-foreground flex items-center justify-center"><Plus className="h-4 w-4" /></button>
      </div>

      {removedSet && <div role="status" className="rounded-xl border border-border bg-muted/35 px-3 py-2.5 flex items-center gap-3"><span className="text-sm flex-1">Set removed.</span><button onClick={undoRemoveSet} className="min-h-10 px-3 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-muted"><Undo2 className="h-4 w-4"/>Undo</button></div>}

      <section className={cn('rounded-[22px] border p-4', currentSet.completed ? 'border-border bg-muted/30' : 'border-border bg-card')}>
        <div className="flex items-center justify-between gap-3 mb-4"><div><div className="type-eyebrow">Actual</div><div className="text-sm font-semibold mt-0.5">Set {currentSetIndex + 1} of {exercise.sets.length}</div></div><div className="flex items-center gap-2">{isNewPR && <span className="rounded-full bg-foreground text-background px-2.5 py-1 text-xs font-bold">New PR</span>}{exercise.sets.length > 1 && <button onClick={removeCurrentSet} aria-label={`Remove set ${currentSetIndex + 1}`} className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-muted flex items-center justify-center"><Trash2 className="h-4 w-4"/></button>}</div></div>

        {isTimed ? <div className="space-y-3"><button onClick={toggleTimed} className="w-full rounded-2xl bg-muted py-5 text-center"><div className="text-4xl font-semibold tabular-nums">{formatTime(timedRunning ? timedSeconds : selectedTime)}</div><div className="type-caption mt-1">{timedRunning ? 'Tap to stop timer' : 'Tap to start timer'}</div></button>{editing === 'time' ? <Input autoFocus type="number" inputMode="numeric" value={selectedTime} onChange={event => setTime(Number(event.target.value))} onBlur={() => setEditing(null)} className="h-12 text-center text-lg tabular-nums" /> : <button onClick={() => setEditing('time')} className="w-full min-h-11 text-sm font-semibold text-muted-foreground">Enter another duration</button>}</div> : <div className={cn('grid gap-3', showWeight ? 'grid-cols-2' : 'grid-cols-1')}>
          {showWeight && <div><div className="type-caption text-center mb-2">Weight ({weightLabel})</div>{editing === 'weight' ? <Input autoFocus type="number" inputMode="decimal" step="0.01" value={currentSet.actualWeight !== '' ? currentSet.actualWeight : selectedWeight} onChange={event => patchSet({ actualWeight: event.target.value })} onBlur={() => setEditing(null)} onKeyDown={event => event.key === 'Enter' && setEditing(null)} className="h-14 text-center text-xl font-semibold tabular-nums" /> : <div className="grid grid-cols-[44px_1fr_44px] gap-1"><button onClick={() => setWeight(selectedWeight - 2.5)} className="h-14 rounded-xl bg-muted text-lg" aria-label="Decrease weight by 2.5">−</button><button onClick={() => setEditing('weight')} className="h-14 rounded-xl bg-muted text-xl font-semibold tabular-nums">{isWeightedBW ? '+' : ''}{numberLabel(selectedWeight)}</button><button onClick={() => setWeight(selectedWeight + 2.5)} className="h-14 rounded-xl bg-muted text-lg" aria-label="Increase weight by 2.5">+</button></div>}</div>}
          {showReps && <div><div className="type-caption text-center mb-2">Reps</div>{editing === 'reps' ? <Input autoFocus type="number" inputMode="numeric" value={currentSet.actualReps !== '' ? currentSet.actualReps : selectedReps} onChange={event => patchSet({ actualReps: event.target.value })} onBlur={() => setEditing(null)} onKeyDown={event => event.key === 'Enter' && setEditing(null)} className="h-14 text-center text-xl font-semibold tabular-nums" /> : <div className="grid grid-cols-[44px_1fr_44px] gap-1"><button onClick={() => setReps(selectedReps - 1)} className="h-14 rounded-xl bg-muted text-lg" aria-label="Decrease reps by 1">−</button><button onClick={() => setEditing('reps')} className="h-14 rounded-xl bg-muted text-xl font-semibold tabular-nums">{selectedReps}</button><button onClick={() => setReps(selectedReps + 1)} className="h-14 rounded-xl bg-muted text-lg" aria-label="Increase reps by 1">+</button></div>}</div>}
        </div>
      </section>

      {finishConfirm && <div className="rounded-2xl border border-border bg-card p-4" role="region" aria-live="polite" aria-label="Finish incomplete workout"><div className="font-semibold">End workout?</div><p className="type-supporting mt-1">{remainingAcrossWorkout} {remainingAcrossWorkout === 1 ? 'set is' : 'sets are'} still incomplete.</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => setFinishConfirm(false)} className="min-h-12 rounded-xl border border-border text-sm font-semibold">Keep training</button><button onClick={onComplete} className="min-h-12 rounded-xl bg-foreground text-background text-sm font-semibold">End anyway</button></div></div>}

      {restOpen && <RestTimer isOpen defaultDuration={restDuration} onDismiss={advanceAfterRest} onComplete={advanceAfterRest} />}

      <div className="flex gap-2 pb-[max(4px,env(safe-area-inset-bottom))]">
        {(!isFirstSet || !isFirstExercise) && <button onClick={() => { if (!isFirstSet) onSetIndexChange(currentSetIndex - 1); else onPrevExercise(); }} aria-label="Previous set or exercise" className="h-14 w-12 rounded-xl border border-border flex items-center justify-center text-muted-foreground"><ChevronLeft className="h-5 w-5" /></button>}
        {!currentSet.completed && <button onClick={onSkipExercise} className="h-14 px-3 rounded-xl text-sm font-semibold text-muted-foreground flex items-center gap-1"><SkipForward className="h-4 w-4"/>Skip</button>}
        <button onClick={completeOrAdvance} className="h-14 flex-1 rounded-xl bg-foreground text-background font-bold flex items-center justify-center gap-2 min-w-0">{!currentSet.completed ? <><Check className="h-4 w-4"/>{isTimed ? `Log ${formatTime(selectedTime)}` : isBodyweight ? `Log ${selectedReps} reps` : `Log ${isWeightedBW ? '+' : ''}${numberLabel(selectedWeight)}${weightLabel.replace('+','')} × ${selectedReps}`}</> : isLastSet ? <>{isLastExercise ? (remainingAcrossWorkout > 0 ? 'Review finish' : 'Finish workout') : 'Next exercise'}<ChevronRight className="h-4 w-4"/></> : <>Next set<ChevronRight className="h-4 w-4"/></>}</button>
      </div>

      <ExerciseHistorySheet exerciseName={exercise.name} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
