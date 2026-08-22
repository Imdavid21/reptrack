import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, ArrowLeftRight, ChevronLeft, Check, SkipForward, Timer, RefreshCw } from 'lucide-react';
import { getExerciseVariants, hasVariants, getEquipmentType, getWeightLabel } from '@/lib/exerciseVariants';
import { Input } from '@/components/ui/input';
import { haptic } from '@/lib/haptics';
import { RestTimer } from './RestTimer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PersonalRecord {
  maxWeight: number;
  reps: string;
  date: string;
  prType?: 'weight' | 'reps' | 'duration';
}

interface FamilyRecord extends PersonalRecord {
  exerciseName: string;
  familyLabel: string;
}

interface LastUsedSetData {
  weight: number;
  reps: number;
}

interface LastUsedData {
  weight: number;
  reps: number;
  perSet?: LastUsedSetData[];
}

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
  /** Best comparable lift elsewhere in the same movement family. Shown only
   *  as progression context when this exact variation has no record yet - it
   *  never stands in for, or overwrites, the variation's own PR. */
  familyRecord?: FamilyRecord;
  lastUsed?: LastUsedData;
  workoutBias?: 'heavy' | 'volume';
  /** Settings fallback used only when no exercise-specific or bias-derived
   *  rest duration applies - see getDefaultRest(). Defaults to 90. */
  defaultRestSeconds?: number;
  /** Whether completing a set should automatically pop the rest timer.
   *  Defaults to true (existing behavior) when not provided. */
  autoRestTimer?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
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
  const isLastSet = currentSetIndex === exercise.sets.length - 1;
  const isFirstSet = currentSetIndex === 0;
  const prevSet = currentSetIndex > 0 ? exercise.sets[currentSetIndex - 1] : null;
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [showRepsInput, setShowRepsInput] = useState(false);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exType = exercise.exerciseType || 'weighted';
  const isTimed = exType === 'timed';
  const isBodyweight = exType === 'bodyweight';
  const isWeightedBW = exType === 'weighted_bw';
  const showWeight = exType === 'weighted' || exType === 'weighted_bw';
  const showReps = exType === 'weighted' || exType === 'bodyweight' || exType === 'weighted_bw';

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setShowRestTimer(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [currentSetIndex, exerciseIndex]);

  const completedPrev = prevSet?.completed ? prevSet : null;
  const lastUsedForSet = lastUsed?.perSet?.[currentSetIndex];

  const getBaseWeight = (): number => {
    if (currentSet.actualWeight) return parseFloat(currentSet.actualWeight);
    if (completedPrev?.actualWeight) return parseFloat(completedPrev.actualWeight);
    if (lastUsedForSet?.weight) return lastUsedForSet.weight;
    if (lastUsed?.weight) return lastUsed.weight;
    return parseFloat(currentSet.targetWeight) || 0;
  };

  const getBaseReps = (): number => {
    if (currentSet.actualReps) return parseInt(currentSet.actualReps);
    if (completedPrev?.actualReps) return parseInt(completedPrev.actualReps);
    if (lastUsedForSet?.reps) return lastUsedForSet.reps;
    if (lastUsed?.reps) return lastUsed.reps;
    return parseInt(currentSet.targetReps) || 8;
  };

  const getBaseTime = (): number => {
    if (currentSet.actualTime) return currentSet.actualTime;
    if (completedPrev?.actualTime) return completedPrev.actualTime;
    if (currentSet.targetTime) return currentSet.targetTime;
    const parsed = parseInt(currentSet.targetReps);
    return !isNaN(parsed) ? parsed : 30;
  };

  const baseWeight = getBaseWeight();
  const baseReps = getBaseReps();
  const baseTime = getBaseTime();

  const generateWeightOptions = (): number[] => {
    const options = new Set<number>();
    const increments = isWeightedBW
      ? [-10, -5, -2.5, 0, 2.5, 5, 10, 15, 20]
      : [-20, -15, -10, -5, -2.5, 0, 2.5, 5, 10, 15, 20];
    increments.forEach(delta => {
      const w = baseWeight + delta;
      if (isWeightedBW ? w >= 0 : w > 0) options.add(w);
    });
    return Array.from(options).sort((a, b) => a - b);
  };

  const generateRepOptions = (): number[] => {
    const options = new Set<number>();
    const range = isBodyweight
      ? [-8, -5, -3, -2, -1, 0, 1, 2, 3, 5, 8]
      : [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
    range.forEach(delta => {
      const r = baseReps + delta;
      if (r > 0 && r <= 100) options.add(r);
    });
    return Array.from(options).sort((a, b) => a - b);
  };

  const generateTimeOptions = (): number[] => {
    const options = new Set<number>();
    [-30, -15, -10, -5, 0, 5, 10, 15, 30].forEach(delta => {
      const t = baseTime + delta;
      if (t > 0 && t <= 300) options.add(t);
    });
    return Array.from(options).sort((a, b) => a - b);
  };

  const weightOptions = showWeight ? generateWeightOptions() : [];
  const repOptions = showReps ? generateRepOptions() : [];
  const timeOptions = isTimed ? generateTimeOptions() : [];

  const handleWeightSelect = (weight: number) => {
    haptic('light');
    const updated = { ...exercise, sets: [...exercise.sets] };
    updated.sets[currentSetIndex] = { ...updated.sets[currentSetIndex], actualWeight: weight.toString() };
    onChange(updated);
  };

  const handleRepsSelect = (reps: number) => {
    haptic('light');
    const updated = { ...exercise, sets: [...exercise.sets] };
    updated.sets[currentSetIndex] = { ...updated.sets[currentSetIndex], actualReps: reps.toString() };
    onChange(updated);
  };

  const handleTimeSelect = (seconds: number) => {
    haptic('light');
    const updated = { ...exercise, sets: [...exercise.sets] };
    updated.sets[currentSetIndex] = { ...updated.sets[currentSetIndex], actualTime: seconds };
    onChange(updated);
  };

  const toggleTimer = () => {
    if (isTimerRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTimerRunning(false);
      handleTimeSelect(timerSeconds);
    } else {
      setTimerSeconds(0);
      setIsTimerRunning(true);
      timerRef.current = setInterval(() => setTimerSeconds(prev => prev + 1), 1000);
    }
  };

  const getDefaultRest = (): number => {
    if (exercise.restSeconds) return exercise.restSeconds;
    if (workoutBias === 'heavy') return 180;
    if (workoutBias === 'volume') return 90;
    if (exercise.category === 'primary') return 120;
    if (isTimed) return 60;
    return defaultRestSeconds;
  };

  const completeSet = () => {
    haptic('success');
    const updated = { ...exercise, sets: [...exercise.sets] };

    if (isTimed) {
      const finalTime = currentSet.actualTime || (isTimerRunning ? timerSeconds : baseTime);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTimerRunning(false);
      updated.sets[currentSetIndex] = {
        ...updated.sets[currentSetIndex],
        completed: true,
        actualTime: finalTime,
        actualReps: String(finalTime),
        actualWeight: '',
      };
    } else {
      const finalWeight = showWeight ? (currentSet.actualWeight || baseWeight.toString()) : '';
      const finalReps = currentSet.actualReps || baseReps.toString();
      updated.sets[currentSetIndex] = {
        ...updated.sets[currentSetIndex],
        completed: true,
        actualWeight: finalWeight,
        actualReps: finalReps,
      };
    }
    onChange(updated);

    if (isLastSet) return;

    const nextSetIndex = currentSetIndex + 1;
    if (isTimed) {
      updated.sets[nextSetIndex] = {
        ...updated.sets[nextSetIndex],
        actualTime: updated.sets[nextSetIndex].actualTime || updated.sets[currentSetIndex].actualTime,
      };
    } else {
      const finalWeight = showWeight ? (currentSet.actualWeight || baseWeight.toString()) : '';
      const finalReps = currentSet.actualReps || baseReps.toString();
      updated.sets[nextSetIndex] = {
        ...updated.sets[nextSetIndex],
        actualWeight: updated.sets[nextSetIndex].actualWeight || finalWeight,
        actualReps: updated.sets[nextSetIndex].actualReps || finalReps,
      };
    }
    onChange(updated);

    if (autoRestTimer) {
      setRestDuration(getDefaultRest());
      setShowRestTimer(true);
    } else {
      onSetIndexChange(currentSetIndex + 1);
    }
  };

  const handleRestDismiss = useCallback(() => {
    setShowRestTimer(false);
    if (!isLastSet) onSetIndexChange(currentSetIndex + 1);
  }, [isLastSet, currentSetIndex, onSetIndexChange]);

  const handleRestComplete = useCallback(() => {
    setShowRestTimer(false);
    if (!isLastSet) onSetIndexChange(currentSetIndex + 1);
  }, [isLastSet, currentSetIndex, onSetIndexChange]);

  const skipSet = () => {
    haptic('light');
    if (isLastSet) {
      if (isLastExercise) onComplete();
      else onSkipExercise();
    } else {
      onSetIndexChange(currentSetIndex + 1);
    }
  };

  const goToPrevSet = () => {
    haptic('light');
    if (!isFirstSet) onSetIndexChange(currentSetIndex - 1);
    else if (!isFirstExercise) onPrevExercise();
  };

  const addSet = () => {
    haptic('light');
    const updated = { ...exercise };
    const lastCompleted = [...updated.sets].reverse().find(s => s.completed);
    const lastSet = updated.sets[updated.sets.length - 1];
    updated.sets = [
      ...updated.sets,
      {
        setNumber: lastSet.setNumber + 1,
        targetWeight: lastCompleted?.actualWeight || lastSet.targetWeight,
        targetReps: lastCompleted?.actualReps || lastSet.targetReps,
        actualWeight: lastCompleted?.actualWeight || '',
        actualReps: lastCompleted?.actualReps || '',
        targetTime: lastCompleted?.actualTime || lastSet.targetTime,
        completed: false,
      },
    ];
    onChange(updated);
    onSetIndexChange(updated.sets.length - 1);
  };

  const switchVariant = (variantName: string, defaultWeight: string) => {
    haptic('medium');
    const updated = { ...exercise };
    updated.name = variantName;
    if (defaultWeight) updated.sets = updated.sets.map(set => ({ ...set, targetWeight: defaultWeight }));
    onChange(updated);
  };

  const completedSets = exercise.sets.filter(s => s.completed).length;
  const variants = getExerciseVariants(exercise.name);
  const showVariantSwitch = hasVariants(exercise.name);
  const equipmentType = getEquipmentType(exercise.name);
  const weightLabel = isWeightedBW ? '+kg' : getWeightLabel(equipmentType);

  const completedWeightSets = exercise.sets.filter(s => s.completed && s.actualWeight);
  const currentMaxWeight = Math.max(...completedWeightSets.map(s => parseFloat(s.actualWeight) || 0), 0);
  const currentMaxWeightBestReps = Math.max(
    ...completedWeightSets
      .filter(s => (parseFloat(s.actualWeight) || 0) === currentMaxWeight)
      .map(s => parseInt(s.actualReps) || 0),
    0
  );
  const currentMaxValue = isTimed
    ? Math.max(...exercise.sets.filter(s => s.completed && s.actualTime).map(s => s.actualTime || 0), 0)
    : isBodyweight
      ? Math.max(...exercise.sets.filter(s => s.completed && s.actualReps).map(s => parseInt(s.actualReps) || 0), 0)
      : currentMaxWeight;
  const prReps = personalRecord ? parseInt(personalRecord.reps) || 0 : 0;
  const isNewPR = currentMaxValue > 0 && (
    !personalRecord ||
    ((isTimed || isBodyweight)
      ? currentMaxValue > personalRecord.maxWeight
      : currentMaxWeight > personalRecord.maxWeight ||
        (currentMaxWeight === personalRecord.maxWeight && currentMaxWeightBestReps > prReps))
  );

  const selectedWeight = parseFloat(currentSet.actualWeight) || baseWeight;
  const selectedReps = parseInt(currentSet.actualReps) || baseReps;
  const selectedTime = currentSet.actualTime || baseTime;

  const getLogLabel = () => {
    if (isTimed) {
      if (isTimerRunning) return `Stop & log ${formatTime(timerSeconds)}`;
      return `Log ${formatTime(selectedTime)}`;
    }
    if (isBodyweight) return `Log ${selectedReps} reps`;
    if (isWeightedBW) return `Log +${selectedWeight}kg × ${selectedReps}`;
    return `Log ${selectedWeight}${weightLabel} × ${selectedReps}`;
  };

  return (
    <div className="w-full min-w-0 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="type-meta whitespace-nowrap tabular-nums">{exerciseIndex + 1}/{totalExercises}</span>
        <div className="flex flex-1 gap-0.5">
          {Array.from({ length: totalExercises }).map((_, i) => (
            <button
              key={i}
              onClick={() => onJumpToExercise?.(i)}
              aria-label={`Go to exercise ${i + 1}`}
              className={cn(
                'h-2 flex-1 rounded-full transition-all duration-300',
                i < exerciseIndex ? 'bg-foreground' : i === exerciseIndex ? 'bg-foreground/50' : 'bg-muted',
                onJumpToExercise && 'cursor-pointer hover:opacity-80 active:scale-95'
              )}
            />
          ))}
        </div>
        {typeof completedWorkoutSets === 'number' && typeof totalWorkoutSets === 'number' && (
          <span className="type-meta whitespace-nowrap tabular-nums">{completedWorkoutSets}/{totalWorkoutSets} sets</span>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="type-card-title">{exercise.name}</h2>
            {isTimed && <span className="rounded-full bg-muted px-2 py-0.5 type-meta">Timed</span>}
            {isBodyweight && <span className="rounded-full bg-muted px-2 py-0.5 type-meta">BW</span>}
            {isWeightedBW && <span className="rounded-full bg-muted px-2 py-0.5 type-meta">BW+</span>}
            {personalRecord && !isNewPR && (
              <span className="type-meta tabular-nums">
                PR · {personalRecord.prType === 'duration'
                  ? formatTime(personalRecord.maxWeight)
                  : personalRecord.prType === 'reps'
                    ? `${personalRecord.maxWeight} reps`
                    : `${personalRecord.maxWeight}${weightLabel}${personalRecord.reps ? ` × ${personalRecord.reps}` : ''}`}
              </span>
            )}
            {!personalRecord && familyRecord && (
              <span className="type-meta tabular-nums">
                {familyRecord.familyLabel} best · {familyRecord.maxWeight}{weightLabel} ({familyRecord.exerciseName})
              </span>
            )}
            {!personalRecord && !familyRecord && !isNewPR && <span className="type-meta">No PR yet</span>}
            {isNewPR && <span className="inline-flex items-center gap-1 rounded-full bg-energy-soft px-2 py-0.5 type-meta text-energy-ink"><Check className="h-3 w-3" />New PR</span>}
          </div>
          <div className="mt-1 type-meta">
            <span className="tabular-nums">{completedSets}/{exercise.sets.length} sets</span>
            {exercise.rir && <span className="ml-2 text-foreground">@ {exercise.rir} RIR</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onSwapExercise && (
            <button onClick={onSwapExercise} aria-label="Replace exercise" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {showVariantSwitch && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Switch exercise variation" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 border-border bg-background">
                {variants.map((variant) => (
                  <DropdownMenuItem key={variant.name} onClick={() => switchVariant(variant.name, variant.defaultWeight)} className={cn('cursor-pointer text-sm', variant.name === exercise.name && 'bg-energy-soft')}>
                    {variant.name}
                    {variant.name === exercise.name && <Check className="ml-auto h-3.5 w-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {exercise.sets.map((set, idx) => (
          <button
            key={idx}
            onClick={() => onSetIndexChange(idx)}
            aria-label={`Go to set ${idx + 1}`}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full type-meta transition-all duration-150',
              set.completed
                ? 'bg-energy-soft text-energy-ink'
                : idx === currentSetIndex
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {set.completed ? <Check className="h-3.5 w-3.5" /> : idx + 1}
          </button>
        ))}
        <button onClick={addSet} aria-label="Add set" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className={cn('surface-standard p-4 transition-colors', currentSet.completed && 'border-energy-border bg-energy-soft')}>
        <div className="mb-4 text-center type-eyebrow">Set {currentSetIndex + 1}</div>

        {isTimed && (
          <div className="space-y-4">
            <div className="text-center">
              <div className={cn('metric-hero tabular-nums', isTimerRunning && 'text-energy-ink')}>{formatTime(isTimerRunning ? timerSeconds : selectedTime)}</div>
              <div className="mt-1 type-meta">{isTimerRunning ? 'Timing' : `Target · ${formatTime(baseTime)}`}</div>
            </div>

            <button
              onClick={toggleTimer}
              className={cn(
                'control-standard flex w-full items-center justify-center gap-2 rounded-xl type-action transition-colors',
                isTimerRunning ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-foreground'
              )}
            >
              <Timer className="h-4 w-4" />
              {isTimerRunning ? 'Stop timer' : 'Start timer'}
            </button>

            {!isTimerRunning && (
              <>
                <div className="type-caption text-center">Set duration</div>
                {showTimeInput ? (
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      inputMode="numeric"
                      autoFocus
                      value={currentSet.actualTime || ''}
                      onChange={(e) => handleTimeSelect(parseInt(e.target.value) || 0)}
                      onBlur={() => setShowTimeInput(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setShowTimeInput(false)}
                      className="h-9 w-24 rounded-xl border-border bg-muted text-center text-sm"
                      placeholder={baseTime.toString()}
                    />
                    <span className="ml-2 self-center type-meta">sec</span>
                  </div>
                ) : (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x">
                    {timeOptions.map((t) => (
                      <button key={t} onClick={() => handleTimeSelect(t)} className={cn('h-9 min-w-[3rem] shrink-0 snap-center rounded-full px-2.5 type-meta transition-colors', selectedTime === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                        {formatTime(t)}
                      </button>
                    ))}
                    <button onClick={() => setShowTimeInput(true)} className="h-9 shrink-0 rounded-full px-3 type-meta hover:text-foreground">Custom</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {showWeight && !isTimed && (
          <div className="mb-4">
            <div className="mb-2 type-caption text-center">{isWeightedBW ? 'Added weight (+kg)' : `Weight (${weightLabel})`}</div>
            {showWeightInput ? (
              <div className="flex justify-center">
                <Input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={currentSet.actualWeight || ''}
                  onChange={(e) => handleWeightSelect(parseFloat(e.target.value) || 0)}
                  onBlur={() => setShowWeightInput(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setShowWeightInput(false)}
                  className="h-9 w-24 rounded-xl border-border bg-muted text-center text-sm"
                  placeholder={baseWeight.toString()}
                />
              </div>
            ) : (
              <div className="flex w-full min-w-0 gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x">
                {weightOptions.map((w) => (
                  <button key={w} onClick={() => handleWeightSelect(w)} className={cn('h-9 min-w-[3rem] shrink-0 snap-center rounded-full px-2.5 type-meta tabular-nums transition-colors', selectedWeight === w ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                    {isWeightedBW && '+'}{w % 1 === 0 ? w : w.toFixed(1)}
                  </button>
                ))}
                <button onClick={() => setShowWeightInput(true)} className="h-9 shrink-0 rounded-full px-3 type-meta hover:text-foreground">Custom</button>
              </div>
            )}
          </div>
        )}

        {showReps && !isTimed && (
          <div>
            <div className="mb-2 type-caption text-center">Reps</div>
            {showRepsInput ? (
              <div className="flex justify-center">
                <Input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  value={currentSet.actualReps || ''}
                  onChange={(e) => handleRepsSelect(parseInt(e.target.value) || 0)}
                  onBlur={() => setShowRepsInput(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setShowRepsInput(false)}
                  className="h-9 w-20 rounded-xl border-border bg-muted text-center text-sm"
                  placeholder={baseReps.toString()}
                />
              </div>
            ) : (
              <div className="flex w-full min-w-0 gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x">
                {repOptions.map((r) => (
                  <button key={r} onClick={() => handleRepsSelect(r)} className={cn('h-9 w-9 shrink-0 snap-center rounded-full type-meta tabular-nums transition-colors', selectedReps === r ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                    {r}
                  </button>
                ))}
                <button onClick={() => setShowRepsInput(true)} className="h-9 shrink-0 rounded-full px-3 type-meta hover:text-foreground">Custom</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showRestTimer && (
        <RestTimer isOpen={showRestTimer} defaultDuration={restDuration} onDismiss={handleRestDismiss} onComplete={handleRestComplete} />
      )}

      {!showRestTimer && (
        <div className="flex gap-2">
          {(!isFirstSet || !isFirstExercise) && (
            <button onClick={goToPrevSet} aria-label="Previous set or exercise" className="control-large flex w-[52px] shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {!currentSet.completed && (
            <button onClick={skipSet} aria-label="Skip current set" className="control-large flex items-center gap-1.5 rounded-xl px-3 type-action text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <SkipForward className="h-4 w-4" />
              Skip
            </button>
          )}

          {currentSet.completed && isLastSet ? (
            <div className="flex flex-1 gap-2">
              <button onClick={addSet} className="control-large flex items-center gap-1.5 rounded-xl border border-border px-3 type-action text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Plus className="h-4 w-4" />
                Add set
              </button>
              <button
                onClick={() => {
                  haptic('medium');
                  if (isLastExercise) onComplete();
                  else onNextExercise();
                }}
                className="control-large flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 type-action text-background transition-opacity hover:opacity-90"
              >
                <Check className="h-4 w-4" />
                {isLastExercise ? 'Finish workout' : 'Next exercise'}
              </button>
            </div>
          ) : (
            <button
              onClick={completeSet}
              className={cn(
                'control-large flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 type-action transition-colors',
                currentSet.completed ? 'border border-energy-border bg-energy-soft text-energy-ink' : 'bg-foreground text-background hover:opacity-90'
              )}
            >
              <Check className="h-4 w-4" />
              {currentSet.completed ? 'Next set' : getLogLabel()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
