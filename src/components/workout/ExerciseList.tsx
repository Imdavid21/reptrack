import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';

interface ExerciseListProps {
  exercises: WorkoutExercise[];
  onChange: (exercises: WorkoutExercise[]) => void;
}

export function ExerciseList({ exercises, onChange }: ExerciseListProps) {
  const handleToggle = (index: number) => {
    const updated = [...exercises];
    updated[index].completed = !updated[index].completed;
    if (!updated[index].completed) {
      updated[index].actual_weight = '';
      updated[index].actual_reps = '';
    }
    onChange(updated);
  };

  const handleChange = (
    index: number,
    field: 'actual_weight' | 'actual_reps',
    value: string
  ) => {
    const updated = [...exercises];
    updated[index][field] = value;
    onChange(updated);
  };

  const categories = ['primary', 'accessory'] as const;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const categoryExercises = exercises.filter((ex) => ex.category === category);
        if (categoryExercises.length === 0) return null;

        return (
          <div key={category}>
            <h4 className="section-header">{category.toUpperCase()}</h4>
            <div className="space-y-2">
              {categoryExercises.map((exercise) => {
                const index = exercises.findIndex((ex) => ex.name === exercise.name);
                return (
                  <div
                    key={exercise.name}
                    className={cn(
                      'exercise-row',
                      exercise.completed && 'exercise-row-completed'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={exercise.completed}
                        onCheckedChange={() => handleToggle(index)}
                        className="checkbox-brutalist mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{exercise.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {exercise.target_weight} × {exercise.target_reps}
                          </span>
                        </div>

                        {exercise.completed && (
                          <div className="grid grid-cols-2 gap-2 animate-fade-in">
                            <Input
                              placeholder="Weight (kg)"
                              value={exercise.actual_weight || ''}
                              onChange={(e) =>
                                handleChange(index, 'actual_weight', e.target.value)
                              }
                              className="input-terminal h-10 text-sm"
                            />
                            <Input
                              placeholder="Reps"
                              value={exercise.actual_reps || ''}
                              onChange={(e) =>
                                handleChange(index, 'actual_reps', e.target.value)
                              }
                              className="input-terminal h-10 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
