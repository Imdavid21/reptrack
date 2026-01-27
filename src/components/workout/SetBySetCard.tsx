import { Input } from '@/components/ui/input';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, Minus, ArrowLeftRight, ChevronLeft, ChevronRight, Check, Trophy, Info, SkipForward } from 'lucide-react';
import { getExerciseVariants, hasVariants, getEquipmentType, getWeightLabel } from '@/lib/exerciseVariants';
import { haptic } from '@/lib/haptics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PersonalRecord {
  maxWeight: number;
  reps: string;
  date: string;
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
}: SetBySetCardProps) {
  const currentSet = exercise.sets[currentSetIndex];
  const isLastSet = currentSetIndex === exercise.sets.length - 1;
  const isFirstSet = currentSetIndex === 0;

  // Get previous set for auto-copy
  const prevSet = currentSetIndex > 0 ? exercise.sets[currentSetIndex - 1] : null;

  // Normalize weight input
  const normalizeWeight = (value: string): string => {
    return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  };

  const handleSetChange = (field: 'actualWeight' | 'actualReps', value: string) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    const normalizedValue = field === 'actualWeight' ? normalizeWeight(value) : value;
    updated.sets[currentSetIndex] = { ...updated.sets[currentSetIndex], [field]: normalizedValue };
    onChange(updated);
  };

  // Tap-to-fill: Use previous set values or target values
  const handleTapToFill = (field: 'actualWeight' | 'actualReps') => {
    const currentValue = field === 'actualWeight' ? currentSet.actualWeight : currentSet.actualReps;
    
    if (!currentValue) {
      haptic('light');
      // Priority: previous set actual -> previous set target -> current target
      let fillValue = '';
      if (prevSet) {
        fillValue = field === 'actualWeight' 
          ? (prevSet.actualWeight || prevSet.targetWeight)
          : (prevSet.actualReps || prevSet.targetReps);
      } else {
        fillValue = field === 'actualWeight' ? currentSet.targetWeight : currentSet.targetReps;
      }
      if (fillValue) {
        handleSetChange(field, fillValue);
      }
    }
  };

  // ±2.5kg weight adjustment
  const adjustWeight = (delta: number) => {
    haptic('light');
    // Use previous set value as base if current is empty
    let baseWeight = currentSet.actualWeight;
    if (!baseWeight && prevSet) {
      baseWeight = prevSet.actualWeight || prevSet.targetWeight;
    }
    if (!baseWeight) {
      baseWeight = currentSet.targetWeight;
    }
    const currentWeight = parseFloat(baseWeight || '0');
    const newWeight = Math.max(0, currentWeight + delta);
    handleSetChange('actualWeight', newWeight.toString());
  };

  // Complete current set and advance
  const completeSet = () => {
    haptic('success');
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[currentSetIndex] = { 
      ...updated.sets[currentSetIndex], 
      completed: true,
      // Auto-fill with previous set or target if empty
      actualWeight: currentSet.actualWeight || (prevSet?.actualWeight || prevSet?.targetWeight || currentSet.targetWeight),
      actualReps: currentSet.actualReps || (prevSet?.actualReps || prevSet?.targetReps || currentSet.targetReps),
    };
    onChange(updated);

    // Auto-advance to next set or exercise
    if (isLastSet) {
      if (isLastExercise) {
        onComplete();
      } else {
        onNextExercise();
      }
    } else {
      // Move to next set, auto-copy values
      const nextSetIndex = currentSetIndex + 1;
      const nextSet = updated.sets[nextSetIndex];
      
      // Pre-fill next set with current set's values
      updated.sets[nextSetIndex] = {
        ...nextSet,
        actualWeight: nextSet.actualWeight || updated.sets[currentSetIndex].actualWeight,
        actualReps: nextSet.actualReps || updated.sets[currentSetIndex].actualReps,
      };
      onChange(updated);
      onSetIndexChange(nextSetIndex);
    }
  };

  // Skip current set
  const skipSet = () => {
    haptic('light');
    if (isLastSet) {
      if (isLastExercise) {
        onComplete();
      } else {
        onSkipExercise();
      }
    } else {
      onSetIndexChange(currentSetIndex + 1);
    }
  };

  // Go to previous set
  const goToPrevSet = () => {
    haptic('light');
    if (!isFirstSet) {
      onSetIndexChange(currentSetIndex - 1);
    } else if (!isFirstExercise) {
      onPrevExercise();
    }
  };

  // Add extra set
  const addSet = () => {
    haptic('light');
    const updated = { ...exercise };
    const lastSet = updated.sets[updated.sets.length - 1];
    updated.sets = [
      ...updated.sets,
      {
        setNumber: lastSet.setNumber + 1,
        targetWeight: lastSet.actualWeight || lastSet.targetWeight,
        targetReps: lastSet.actualReps || lastSet.targetReps,
        actualWeight: lastSet.actualWeight || '',
        actualReps: lastSet.actualReps || '',
        completed: false,
      },
    ];
    onChange(updated);
    // Jump to new set
    onSetIndexChange(updated.sets.length - 1);
  };

  // Switch exercise variant
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
  const weightLabel = getWeightLabel(equipmentType);

  // Weight convention hint
  const getWeightHint = () => {
    switch (equipmentType) {
      case 'dumbbell': return 'Weight per hand';
      case 'barbell': return 'Total weight (bar + plates)';
      case 'cable': return 'Stack weight';
      case 'machine': return 'Stack/plate weight';
      case 'bodyweight': return 'Added weight only';
      default: return 'Weight used';
    }
  };

  // Check for new PR
  const currentMaxWeight = Math.max(
    ...exercise.sets.filter(s => s.completed && s.actualWeight).map(s => parseFloat(s.actualWeight) || 0),
    0
  );
  const isNewPR = personalRecord && currentMaxWeight > personalRecord.maxWeight;

  // Pre-filled placeholder values (from previous set or target)
  const weightPlaceholder = prevSet?.actualWeight || prevSet?.targetWeight || currentSet.targetWeight;
  const repsPlaceholder = prevSet?.actualReps || prevSet?.targetReps || currentSet.targetReps;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Exercise progress header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          Exercise {exerciseIndex + 1}/{totalExercises}
        </span>
        <div className="flex gap-0.5 flex-1 mx-3">
          {Array.from({ length: totalExercises }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-0.5 flex-1 rounded-full transition-colors',
                i < exerciseIndex ? 'bg-primary' :
                i === exerciseIndex ? 'bg-primary/50' : 'bg-muted'
              )}
            />
          ))}
        </div>
        <span className={cn(
          'text-2xs px-1.5 py-0.5 rounded-full',
          exercise.category === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {exercise.category.toUpperCase()}
        </span>
      </div>

      {/* Exercise name and PR */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold truncate">{exercise.name}</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>{getWeightHint()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {personalRecord && !isNewPR && (
              <>
                <Trophy className="h-3 w-3" />
                <span className="tabular-nums">PR: {personalRecord.maxWeight}kg</span>
              </>
            )}
            {isNewPR && (
              <span className="text-primary font-bold animate-pulse">🏆 NEW PR!</span>
            )}
          </div>
        </div>
        {showVariantSwitch && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              {variants.map((variant) => (
                <DropdownMenuItem
                  key={variant.name}
                  onClick={() => switchVariant(variant.name, variant.defaultWeight)}
                  className={cn('cursor-pointer', variant.name === exercise.name && 'bg-primary/10')}
                >
                  {variant.name}
                  {variant.name === exercise.name && <Check className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Set indicator pills */}
      <div className="flex gap-1.5 justify-center">
        {exercise.sets.map((set, idx) => (
          <button
            key={idx}
            onClick={() => onSetIndexChange(idx)}
            className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
              idx === currentSetIndex 
                ? 'bg-primary text-primary-foreground scale-110' 
                : set.completed 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {set.completed ? <Check className="h-3.5 w-3.5" /> : idx + 1}
          </button>
        ))}
        <button
          onClick={addSet}
          className="h-8 w-8 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Current set input - BIG and focused */}
      <div className={cn(
        'p-4 rounded-xl border-2 transition-colors',
        currentSet.completed ? 'bg-primary/5 border-primary/30' : 'border-border'
      )}>
        <div className="text-center mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            SET {currentSetIndex + 1} of {exercise.sets.length}
          </span>
          {prevSet && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Previous: {prevSet.actualWeight || prevSet.targetWeight}kg × {prevSet.actualReps || prevSet.targetReps}
            </p>
          )}
        </div>

        {/* Weight input */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block text-center">WEIGHT</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustWeight(-2.5)}
              className="h-12 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              -2.5
            </button>
            <div className="relative flex-1">
              <Input
                placeholder={normalizeWeight(weightPlaceholder)}
                value={currentSet.actualWeight}
                onChange={(e) => handleSetChange('actualWeight', e.target.value)}
                onFocus={() => handleTapToFill('actualWeight')}
                inputMode="decimal"
                className="h-12 text-xl font-bold text-center pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{weightLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => adjustWeight(2.5)}
              className="h-12 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              +2.5
            </button>
          </div>
        </div>

        {/* Reps input */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block text-center">REPS</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const current = parseInt(currentSet.actualReps || repsPlaceholder || '0');
                if (current > 0) handleSetChange('actualReps', (current - 1).toString());
              }}
              className="h-12 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              -1
            </button>
            <div className="relative flex-1">
              <Input
                placeholder={repsPlaceholder}
                value={currentSet.actualReps}
                onChange={(e) => handleSetChange('actualReps', e.target.value)}
                onFocus={() => handleTapToFill('actualReps')}
                inputMode="numeric"
                className="h-12 text-xl font-bold text-center pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">reps</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const current = parseInt(currentSet.actualReps || repsPlaceholder || '0');
                handleSetChange('actualReps', (current + 1).toString());
              }}
              className="h-12 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {(!isFirstSet || !isFirstExercise) && (
          <button
            onClick={goToPrevSet}
            className="h-11 px-4 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {!currentSet.completed && (
          <button
            onClick={skipSet}
            className="h-11 px-3 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
        )}

        <button
          onClick={completeSet}
          className={cn(
            "flex-1 h-11 rounded-full text-sm font-bold transition-colors flex items-center justify-center gap-2",
            currentSet.completed 
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {currentSet.completed ? (
            <>
              <Check className="h-4 w-4" />
              {isLastSet && isLastExercise ? 'Finish Workout' : isLastSet ? 'Next Exercise' : 'Next Set'}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Log Set
            </>
          )}
        </button>
      </div>

      {/* Progress summary */}
      <div className="text-center text-xs text-muted-foreground">
        {completedSets}/{exercise.sets.length} sets completed
      </div>
    </div>
  );
}
