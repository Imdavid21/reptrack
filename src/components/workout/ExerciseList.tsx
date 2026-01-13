import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ExerciseListProps {
  exercises: WorkoutExercise[];
  onChange: (exercises: WorkoutExercise[]) => void;
}

export function ExerciseList({ exercises, onChange }: ExerciseListProps) {
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const toggleExpand = (name: string) => {
    const newExpanded = new Set(expandedExercises);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedExercises(newExpanded);
  };

  const handleSetToggle = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    const set = updated[exerciseIndex].sets[setIndex];
    set.completed = !set.completed;
    if (!set.completed) {
      set.actualWeight = '';
      set.actualReps = '';
    }
    onChange(updated);
  };

  const handleSetChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'actualWeight' | 'actualReps' | 'targetWeight' | 'targetReps',
    value: string
  ) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    onChange(updated);
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...exercises];
    const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
    updated[exerciseIndex].sets.push({
      setNumber: lastSet.setNumber + 1,
      targetWeight: lastSet.targetWeight,
      targetReps: lastSet.targetReps,
      actualWeight: '',
      actualReps: '',
      completed: false,
    });
    onChange(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    if (updated[exerciseIndex].sets.length > 1) {
      updated[exerciseIndex].sets.splice(setIndex, 1);
      // Renumber sets
      updated[exerciseIndex].sets.forEach((set, idx) => {
        set.setNumber = idx + 1;
      });
      onChange(updated);
    }
  };

  const getExerciseCompletedCount = (exercise: WorkoutExercise) => {
    return exercise.sets.filter(s => s.completed).length;
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
            <div className="space-y-3">
              {categoryExercises.map((exercise) => {
                const exerciseIndex = exercises.findIndex((ex) => ex.name === exercise.name);
                const isExpanded = expandedExercises.has(exercise.name);
                const completedSets = getExerciseCompletedCount(exercise);
                const allCompleted = completedSets === exercise.sets.length;

                return (
                  <div
                    key={exercise.name}
                    className={cn(
                      'exercise-row',
                      allCompleted && 'exercise-row-completed'
                    )}
                  >
                    {/* Exercise Header */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(exercise.name)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{exercise.name}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {completedSets}/{exercise.sets.length} sets
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Sets - Expandable */}
                    {isExpanded && (
                      <div className="mt-3 space-y-2 animate-fade-in">
                        {exercise.sets.map((set, setIndex) => (
                          <div
                            key={set.setNumber}
                            className={cn(
                              'border border-border p-3 transition-colors',
                              set.completed && 'bg-primary/5 border-primary/30'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={set.completed}
                                onCheckedChange={() => handleSetToggle(exerciseIndex, setIndex)}
                                className="checkbox-brutalist"
                              />
                              <span className="text-sm font-medium w-12">Set {set.setNumber}</span>
                              
                              {/* Target inputs */}
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-muted-foreground uppercase">Target</label>
                                  <div className="flex gap-1">
                                    <Input
                                      placeholder="kg"
                                      value={set.targetWeight}
                                      onChange={(e) =>
                                        handleSetChange(exerciseIndex, setIndex, 'targetWeight', e.target.value)
                                      }
                                      className="input-terminal h-8 text-xs"
                                    />
                                    <Input
                                      placeholder="reps"
                                      value={set.targetReps}
                                      onChange={(e) =>
                                        handleSetChange(exerciseIndex, setIndex, 'targetReps', e.target.value)
                                      }
                                      className="input-terminal h-8 text-xs"
                                    />
                                  </div>
                                </div>

                                {/* Actual inputs - only show when completed */}
                                {set.completed && (
                                  <div className="animate-fade-in">
                                    <label className="text-[10px] text-muted-foreground uppercase">Actual</label>
                                    <div className="flex gap-1">
                                      <Input
                                        placeholder="kg"
                                        value={set.actualWeight}
                                        onChange={(e) =>
                                          handleSetChange(exerciseIndex, setIndex, 'actualWeight', e.target.value)
                                        }
                                        className="input-terminal h-8 text-xs"
                                      />
                                      <Input
                                        placeholder="reps"
                                        value={set.actualReps}
                                        onChange={(e) =>
                                          handleSetChange(exerciseIndex, setIndex, 'actualReps', e.target.value)
                                        }
                                        className="input-terminal h-8 text-xs"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Remove set button */}
                              {exercise.sets.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => removeSet(exerciseIndex, setIndex)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Add set button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => addSet(exerciseIndex)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Set
                        </Button>
                      </div>
                    )}
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
