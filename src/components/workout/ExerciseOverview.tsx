import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Check, ChevronRight } from 'lucide-react';

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
                      status === 'partial' && 'bg-warning/5 border-warning/30',
                      status === 'pending' && 'border-border hover:bg-muted/50',
                      isActive && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                        status === 'complete' ? 'bg-primary text-primary-foreground' :
                        status === 'partial' ? 'bg-warning/20 text-warning' :
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
                          {completedSets}/{exercise.sets.length} sets logged
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

    </div>
  );
}
