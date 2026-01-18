import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, Minus, RefreshCw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { getExerciseVariants, hasVariants, getEquipmentEmoji } from '@/lib/exerciseVariants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
}: SingleExerciseCardProps) {
  const handleSetToggle = (setIndex: number) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    const set = { ...updated.sets[setIndex] };
    set.completed = !set.completed;
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
    const updated = { ...exercise };
    updated.sets = updated.sets.filter((_, idx) => idx !== setIndex);
    updated.sets.forEach((set, idx) => {
      set.setNumber = idx + 1;
    });
    onChange(updated);
  };

  const switchVariant = (variantName: string, defaultWeight: string) => {
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
  const currentVariant = variants.find(v => v.name === exercise.name);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Exercise {exerciseIndex + 1} of {totalExercises}</span>
        <span className={cn(
          'px-2 py-0.5 rounded text-xs font-medium',
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
              'h-1 flex-1 rounded-full transition-colors',
              i < exerciseIndex ? 'bg-primary' :
              i === exerciseIndex ? 'bg-primary/50' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Exercise header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{exercise.name}</h2>
          {showVariantSwitch && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {currentVariant && getEquipmentEmoji(currentVariant.equipmentType)}
                  Switch
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {variants.map((variant) => (
                  <DropdownMenuItem
                    key={variant.name}
                    onClick={() => switchVariant(variant.name, variant.defaultWeight)}
                    className={cn(
                      variant.name === exercise.name && 'bg-primary/10'
                    )}
                  >
                    <span className="mr-2">{getEquipmentEmoji(variant.equipmentType)}</span>
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
      </div>

      {/* Sets */}
      <div className="space-y-2">
        {exercise.sets.map((set, setIndex) => (
          <div
            key={set.setNumber}
            className={cn(
              'border border-border p-4 transition-all',
              set.completed && 'bg-primary/5 border-primary/30'
            )}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={set.completed}
                onCheckedChange={() => handleSetToggle(setIndex)}
                className="checkbox-brutalist h-6 w-6"
              />
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
            onClick={onPrev}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        )}
        
        {completedSets === 0 && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="shrink-0 text-muted-foreground"
          >
            Skip
          </Button>
        )}

        {isLast ? (
          <Button
            onClick={onComplete}
            className="flex-1 btn-brutalist btn-primary"
            disabled={completedSets === 0}
          >
            <Check className="h-4 w-4 mr-1" />
            Continue to Habits
          </Button>
        ) : (
          <Button
            onClick={onNext}
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
