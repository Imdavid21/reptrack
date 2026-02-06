import { useState } from 'react';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { ExercisePicker } from './ExercisePicker';
import { cn } from '@/lib/utils';
import { X, ChevronUp, ChevronDown, Sparkles, Play, Plus, Check, Undo2, Minus } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';

interface DayOption {
  key: string;
  name: string;
  focus: string;
}

interface ExerciseReviewProps {
  exercises: WorkoutExercise[];
  dayName: string;
  dayFocus: string;
  dayType?: 'Push' | 'Pull' | 'Legs';
  onChange: (exercises: WorkoutExercise[]) => void;
  onStart: () => void;
  onSuggest?: () => void;
  isSuggesting?: boolean;
  hasPendingSuggestions?: boolean;
  onConfirmSuggestions?: () => void;
  onDenySuggestions?: () => void;
  availableDays?: DayOption[];
  selectedDayKey?: string;
  onSwitchDay?: (dayKey: string) => void;
}

function ExerciseItemCard({
  exercise,
  globalIndex,
  totalExercises,
  isEditing,
  onToggleEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdate,
}: {
  exercise: WorkoutExercise;
  globalIndex: number;
  totalExercises: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdate: (updated: WorkoutExercise) => void;
}) {
  const totalSets = exercise.sets.length;
  const targetInfo = exercise.sets[0];

  const handleSetsChange = (delta: number) => {
    haptic('light');
    const newCount = Math.max(1, Math.min(10, totalSets + delta));
    if (newCount === totalSets) return;

    let newSets: ExerciseSet[];
    if (newCount > totalSets) {
      const lastSet = exercise.sets[exercise.sets.length - 1];
      const added = Array.from({ length: newCount - totalSets }, (_, i) => ({
        setNumber: totalSets + i + 1,
        targetWeight: lastSet.targetWeight,
        targetReps: lastSet.targetReps,
        actualWeight: '',
        actualReps: '',
        completed: false,
      }));
      newSets = [...exercise.sets, ...added];
    } else {
      newSets = exercise.sets.slice(0, newCount);
    }
    newSets.forEach((s, i) => (s.setNumber = i + 1));
    onUpdate({ ...exercise, sets: newSets });
  };

  const handleRepsChange = (value: string) => {
    const newSets = exercise.sets.map(s => ({ ...s, targetReps: value }));
    onUpdate({ ...exercise, sets: newSets });
  };

  const handleWeightChange = (value: string) => {
    const newSets = exercise.sets.map(s => ({ ...s, targetWeight: value }));
    onUpdate({ ...exercise, sets: newSets });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 p-3">
        {/* Reorder controls */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={globalIndex === 0}
            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={globalIndex === totalExercises - 1}
            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Exercise info — tap to expand editor */}
        <button
          onClick={() => {
            haptic('light');
            onToggleEdit();
          }}
          className="flex-1 min-w-0 text-left"
        >
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
        </button>

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
          onClick={onRemove}
          className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Inline editor */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 flex items-center gap-3 border-t border-border/50">
              {/* Sets */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Sets</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSetsChange(-1)}
                    className="h-6 w-6 flex items-center justify-center rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-bold w-5 text-center tabular-nums">{totalSets}</span>
                  <button
                    onClick={() => handleSetsChange(1)}
                    className="h-6 w-6 flex items-center justify-center rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="w-px h-8 bg-border/50" />

              {/* Reps */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Reps</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetInfo?.targetReps || ''}
                  onChange={(e) => handleRepsChange(e.target.value)}
                  className="h-6 w-14 text-center text-sm font-bold bg-muted rounded-md border-none outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </div>

              <div className="w-px h-8 bg-border/50" />

              {/* Weight */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Weight</span>
                <input
                  type="text"
                  value={targetInfo?.targetWeight || ''}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="h-6 w-16 text-center text-sm font-bold bg-muted rounded-md border-none outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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
  hasPendingSuggestions,
  onConfirmSuggestions,
  onDenySuggestions,
  availableDays,
  selectedDayKey,
  onSwitchDay,
}: ExerciseReviewProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleRemove = (index: number) => {
    haptic('light');
    onChange(exercises.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    haptic('light');
    const updated = [...exercises];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((ex, i) => (ex.sort_order = i));
    onChange(updated);
    if (editingIndex === index) setEditingIndex(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === exercises.length - 1) return;
    haptic('light');
    const updated = [...exercises];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((ex, i) => (ex.sort_order = i));
    onChange(updated);
    if (editingIndex === index) setEditingIndex(index + 1);
  };

  const handleUpdateExercise = (index: number, updated: WorkoutExercise) => {
    const newExercises = [...exercises];
    newExercises[index] = updated;
    onChange(newExercises);
  };

  const handleAddExercise = (exercise: WorkoutExercise) => {
    onChange([...exercises, { ...exercise, sort_order: exercises.length }]);
    setShowPicker(false);
  };

  const primaryExercises = exercises.filter(ex => ex.category === 'primary');
  const accessoryExercises = exercises.filter(ex => ex.category === 'accessory');

  const renderExerciseItem = (exercise: WorkoutExercise) => {
    const globalIndex = exercises.indexOf(exercise);
    return (
      <ExerciseItemCard
        key={`${exercise.name}-${globalIndex}`}
        exercise={exercise}
        globalIndex={globalIndex}
        totalExercises={exercises.length}
        isEditing={editingIndex === globalIndex}
        onToggleEdit={() => setEditingIndex(editingIndex === globalIndex ? null : globalIndex)}
        onMoveUp={() => handleMoveUp(globalIndex)}
        onMoveDown={() => handleMoveDown(globalIndex)}
        onRemove={() => handleRemove(globalIndex)}
        onUpdate={(updated) => handleUpdateExercise(globalIndex, updated)}
      />
    );
  };

  return (
    <div className="space-y-5">
      {/* Day switcher + header */}
      <div className="space-y-2">
        {availableDays && availableDays.length > 1 && onSwitchDay && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {availableDays.map((day) => (
              <button
                key={day.key}
                onClick={() => {
                  if (day.key !== selectedDayKey) {
                    haptic('light');
                    onSwitchDay(day.key);
                  }
                }}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  day.key === selectedDayKey
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {day.name}
              </button>
            ))}
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold">{dayName}</h2>
          <p className="text-sm text-muted-foreground">{dayFocus}</p>
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-4">
        {primaryExercises.length > 0 && (
          <div>
            <h4 className="section-header mb-2">COMPOUNDS</h4>
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {primaryExercises.map((ex) => renderExerciseItem(ex))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {accessoryExercises.length > 0 && (
          <div>
            <h4 className="section-header mb-2">ACCESSORIES</h4>
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {accessoryExercises.map((ex) => renderExerciseItem(ex))}
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
        {/* AI suggestion confirmation banner */}
        <AnimatePresence>
          {hasPendingSuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">AI updated exercises</span>
                <button
                  onClick={onConfirmSuggestions}
                  className="h-7 px-2.5 rounded-lg bg-foreground text-background text-[11px] font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
                >
                  <Check className="h-3 w-3" />
                  Keep
                </button>
                <button
                  onClick={onDenySuggestions}
                  className="h-7 px-2.5 rounded-lg border border-border text-[11px] font-semibold flex items-center gap-1 hover:bg-muted transition-colors"
                >
                  <Undo2 className="h-3 w-3" />
                  Undo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add exercise + AI suggest row */}
        <div className="flex gap-2">
          {showPicker ? (
            <div className="w-full">
              <ExercisePicker
                existingExercises={exercises}
                onAddExercise={handleAddExercise}
                dayType={dayType}
              />
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowPicker(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Exercise
              </button>

              {onSuggest && !hasPendingSuggestions && (
                <button
                  onClick={onSuggest}
                  disabled={isSuggesting}
                  title="Suggest exercises with AI"
                  className={cn(
                    'h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-40',
                    isSuggesting && 'animate-pulse'
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

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
        Tap an exercise to edit sets, reps & weight. Add more during the workout.
      </p>
    </div>
  );
}
