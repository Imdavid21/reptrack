import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, Minus, ArrowLeftRight, ChevronLeft, ChevronRight, Check, Trophy } from 'lucide-react';
import { getExerciseVariants, hasVariants } from '@/lib/exerciseVariants';
import { haptic } from '@/lib/haptics';
import { useState } from 'react';
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
  const [animatingSetIndex, setAnimatingSetIndex] = useState<number | null>(null);

  const handleSetToggle = (setIndex: number) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    const set = { ...updated.sets[setIndex] };
    const wasCompleted = set.completed;
    set.completed = !set.completed;
    
    // Trigger haptic and animation
    haptic(set.completed ? 'success' : 'light');
    setAnimatingSetIndex(setIndex);
    setTimeout(() => setAnimatingSetIndex(null), 300);
    
    if (!set.completed) {
      set.actualWeight = '';
      set.actualReps = '';
    }
    updated.sets[setIndex] = set;
    onChange(updated);
  };

  const handleSetChange = (
    setIndex: number,
    field: 'actualWeight' | 'actualReps',
    value: string
  ) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[setIndex] = { ...updated.sets[setIndex], [field]: value };
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

  // Check if current weight beats PR
  const currentMaxWeight = Math.max(
    ...exercise.sets
      .filter(s => s.completed && s.actualWeight)
      .map(s => parseFloat(s.actualWeight) || 0),
    0
  );
  const isNewPR = personalRecord && currentMaxWeight > personalRecord.maxWeight;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Exercise {exerciseIndex + 1} of {totalExercises}</span>
        <span className={cn(
          'px-2 py-0.5 text-xs font-medium',
          exercise.category === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted'
        )}>
          {exercise.category.toUpperCase()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: totalExercises }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 transition-colors',
              i < exerciseIndex ? 'bg-primary' :
              i === exerciseIndex ? 'bg-primary/50' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Exercise header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{exercise.name}</h2>
          {showVariantSwitch && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border hover:border-foreground/30">
                  <ArrowLeftRight className="h-3 w-3" />
                  <span>ALT</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-border">
                {variants.map((variant) => (
                  <DropdownMenuItem
                    key={variant.name}
                    onClick={() => switchVariant(variant.name, variant.defaultWeight)}
                    className={cn(
                      'cursor-pointer',
                      variant.name === exercise.name && 'bg-primary/10'
                    )}
                  >
                    {variant.name}
                    {variant.name === exercise.name && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tabular-nums">
            {completedSets}/{exercise.sets.length}
          </div>
          <span className="text-muted-foreground">sets completed</span>
        </div>

        {/* Personal Record Display */}
        {personalRecord && (
          <div className={cn(
            "flex items-center gap-2 p-2 border text-sm transition-colors",
            isNewPR 
              ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" 
              : "border-border bg-muted/50"
          )}>
            <Trophy className={cn("h-4 w-4", isNewPR && "text-yellow-500")} />
            {isNewPR ? (
              <span className="font-bold">🎉 NEW PR! {currentMaxWeight}kg</span>
            ) : (
              <span>
                <span className="text-muted-foreground">PR:</span>{' '}
                <span className="font-medium">{personalRecord.maxWeight}kg</span>{' '}
                <span className="text-muted-foreground">× {personalRecord.reps}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sets */}
      <div className="space-y-2">
        {exercise.sets.map((set, setIndex) => {
          const isAnimating = animatingSetIndex === setIndex;
          
          return (
            <div
              key={set.setNumber}
              className={cn(
                'border border-border p-4 transition-all',
                set.completed && 'bg-primary/5 border-primary/30',
                isAnimating && 'scale-[1.02]'
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSetToggle(setIndex)}
                  className="shrink-0"
                >
                  <div
                    className={cn(
                      "w-6 h-6 border-2 flex items-center justify-center transition-all duration-200",
                      set.completed 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground bg-transparent",
                      isAnimating && "scale-125"
                    )}
                  >
                    <Check 
                      className={cn(
                        "h-4 w-4 text-primary-foreground transition-all duration-200",
                        set.completed ? "scale-100 opacity-100" : "scale-0 opacity-0"
                      )} 
                    />
                  </div>
                </button>
                <span className="text-lg font-bold w-16">Set {set.setNumber}</span>
                
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Weight
                    </label>
                    <Input
                      placeholder={set.targetWeight}
                      value={set.actualWeight}
                      onChange={(e) => handleSetChange(setIndex, 'actualWeight', e.target.value)}
                      className="input-terminal h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Reps
                    </label>
                    <Input
                      placeholder={set.targetReps}
                      value={set.actualReps}
                      onChange={(e) => handleSetChange(setIndex, 'actualReps', e.target.value)}
                      className="input-terminal h-10"
                    />
                  </div>
                </div>

                {exercise.sets.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeSet(setIndex)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addSet}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Set
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 pt-4">
        {!isFirst && (
          <Button
            variant="outline"
            onClick={() => { haptic('light'); onPrev(); }}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        )}
        
        {completedSets === 0 && (
          <Button
            variant="ghost"
            onClick={() => { haptic('light'); onSkip(); }}
            className="shrink-0 text-muted-foreground"
          >
            Skip
          </Button>
        )}

        {isLast ? (
          <Button
            onClick={() => { haptic('success'); onComplete(); }}
            className="flex-1 btn-brutalist btn-primary"
            disabled={completedSets === 0}
          >
            <Check className="h-4 w-4 mr-1" />
            Continue to Habits
          </Button>
        ) : (
          <Button
            onClick={() => { haptic('medium'); onNext(); }}
            className="flex-1 btn-brutalist btn-primary"
          >
            Next Exercise
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
