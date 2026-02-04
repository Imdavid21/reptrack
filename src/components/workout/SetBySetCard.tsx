import { useState } from 'react';
import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, ArrowLeftRight, ChevronLeft, Check, SkipForward } from 'lucide-react';
import { getExerciseVariants, hasVariants, getEquipmentType, getWeightLabel } from '@/lib/exerciseVariants';
import { Input } from '@/components/ui/input';
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

interface LastUsedData {
  weight: number;
  reps: number;
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

  // Priority for base values: prev set actual -> last used from DB -> target
  const getBaseWeight = (): number => {
    if (currentSet.actualWeight) return parseFloat(currentSet.actualWeight);
    if (prevSet?.actualWeight) return parseFloat(prevSet.actualWeight);
    if (lastUsed?.weight) return lastUsed.weight;
    if (prevSet?.targetWeight) return parseFloat(prevSet.targetWeight) || 0;
    return parseFloat(currentSet.targetWeight) || 0;
  };

  const getBaseReps = (): number => {
    if (currentSet.actualReps) return parseInt(currentSet.actualReps);
    if (prevSet?.actualReps) return parseInt(prevSet.actualReps);
    if (lastUsed?.reps) return lastUsed.reps;
    if (prevSet?.targetReps) return parseInt(prevSet.targetReps) || 8;
    return parseInt(currentSet.targetReps) || 8;
  };

  const baseWeight = getBaseWeight();
  const baseReps = getBaseReps();

  // Generate weight options: wider range with smart increments
  const generateWeightOptions = (): number[] => {
    const options = new Set<number>();
    // Core options around base
    [-10, -5, -2.5, 0, 2.5, 5, 10].forEach(delta => {
      const w = baseWeight + delta;
      if (w > 0) options.add(w);
    });
    return Array.from(options).sort((a, b) => a - b);
  };

  // Generate rep options
  const generateRepOptions = (): number[] => {
    const options = new Set<number>();
    [-3, -2, -1, 0, 1, 2, 3].forEach(delta => {
      const r = baseReps + delta;
      if (r > 0 && r <= 30) options.add(r);
    });
    return Array.from(options).sort((a, b) => a - b);
  };

  const weightOptions = generateWeightOptions();
  const repOptions = generateRepOptions();

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

  const completeSet = () => {
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

    if (isLastSet) {
      if (isLastExercise) onComplete();
      else onNextExercise();
    } else {
      const nextSetIndex = currentSetIndex + 1;
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
                'h-0.5 flex-1 rounded-full transition-all duration-300',
                i < exerciseIndex ? 'bg-primary' :
                i === exerciseIndex ? 'bg-primary/50' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Exercise name with PR (weight × reps) */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-base font-bold">{exercise.name}</h2>
            {personalRecord && !isNewPR && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                PR {personalRecord.maxWeight}{weightLabel}
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
          {lastUsed && !prevSet && (
            <span className="ml-1 text-primary/70">
              (last: {lastUsed.weight}{weightLabel}×{lastUsed.reps})
            </span>
          )}
          {prevSet && (
            <span className="ml-1">
              (prev: {prevSet.actualWeight || prevSet.targetWeight}{weightLabel}×{prevSet.actualReps || prevSet.targetReps})
            </span>
          )}
        </div>

        {/* Weight selection with manual input option */}
        <div className="mb-4">
          <div className="text-[10px] text-muted-foreground text-center mb-2 uppercase tracking-wider">
            Weight ({weightLabel})
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
            <div className="flex gap-1 justify-center flex-wrap">
              {weightOptions.map((w) => (
                <button
                  key={w}
                  onClick={() => handleWeightSelect(w)}
                  className={cn(
                    'h-9 min-w-[3rem] px-2.5 rounded-full text-xs font-medium transition-all duration-200',
                    selectedWeight === w
                      ? 'bg-primary text-primary-foreground scale-105 shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-102'
                  )}
                >
                  {w % 1 === 0 ? w : w.toFixed(1)}
                </button>
              ))}
              <button
                onClick={() => setShowWeightInput(true)}
                className="h-9 px-2 rounded-full text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                ···
              </button>
            </div>
          )}
        </div>

        {/* Reps selection with manual input option */}
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
            <div className="flex gap-1 justify-center flex-wrap">
              {repOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRepsSelect(r)}
                  className={cn(
                    'h-9 w-9 rounded-full text-xs font-medium transition-all duration-200',
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
                className="h-9 px-2 rounded-full text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                ···
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
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
          {currentSet.completed 
            ? (isLastSet && isLastExercise ? 'Finish' : isLastSet ? 'Next Exercise' : 'Next Set')
            : `Log ${selectedWeight}${weightLabel} × ${selectedReps}`
          }
        </button>
      </div>
    </div>
  );
}
