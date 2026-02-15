import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, ArrowLeftRight, ChevronLeft, Check, SkipForward, Timer, Minus, Info } from 'lucide-react';
import { getExerciseVariants, hasVariants, getEquipmentType, getWeightLabel } from '@/lib/exerciseVariants';
import { Input } from '@/components/ui/input';
import { haptic } from '@/lib/haptics';
import { RestTimer } from './RestTimer';
import { estimate1RM, formatPlates } from '@/lib/calculators';
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
  currentSetIndex: number;
  onChange: (exercise: WorkoutExercise) => void;
  onSetIndexChange: (index: number) => void;
  onNextExercise: () => void;
  onPrevExercise: () => void;
  onSkipExercise: () => void;
  onComplete: () => void;
  isFirstExercise: boolean;
  isLastExercise: boolean;
  personalRecord?: PersonalRecord;
  lastUsed?: LastUsedData;
}

// Format seconds as Mm Ss
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
  currentSetIndex,
  onChange,
  onSetIndexChange,
  onNextExercise,
  onPrevExercise,
  onSkipExercise,
  onComplete,
  isFirstExercise,
  isLastExercise,
  personalRecord,
  lastUsed,
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

  // Timer state for timed exercises
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exType = exercise.exerciseType || 'weighted';
  const isTimed = exType === 'timed';
  const isBodyweight = exType === 'bodyweight';
  const isWeightedBW = exType === 'weighted_bw';
  const showWeight = exType === 'weighted' || exType === 'weighted_bw';
  const showReps = exType === 'weighted' || exType === 'bodyweight' || exType === 'weighted_bw';

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset timer when switching sets/exercises
  useEffect(() => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setShowRestTimer(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [currentSetIndex, exerciseIndex]);

  // Priority for base values: prev completed set -> per-set last used -> aggregate last used -> current target
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
    // Parse from targetReps for backwards compat (e.g. "45" meaning 45 seconds)
    const parsed = parseInt(currentSet.targetReps);
    return !isNaN(parsed) ? parsed : 30;
  };

  const baseWeight = getBaseWeight();
  const baseReps = getBaseReps();
  const baseTime = getBaseTime();

  // Generate weight options: wide scrollable range
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

  // Generate rep options: wider scrollable range
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

  // Generate time options for timed exercises (in seconds)
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
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[currentSetIndex] = {
      ...updated.sets[currentSetIndex],
      actualWeight: weight.toString()
    };
    onChange(updated);
  };

  const handleRepsSelect = (reps: number) => {
    haptic('light');
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[currentSetIndex] = {
      ...updated.sets[currentSetIndex],
      actualReps: reps.toString()
    };
    onChange(updated);
  };

  const handleTimeSelect = (seconds: number) => {
    haptic('light');
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[currentSetIndex] = {
      ...updated.sets[currentSetIndex],
      actualTime: seconds,
    };
    onChange(updated);
  };

  const toggleTimer = () => {
    if (isTimerRunning) {
      // Stop — save the elapsed time
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTimerRunning(false);
      handleTimeSelect(timerSeconds);
    } else {
      // Start counting up
      setTimerSeconds(0);
      setIsTimerRunning(true);
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  // Determine smart rest duration based on exercise category
  const getDefaultRest = (): number => {
    if (exercise.category === 'primary') return 120; // 2min for compounds
    if (isTimed) return 60;
    return 90; // 1.5min for accessories
  };

  const completeSet = () => {
    haptic('success');
    const updated = { ...exercise };
    updated.sets = [...updated.sets];

    if (isTimed) {
      const finalTime = currentSet.actualTime || (isTimerRunning ? timerSeconds : baseTime);
      // Stop timer if running
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

    if (isLastSet) {
      // Don't auto-advance — stay on this exercise so user can add sets or move on
      // The "Next Exercise" / "Finish" button below handles navigation
      return;
    }

    // Pre-fill next set with current values
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

    // Show rest timer between sets
    setRestDuration(getDefaultRest());
    setShowRestTimer(true);
  };

  const handleRestDismiss = useCallback(() => {
    setShowRestTimer(false);
    // Advance to next set
    if (!isLastSet) {
      onSetIndexChange(currentSetIndex + 1);
    }
  }, [isLastSet, currentSetIndex, onSetIndexChange]);

  const handleRestComplete = useCallback(() => {
    setShowRestTimer(false);
    // Advance to next set
    if (!isLastSet) {
      onSetIndexChange(currentSetIndex + 1);
    }
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
    // Find the last completed set for smart pre-fill, fall back to last set's targets
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
    if (defaultWeight) {
      updated.sets = updated.sets.map(set => ({
        ...set,
        targetWeight: defaultWeight,
      }));
    }
    onChange(updated);
  };

  const completedSets = exercise.sets.filter(s => s.completed).length;
  const variants = getExerciseVariants(exercise.name);
  const showVariantSwitch = hasVariants(exercise.name);
  const equipmentType = getEquipmentType(exercise.name);
  const weightLabel = isWeightedBW ? '+kg' : getWeightLabel(equipmentType);

  // PR comparison depends on exercise type
  const currentMaxValue = isTimed
    ? Math.max(...exercise.sets.filter(s => s.completed && s.actualTime).map(s => s.actualTime || 0), 0)
    : isBodyweight
    ? Math.max(...exercise.sets.filter(s => s.completed && s.actualReps).map(s => parseInt(s.actualReps) || 0), 0)
    : Math.max(...exercise.sets.filter(s => s.completed && s.actualWeight).map(s => parseFloat(s.actualWeight) || 0), 0);
  const isNewPR = personalRecord && currentMaxValue > personalRecord.maxWeight;

  const selectedWeight = parseFloat(currentSet.actualWeight) || baseWeight;
  const selectedReps = parseInt(currentSet.actualReps) || baseReps;
  const selectedTime = currentSet.actualTime || baseTime;

  // Build the log button label based on exercise type
  const getLogLabel = () => {
    if (isTimed) {
      if (isTimerRunning) return `Stop & Log ${formatTime(timerSeconds)}`;
      return `Log ${formatTime(selectedTime)}`;
    }
    if (isBodyweight) return `Log ${selectedReps} reps`;
    if (isWeightedBW) return `Log +${selectedWeight}kg × ${selectedReps}`;
    return `Log ${selectedWeight}${weightLabel} × ${selectedReps}`;
  };

  // Build prev set hint — only show if previous set was actually completed with real data
  const getPrevHint = () => {
    if (!prevSet?.completed) return null;
    if (isTimed) {
      if (prevSet.actualTime) return `prev: ${formatTime(prevSet.actualTime)}`;
      return null;
    }
    if (isBodyweight) {
      if (prevSet.actualReps) return `prev: ${prevSet.actualReps} reps`;
      return null;
    }
    // Only show if we have actual logged values — never mix with template targets
    const w = prevSet.actualWeight;
    const r = prevSet.actualReps;
    if (w && r) {
      const prefix = isWeightedBW ? '+' : '';
      return `prev: ${prefix}${String(w).replace(/[a-zA-Z]/g, '')}${isWeightedBW ? 'kg' : weightLabel}×${r}`;
    }
    return null;
  };

  const getLastUsedHint = () => {
    // Use per-set data if available, otherwise fall back to aggregate
    const setData = lastUsedForSet || (lastUsed ? { weight: lastUsed.weight, reps: lastUsed.reps } : null);
    if (!setData) return null;
    if (isTimed) return null;
    if (isBodyweight) return `last: ${setData.reps} reps`;
    const prefix = isWeightedBW ? '+' : '';
    return `last: ${prefix}${setData.weight}${isWeightedBW ? 'kg' : weightLabel}×${setData.reps}`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Exercise progress */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {exerciseIndex + 1}/{totalExercises}
        </span>
        <div className="flex gap-0.5 flex-1">
          {Array.from({ length: totalExercises }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-0.5 flex-1 rounded-full transition-all duration-300',
                i < exerciseIndex ? 'bg-primary' :
                i === exerciseIndex ? 'bg-primary/50' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Exercise name with PR / type badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-base font-bold">{exercise.name}</h2>
            {isTimed && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">TIMED</span>
            )}
            {isBodyweight && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">BW</span>
            )}
            {isWeightedBW && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">BW+</span>
            )}
            {personalRecord && !isNewPR && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                PR {personalRecord.prType === 'duration'
                  ? formatTime(personalRecord.maxWeight)
                  : personalRecord.prType === 'reps'
                  ? `${personalRecord.maxWeight} reps`
                  : `${personalRecord.maxWeight}${weightLabel}`}
              </span>
            )}
            {isNewPR && (
              <span className="text-[10px] text-primary font-bold">NEW PR!</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {completedSets}/{exercise.sets.length} sets
          </span>
        </div>
        {showVariantSwitch && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeftRight className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border z-50">
              {variants.map((variant) => (
                <DropdownMenuItem
                  key={variant.name}
                  onClick={() => switchVariant(variant.name, variant.defaultWeight)}
                  className={cn('cursor-pointer text-xs', variant.name === exercise.name && 'bg-primary/10')}
                >
                  {variant.name}
                  {variant.name === exercise.name && <Check className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Set pills */}
      <div className="flex gap-1.5 justify-center">
        {exercise.sets.map((set, idx) => (
          <button
            key={idx}
            onClick={() => onSetIndexChange(idx)}
            className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200',
              idx === currentSetIndex
                ? 'bg-primary text-primary-foreground scale-110 shadow-sm'
                : set.completed
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {set.completed ? <Check className="h-3 w-3" /> : idx + 1}
          </button>
        ))}
        <button
          onClick={addSet}
          className="h-7 w-7 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Current set card */}
      <div className={cn(
        'p-4 rounded-xl border transition-all duration-300',
        currentSet.completed ? 'bg-primary/5 border-primary/30' : 'border-border'
      )}>
        <div className="text-center text-xs text-muted-foreground mb-4">
          SET {currentSetIndex + 1}
          {getPrevHint() && (
            <span className="ml-1">({getPrevHint()})</span>
          )}
          {getLastUsedHint() && (
            <span className="ml-1 text-primary/70">({getLastUsedHint()})</span>
          )}
        </div>

        {/* ===== TIMED EXERCISE UI ===== */}
        {isTimed && (
          <div className="space-y-4">
            {/* Timer display */}
            <div className="text-center">
              {isTimerRunning ? (
                <div className="text-4xl font-bold tabular-nums text-primary animate-pulse">
                  {formatTime(timerSeconds)}
                </div>
              ) : (
                <div className="text-4xl font-bold tabular-nums">
                  {formatTime(selectedTime)}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-1">
                {isTimerRunning ? 'TIMING...' : `TARGET: ${formatTime(baseTime)}`}
              </div>
            </div>

            {/* Start/stop timer button */}
            <button
              onClick={toggleTimer}
              className={cn(
                'w-full h-10 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2',
                isTimerRunning
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <Timer className="h-3.5 w-3.5" />
              {isTimerRunning ? 'STOP TIMER' : 'START TIMER'}
            </button>

            {/* Quick time selection (when timer not running) */}
            {!isTimerRunning && (
              <>
                <div className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">
                  Or set duration
                </div>
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
                      className="w-24 h-9 text-center text-xs rounded-full border-border bg-muted"
                      placeholder={baseTime.toString()}
                    />
                    <span className="text-xs text-muted-foreground ml-2 self-center">sec</span>
                  </div>
                ) : (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x justify-center">
                    {timeOptions.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleTimeSelect(t)}
                        className={cn(
                          'h-9 min-w-[3rem] px-2.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 snap-center',
                          selectedTime === t
                            ? 'bg-primary text-primary-foreground scale-105 shadow-sm'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {formatTime(t)}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowTimeInput(true)}
                      className="h-9 px-2 rounded-full text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                    >
                      ···
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== WEIGHT SELECTION (weighted + weighted_bw only) ===== */}
        {showWeight && !isTimed && (
          <div className="mb-4">
            <div className="text-[10px] text-muted-foreground text-center mb-2 uppercase tracking-wider">
              {isWeightedBW ? 'Added Weight (+kg)' : `Weight (${weightLabel})`}
            </div>
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
                  className="w-24 h-9 text-center text-xs rounded-full border-border bg-muted"
                  placeholder={baseWeight.toString()}
                />
              </div>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x">
                {weightOptions.map((w) => (
                  <button
                    key={w}
                    onClick={() => handleWeightSelect(w)}
                    className={cn(
                      'h-9 min-w-[3rem] px-2.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 snap-center',
                      selectedWeight === w
                        ? 'bg-primary text-primary-foreground scale-105 shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {isWeightedBW && '+'}
                    {w % 1 === 0 ? w : w.toFixed(1)}
                  </button>
                ))}
                <button
                  onClick={() => setShowWeightInput(true)}
                  className="h-9 px-2 rounded-full text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                >
                  ···
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== REPS SELECTION (weighted + bodyweight + weighted_bw) ===== */}
        {showReps && !isTimed && (
          <div>
            <div className="text-[10px] text-muted-foreground text-center mb-2 uppercase tracking-wider">
              Reps
            </div>
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
                  className="w-20 h-9 text-center text-xs rounded-full border-border bg-muted"
                  placeholder={baseReps.toString()}
                />
              </div>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x justify-center">
                {repOptions.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRepsSelect(r)}
                    className={cn(
                      'h-9 w-9 rounded-full text-xs font-medium transition-all duration-200 shrink-0 snap-center',
                      selectedReps === r
                        ? 'bg-primary text-primary-foreground scale-105 shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {r}
                  </button>
                ))}
                <button
                  onClick={() => setShowRepsInput(true)}
                  className="h-9 px-2 rounded-full text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                >
                  ···
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1RM estimate & plate breakdown for weighted exercises */}
        {showWeight && !isTimed && selectedWeight > 0 && selectedReps > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>
              Est. 1RM: <span className="font-medium text-foreground/70">{estimate1RM(selectedWeight, selectedReps)}kg</span>
            </span>
            {equipmentType === 'barbell' && selectedWeight >= 20 && (
              <span>
                {formatPlates(selectedWeight)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Rest Timer — shown between sets */}
      {showRestTimer && (
        <RestTimer
          isOpen={showRestTimer}
          defaultDuration={restDuration}
          onDismiss={handleRestDismiss}
          onComplete={handleRestComplete}
        />
      )}

      {/* Actions */}
      {!showRestTimer && (
        <div className="flex gap-2">
          {(!isFirstSet || !isFirstExercise) && (
            <button
              onClick={goToPrevSet}
              className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {!currentSet.completed && (
            <button
              onClick={skipSet}
              className="h-10 px-3 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <SkipForward className="h-3 w-3" />
            </button>
          )}

          {/* Main action button */}
          {currentSet.completed && isLastSet ? (
            // Last set completed — show explicit navigation buttons instead of auto-advance
            <div className="flex gap-2 flex-1">
              <button
                onClick={addSet}
                className="h-10 px-3 rounded-full border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3 w-3" />
                Add Set
              </button>
              <button
                onClick={() => {
                  haptic('medium');
                  if (isLastExercise) onComplete();
                  else onNextExercise();
                }}
                className="flex-1 h-10 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {isLastExercise ? 'Review & Finish' : 'Next Exercise'}
              </button>
            </div>
          ) : (
            <button
              onClick={completeSet}
              className={cn(
                "flex-1 h-10 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5",
                currentSet.completed
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              {currentSet.completed ? 'Next Set' : getLogLabel()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
