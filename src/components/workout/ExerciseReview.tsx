import { useState } from 'react';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { ExercisePicker } from './ExercisePicker';
import { cn } from '@/lib/utils';
import { X, ChevronUp, ChevronDown, Sparkles, Play, Plus } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';

interface ExerciseReviewProps {
  exercises: WorkoutExercise[];
  dayName: string;
  dayFocus: string;
  dayType?: 'Push' | 'Pull' | 'Legs';
  onChange: (exercises: WorkoutExercise[]) => void;
  onStart: () => void;
  onSuggest?: () => void;
  isSuggesting?: boolean;
}

export function ExerciseReview({
  exercises,
  dayName,
  dayFocus,
  dayType,
  onChange,
  onStart,
  onSuggest,
  isSuggesting,
}: ExerciseReviewProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleRemove = (index: number) => {
    haptic('light');
    onChange(exercises.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    haptic('light');
    const updated = [...exercises];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((ex, i) => (ex.sort_order = i));
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === exercises.length - 1) return;
    haptic('light');
    const updated = [...exercises];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((ex, i) => (ex.sort_order = i));
    onChange(updated);
  };

  const handleAddExercise = (exercise: WorkoutExercise) => {
    onChange([...exercises, { ...exercise, sort_order: exercises.length }]);
    setShowPicker(false);
  };

  const primaryExercises = exercises.filter(ex => ex.category === 'primary');
  const accessoryExercises = exercises.filter(ex => ex.category === 'accessory');

  const renderExerciseItem = (exercise: WorkoutExercise, globalIndex: number) => {
    const totalSets = exercise.sets.length;
    const targetInfo = exercise.sets[0];

    return (
      <motion.div
        key={`${exercise.name}-${globalIndex}`}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -40, height: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card group"
      >
        {/* Reorder controls */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => handleMoveUp(globalIndex)}
            disabled={globalIndex === 0}
            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleMoveDown(globalIndex)}
            disabled={globalIndex === exercises.length - 1}
            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Exercise info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{exercise.name}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>{totalSets} sets</span>
            <span className="opacity-40">·</span>
            <span>{targetInfo?.targetReps || '—'}</span>
            {targetInfo?.targetWeight && targetInfo.targetWeight !== 'BW' && (
              <>
                <span className="opacity-40">·</span>
                <span>{targetInfo.targetWeight}</span>
              </>
            )}
          </div>
        </div>

        {/* Category badge */}
        <span className={cn(
          'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
          exercise.category === 'primary'
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        )}>
          {exercise.category === 'primary' ? 'MAIN' : 'ACC'}
        </span>

        {/* Remove button */}
        <button
          onClick={() => handleRemove(globalIndex)}
          className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Day header */}
      <div>
        <h2 className="text-lg font-bold">{dayName}</h2>
        <p className="text-sm text-muted-foreground">{dayFocus}</p>
      </div>

      {/* Exercise list */}
      <div className="space-y-4">
        {primaryExercises.length > 0 && (
          <div>
            <h4 className="section-header mb-2">COMPOUNDS</h4>
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {primaryExercises.map((ex) => {
                  const globalIndex = exercises.indexOf(ex);
                  return renderExerciseItem(ex, globalIndex);
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {accessoryExercises.length > 0 && (
          <div>
            <h4 className="section-header mb-2">ACCESSORIES</h4>
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {accessoryExercises.map((ex) => {
                  const globalIndex = exercises.indexOf(ex);
                  return renderExerciseItem(ex, globalIndex);
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {exercises.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No exercises yet</p>
            <p className="text-xs mt-1">Add exercises manually or get AI suggestions</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2.5">
        {/* Add exercise */}
        {showPicker ? (
          <ExercisePicker
            existingExercises={exercises}
            onAddExercise={handleAddExercise}
            dayType={dayType}
          />
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Exercise
          </button>
        )}

        {/* AI suggest */}
        {onSuggest && (
          <button
            onClick={onSuggest}
            disabled={isSuggesting}
            className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {isSuggesting ? 'Generating...' : 'Suggest with AI'}
          </button>
        )}

        {/* Start workout */}
        <button
          onClick={onStart}
          disabled={exercises.length === 0}
          className="btn-brutalist btn-primary w-full py-4 text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Play className="h-4 w-4" />
          Begin Session ({exercises.length} exercises)
        </button>
      </div>

      {/* Info text */}
      <p className="text-[11px] text-muted-foreground text-center">
        Remove or reorder exercises before starting. You can still add more during the workout.
      </p>
    </div>
  );
}
