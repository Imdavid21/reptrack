import { Button } from '@/components/ui/button';
import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Check, Trophy } from 'lucide-react';
import { getExerciseVariants, hasVariants } from '@/lib/exerciseVariants';
import { haptic } from '@/lib/haptics';
import { QuickSetLogger } from './QuickSetLogger';
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
  
  const handleSetComplete = (setIndex: number, weight: number, reps: number) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[setIndex] = {
      ...updated.sets[setIndex],
      actualWeight: weight.toString(),
      actualReps: reps.toString(),
      completed: true,
    };
    onChange(updated);
  };

  const handleSetRemove = (setIndex: number) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[setIndex] = {
      ...updated.sets[setIndex],
      actualWeight: '',
      actualReps: '',
      completed: false,
    };
    onChange(updated);
  };

  const handleAddSet = () => {
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

        {/* Personal Record Display */}
        {personalRecord && !isNewPR && (
          <div className="flex items-center gap-2 p-2 border border-border bg-muted/30 text-sm">
            <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">PR:</span>{' '}
              <span className="font-medium">{personalRecord.maxWeight}kg</span>{' '}
              <span className="text-muted-foreground">× {personalRecord.reps}</span>
            </span>
          </div>
        )}
      </div>

      {/* Quick Set Logger - 1-2 tap interface */}
      <QuickSetLogger
        exerciseName={exercise.name}
        sets={exercise.sets}
        personalRecord={personalRecord}
        onSetComplete={handleSetComplete}
        onSetRemove={handleSetRemove}
        onAddSet={handleAddSet}
      />

      {/* Navigation */}
      <div className="flex gap-2 pt-4 border-t border-border">
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
