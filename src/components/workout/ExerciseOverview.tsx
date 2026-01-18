import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, GripVertical } from 'lucide-react';
import { ExercisePicker } from './ExercisePicker';

interface ExerciseOverviewProps {
  exercises: WorkoutExercise[];
  currentIndex: number;
  onSelectExercise: (index: number) => void;
  onAddExercise: (exercise: WorkoutExercise) => void;
  dayType?: 'Push' | 'Pull' | 'Legs';
}

export function ExerciseOverview({
  exercises,
  currentIndex,
  onSelectExercise,
  onAddExercise,
  dayType,
}: ExerciseOverviewProps) {
  const categories = ['primary', 'accessory'] as const;

  const getExerciseStatus = (exercise: WorkoutExercise) => {
    const completed = exercise.sets.filter(s => s.completed).length;
    const total = exercise.sets.length;
    
    if (completed === 0) return 'pending';
    if (completed === total) return 'complete';
    return 'partial';
  };

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const categoryExercises = exercises.filter((ex) => ex.category === category);
        if (categoryExercises.length === 0) return null;

        return (
          <div key={category}>
            <h4 className="section-header mb-2">{category.toUpperCase()}</h4>
            <div className="space-y-2">
              {categoryExercises.map((exercise) => {
                const exerciseIndex = exercises.findIndex((ex) => ex.name === exercise.name);
                const status = getExerciseStatus(exercise);
                const completedSets = exercise.sets.filter(s => s.completed).length;
                const isActive = exerciseIndex === currentIndex;

                return (
                  <button
                    key={exercise.name}
                    onClick={() => onSelectExercise(exerciseIndex)}
                    className={cn(
                      'w-full text-left p-4 rounded border transition-all',
                      status === 'complete' && 'bg-primary/5 border-primary/30',
                      status === 'partial' && 'bg-yellow-500/5 border-yellow-500/30',
                      status === 'pending' && 'border-border hover:bg-muted/50',
                      isActive && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                        status === 'complete' ? 'bg-primary text-primary-foreground' :
                        status === 'partial' ? 'bg-yellow-500/20 text-yellow-600' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {status === 'complete' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-bold">{exerciseIndex + 1}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{exercise.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {completedSets}/{exercise.sets.length} sets done
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add exercise button */}
      <div className="pt-2">
        <ExercisePicker
          existingExercises={exercises}
          onAddExercise={onAddExercise}
          dayType={dayType}
        />
      </div>
    </div>
  );
}
