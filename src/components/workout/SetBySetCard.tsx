import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, ArrowLeftRight, ChevronLeft, Check, Info, SkipForward } from 'lucide-react';
import { getExerciseVariants, hasVariants, getEquipmentType, getWeightLabel } from '@/lib/exerciseVariants';
import { haptic } from '@/lib/haptics';
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
  const prevSet = currentSetIndex > 0 ? exercise.sets[currentSetIndex - 1] : null;

  // Get base values for generating options
  const baseWeight = parseFloat(
    currentSet.actualWeight || prevSet?.actualWeight || prevSet?.targetWeight || currentSet.targetWeight || '0'
  );
  const baseReps = parseInt(
    currentSet.actualReps || prevSet?.actualReps || prevSet?.targetReps || currentSet.targetReps || '8'
  );

  // Generate weight options: base ±5, ±2.5
  const weightOptions = [
    baseWeight - 5,
    baseWeight - 2.5,
    baseWeight,
    baseWeight + 2.5,
    baseWeight + 5,
  ].filter(w => w > 0);

  // Generate rep options around base
  const repOptions = [
    baseReps - 2,
    baseReps - 1,
    baseReps,
    baseReps + 1,
    baseReps + 2,
  ].filter(r => r > 0);

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

  // Complete current set and advance
  const completeSet = () => {
    // Ensure we have values
    const finalWeight = currentSet.actualWeight || baseWeight.toString();
    const finalReps = currentSet.actualReps || baseReps.toString();

    haptic('success');
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[currentSetIndex] = { 
      ...updated.sets[currentSetIndex], 
      completed: true,
      actualWeight: finalWeight,
      actualReps: finalReps,
    };
    onChange(updated);

    // Auto-advance
    if (isLastSet) {
      if (isLastExercise) {
        onComplete();
      } else {
        onNextExercise();
      }
    } else {
      const nextSetIndex = currentSetIndex + 1;
      // Pre-fill next set
      updated.sets[nextSetIndex] = {
        ...updated.sets[nextSetIndex],
        actualWeight: updated.sets[nextSetIndex].actualWeight || finalWeight,
        actualReps: updated.sets[nextSetIndex].actualReps || finalReps,
      };
      onChange(updated);
      onSetIndexChange(nextSetIndex);
    }
  };

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
  const weightLabel = getWeightLabel(equipmentType);

  // Check for new PR
  const currentMaxWeight = Math.max(
    ...exercise.sets.filter(s => s.completed && s.actualWeight).map(s => parseFloat(s.actualWeight) || 0),
    0
  );
  const isNewPR = personalRecord && currentMaxWeight > personalRecord.maxWeight;

  const selectedWeight = parseFloat(currentSet.actualWeight) || baseWeight;
  const selectedReps = parseInt(currentSet.actualReps) || baseReps;

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
                'h-0.5 flex-1 rounded-full',
                i < exerciseIndex ? 'bg-primary' :
                i === exerciseIndex ? 'bg-primary/50' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Exercise name with PR inline */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold truncate">{exercise.name}</h2>
            {personalRecord && !isNewPR && (
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                PR {personalRecord.maxWeight}{weightLabel}
              </span>
            )}
            {isNewPR && (
              <span className="text-xs text-primary font-medium shrink-0">NEW PR</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {completedSets}/{exercise.sets.length} sets • {exercise.category}
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

      {/* Set indicator pills */}
      <div className="flex gap-1.5 justify-center">
        {exercise.sets.map((set, idx) => (
          <button
            key={idx}
            onClick={() => onSetIndexChange(idx)}
            className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all',
              idx === currentSetIndex 
                ? 'bg-primary text-primary-foreground scale-110' 
                : set.completed 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
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

      {/* Current set - tap to select */}
      <div className={cn(
        'p-4 rounded-xl border transition-colors',
        currentSet.completed ? 'bg-primary/5 border-primary/30' : 'border-border'
      )}>
        <div className="text-center text-xs text-muted-foreground mb-3">
          SET {currentSetIndex + 1}
          {prevSet && (
            <span className="ml-2">
              (prev: {prevSet.actualWeight || prevSet.targetWeight}{weightLabel} × {prevSet.actualReps || prevSet.targetReps})
            </span>
          )}
        </div>

        {/* Weight selection */}
        <div className="mb-4">
          <div className="text-[10px] text-muted-foreground text-center mb-2">WEIGHT ({weightLabel})</div>
          <div className="flex gap-1.5 justify-center flex-wrap">
            {weightOptions.map((w) => (
              <button
                key={w}
                onClick={() => handleWeightSelect(w)}
                className={cn(
                  'h-10 min-w-[3.5rem] px-3 rounded-full text-sm font-medium transition-colors',
                  selectedWeight === w
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Reps selection */}
        <div>
          <div className="text-[10px] text-muted-foreground text-center mb-2">REPS</div>
          <div className="flex gap-1.5 justify-center">
            {repOptions.map((r) => (
              <button
                key={r}
                onClick={() => handleRepsSelect(r)}
                className={cn(
                  'h-10 w-10 rounded-full text-sm font-medium transition-colors',
                  selectedReps === r
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {(!isFirstSet || !isFirstExercise) && (
          <button
            onClick={goToPrevSet}
            className="h-10 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
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

        <button
          onClick={completeSet}
          className={cn(
            "flex-1 h-10 rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
            currentSet.completed 
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-primary text-primary-foreground"
          )}
        >
          <Check className="h-3.5 w-3.5" />
          {currentSet.completed 
            ? (isLastSet && isLastExercise ? 'Finish' : isLastSet ? 'Next Exercise' : 'Next Set')
            : 'Log Set'
          }
        </button>
      </div>
    </div>
  );
}
