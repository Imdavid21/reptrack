import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, Minus, ArrowLeftRight, ChevronLeft, ChevronRight, Check, Trophy } from 'lucide-react';
import { getExerciseVariants, hasVariants } from '@/lib/exerciseVariants';
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
          <h2 className="text-base font-bold truncate">{exercise.name}</h2>
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

      {/* Compact Sets */}
      <div className="space-y-1.5">
        {exercise.sets.map((set, setIndex) => (
          <div
            key={set.setNumber}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg border transition-colors',
              set.completed ? 'bg-primary/5 border-primary/20' : 'border-border'
            )}
          >
            <button
              type="button"
              onClick={() => handleSetToggle(setIndex)}
              className={cn(
                "h-6 w-6 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                set.completed 
                  ? "bg-primary border-primary" 
                  : "border-muted-foreground"
              )}
            >
              <Check className={cn(
                "h-3 w-3 text-primary-foreground transition-opacity",
                set.completed ? "opacity-100" : "opacity-0"
              )} />
            </button>
            
            <span className="text-xs font-medium w-6 text-muted-foreground">{set.setNumber}</span>
            
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Input
                placeholder={set.targetWeight}
                value={set.actualWeight}
                onChange={(e) => handleSetChange(setIndex, 'actualWeight', e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
              <Input
                placeholder={set.targetReps}
                value={set.actualReps}
                onChange={(e) => handleSetChange(setIndex, 'actualReps', e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </div>

            {exercise.sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(setIndex)}
                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addSet}
          className="w-full h-8 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" />
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
