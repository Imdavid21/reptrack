import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, Minus, ArrowLeftRight, ChevronLeft, ChevronRight, Check, Trophy, Copy, Info } from 'lucide-react';
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

interface SingleExerciseCardProps {
  exercise: WorkoutExercise;
  exerciseIndex: number;
  totalExercises: number;
  onChange: (exercise: WorkoutExercise) => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirst: boolean;
  isLast: boolean;
  personalRecord?: PersonalRecord;
}

export function SingleExerciseCard({
  exercise,
  exerciseIndex,
  totalExercises,
  onChange,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  isFirst,
  isLast,
  personalRecord,
}: SingleExerciseCardProps) {
  const handleSetToggle = (setIndex: number) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    const set = { ...updated.sets[setIndex] };
    set.completed = !set.completed;
    
    haptic('light');
    
    if (!set.completed) {
      set.actualWeight = '';
      set.actualReps = '';
    }
    updated.sets[setIndex] = set;
    onChange(updated);
  };

  // Normalize weight input: strip "kg" suffix, keep only numbers/decimals
  const normalizeWeight = (value: string): string => {
    return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  };

  const handleSetChange = (
    setIndex: number,
    field: 'actualWeight' | 'actualReps',
    value: string
  ) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    // Normalize weight values to numbers only
    const normalizedValue = field === 'actualWeight' ? normalizeWeight(value) : value;
    updated.sets[setIndex] = { ...updated.sets[setIndex], [field]: normalizedValue };
    onChange(updated);
  };

  // Tap-to-fill: Fill with target value when tapping empty input
  const handleTapToFill = (setIndex: number, field: 'actualWeight' | 'actualReps') => {
    const set = exercise.sets[setIndex];
    const currentValue = field === 'actualWeight' ? set.actualWeight : set.actualReps;
    const targetValue = field === 'actualWeight' ? set.targetWeight : set.targetReps;
    
    // Only fill if currently empty and target exists
    if (!currentValue && targetValue) {
      haptic('light');
      handleSetChange(setIndex, field, targetValue);
    }
  };

  // ±2.5kg weight adjustment
  const adjustWeight = (setIndex: number, delta: number) => {
    haptic('light');
    const set = exercise.sets[setIndex];
    const currentWeight = parseFloat(set.actualWeight || set.targetWeight || '0');
    const newWeight = Math.max(0, currentWeight + delta);
    handleSetChange(setIndex, 'actualWeight', newWeight.toString());
  };

  // Copy from previous set
  const copyFromPreviousSet = (setIndex: number) => {
    if (setIndex === 0) return;
    haptic('light');
    const prevSet = exercise.sets[setIndex - 1];
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[setIndex] = {
      ...updated.sets[setIndex],
      actualWeight: prevSet.actualWeight || prevSet.targetWeight,
      actualReps: prevSet.actualReps || prevSet.targetReps,
    };
    onChange(updated);
  };

  const addSet = () => {
    haptic('light');
    const updated = { ...exercise };
    const lastSet = updated.sets[updated.sets.length - 1];
    updated.sets = [
      ...updated.sets,
      {
        setNumber: lastSet.setNumber + 1,
        targetWeight: lastSet.targetWeight,
        targetReps: lastSet.targetReps,
        actualWeight: '',
        actualReps: '',
        completed: false,
      },
    ];
    onChange(updated);
  };

  const removeSet = (setIndex: number) => {
    if (exercise.sets.length <= 1) return;
    haptic('light');
    const updated = { ...exercise };
    updated.sets = updated.sets.filter((_, idx) => idx !== setIndex);
    updated.sets.forEach((set, idx) => {
      set.setNumber = idx + 1;
    });
    onChange(updated);
  };

  const switchVariant = (variantName: string, defaultWeight: string) => {
    haptic('medium');
    const updated = { ...exercise };
    updated.name = variantName;
    // Update target weights if we have a default
    if (defaultWeight) {
      updated.sets = updated.sets.map(set => ({
        ...set,
        targetWeight: defaultWeight,
      }));
    }
    onChange(updated);
  };

  const completedSets = exercise.sets.filter(s => s.completed).length;
  const allCompleted = completedSets === exercise.sets.length;
  const variants = getExerciseVariants(exercise.name);
  const showVariantSwitch = hasVariants(exercise.name);
  const equipmentType = getEquipmentType(exercise.name);
  const weightLabel = getWeightLabel(equipmentType);

  // Get weight convention explanation
  const getWeightHint = () => {
    switch (equipmentType) {
      case 'dumbbell': return 'Log weight per hand';
      case 'barbell': return 'Log total weight (bar + plates)';
      case 'cable': return 'Log stack weight';
      case 'machine': return 'Log stack/plate weight';
      case 'bodyweight': return 'Log added weight only';
      default: return 'Log weight used';
    }
  };

  // Check if current weight beats PR
  const currentMaxWeight = Math.max(
    ...exercise.sets
      .filter(s => s.completed && s.actualWeight)
      .map(s => parseFloat(s.actualWeight) || 0),
    0
  );
  const isNewPR = personalRecord && currentMaxWeight > personalRecord.maxWeight;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Compact progress header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {exerciseIndex + 1}/{totalExercises}
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

      {/* Compact exercise header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold truncate">{exercise.name}</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  <p className="font-medium">{getWeightHint()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">{completedSets}/{exercise.sets.length}</span>
            <span>sets</span>
            {personalRecord && !isNewPR && (
              <>
                <span>•</span>
                <Trophy className="h-3 w-3" />
                <span className="tabular-nums">{personalRecord.maxWeight}kg</span>
              </>
            )}
            {isNewPR && (
              <>
                <span>•</span>
                <span className="text-primary font-medium">NEW PR</span>
              </>
            )}
          </div>
        </div>
        {showVariantSwitch && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center h-7 w-7 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                <ArrowLeftRight className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              {variants.map((variant) => (
                <DropdownMenuItem
                  key={variant.name}
                  onClick={() => switchVariant(variant.name, variant.defaultWeight)}
                  className={cn(
                    'cursor-pointer text-xs',
                    variant.name === exercise.name && 'bg-primary/10'
                  )}
                >
                  {variant.name}
                  {variant.name === exercise.name && (
                    <Check className="h-3 w-3 ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Ultra-Compact Sets */}
      <div className="space-y-1">
        {exercise.sets.map((set, setIndex) => {
          const hasPreviousSet = setIndex > 0;
          const prevSet = hasPreviousSet ? exercise.sets[setIndex - 1] : null;
          const canCopyFromPrev = hasPreviousSet && (prevSet?.actualWeight || prevSet?.actualReps);
          
          return (
            <div
              key={set.setNumber}
              className={cn(
                'p-1.5 rounded-lg border transition-colors',
                set.completed ? 'bg-primary/5 border-primary/20' : 'border-border'
              )}
            >
              <div className="flex items-center gap-1.5">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => handleSetToggle(setIndex)}
                  className={cn(
                    "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                    set.completed 
                      ? "bg-primary border-primary" 
                      : "border-muted-foreground"
                  )}
                >
                  <Check className={cn(
                    "h-2.5 w-2.5 text-primary-foreground transition-opacity",
                    set.completed ? "opacity-100" : "opacity-0"
                  )} />
                </button>
                
                {/* Set number */}
                <span className="text-[10px] font-medium w-3 text-muted-foreground tabular-nums">{set.setNumber}</span>
                
                {/* Weight: -2.5, input, +2.5 */}
                <button
                  type="button"
                  onClick={() => adjustWeight(setIndex, -2.5)}
                  className="h-6 px-1.5 rounded border border-border text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  -2.5
                </button>
                <div className="relative flex-1 min-w-0">
                  <Input
                    placeholder={normalizeWeight(set.targetWeight)}
                    value={set.actualWeight}
                    onChange={(e) => handleSetChange(setIndex, 'actualWeight', e.target.value)}
                    onFocus={() => handleTapToFill(setIndex, 'actualWeight')}
                    inputMode="decimal"
                    className="h-6 text-[11px] rounded text-center px-1 pr-6"
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground pointer-events-none">{weightLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustWeight(setIndex, 2.5)}
                  className="h-6 px-1.5 rounded border border-border text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  +2.5
                </button>

                {/* Reps */}
                <div className="relative w-12 shrink-0">
                  <Input
                    placeholder={set.targetReps}
                    value={set.actualReps}
                    onChange={(e) => handleSetChange(setIndex, 'actualReps', e.target.value)}
                    onFocus={() => handleTapToFill(setIndex, 'actualReps')}
                    inputMode="numeric"
                    className="h-6 text-[11px] rounded text-center px-1 pr-4"
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground pointer-events-none">×</span>
                </div>

                {/* Remove set */}
                {exercise.sets.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeSet(setIndex)}
                    className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                ) : (
                  <div className="w-5 shrink-0" />
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addSet}
          className="w-full h-7 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="h-2.5 w-2.5" />
          Add set
        </button>
      </div>

      {/* Compact Navigation */}
      <div className="flex gap-2 pt-2">
        {!isFirst && (
          <button
            onClick={() => { haptic('light'); onPrev(); }}
            className="h-9 px-3 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
        )}
        
        {completedSets === 0 && (
          <button
            onClick={() => { haptic('light'); onSkip(); }}
            className="h-9 px-3 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}

        <button
          onClick={() => { 
            if (isLast) { haptic('success'); onComplete(); } 
            else { haptic('medium'); onNext(); }
          }}
          disabled={isLast && completedSets === 0}
          className={cn(
            "flex-1 h-9 rounded-full text-xs font-medium transition-colors flex items-center justify-center gap-1",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLast ? (
            <>Done<Check className="h-3 w-3" /></>
          ) : (
            <>Next<ChevronRight className="h-3 w-3" /></>
          )}
        </button>
      </div>
    </div>
  );
}
