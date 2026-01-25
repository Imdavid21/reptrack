import { Button } from '@/components/ui/button';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, ArrowLeftRight, ChevronLeft, ChevronRight, Check, Trophy } from 'lucide-react';
import { getExerciseVariants, hasVariants } from '@/lib/exerciseVariants';
import { haptic } from '@/lib/haptics';
import { PredictiveSetCard } from './PredictiveSetCard';
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
  const handleSetUpdate = (setIndex: number, weight: string, reps: string, completed: boolean) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[setIndex] = { 
      ...updated.sets[setIndex], 
      actualWeight: weight,
      actualReps: reps,
      completed,
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
            "flex items-center gap-2 p-2 border text-sm",
            isNewPR 
              ? "border-primary bg-primary/5" 
              : "border-border bg-muted/30"
          )}>
            <Trophy className={cn("h-3.5 w-3.5", isNewPR ? "text-primary" : "text-muted-foreground")} />
            {isNewPR ? (
              <span className="font-medium text-primary">NEW PR: {currentMaxWeight}kg</span>
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

      {/* Predictive Sets */}
      <div className="space-y-3">
        {exercise.sets.map((set, setIndex) => (
          <PredictiveSetCard
            key={set.setNumber}
            exerciseName={exercise.name}
            set={set}
            setIndex={setIndex}
            personalRecord={personalRecord}
            onUpdate={(weight, reps, completed) => handleSetUpdate(setIndex, weight, reps, completed)}
            onRemove={() => removeSet(setIndex)}
            canRemove={exercise.sets.length > 1}
          />
        ))}

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
