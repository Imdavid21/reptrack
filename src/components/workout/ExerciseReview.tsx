import { useState } from 'react';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { ExercisePicker } from './ExercisePicker';
import { cn } from '@/lib/utils';
import { X, ChevronUp, ChevronDown, Play, Plus, Check, Minus, History, ArrowLeftRight } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { getExerciseVariants, hasVariants } from '@/lib/exerciseVariants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  availableDays?: DayOption[];
  selectedDayKey?: string;
  onSwitchDay?: (dayKey: string) => void;
  onSkipExercises?: () => void;
  lastUsedNames?: Set<string>;
  isResuming?: boolean;
  activeSession?: boolean;
  onSelectExercise?: (index: number) => void;
  onFinish?: () => void;
  isFinishing?: boolean;
  startLabel?: string;
}

function ExerciseItemCard({
  exercise,
  globalIndex,
  totalExercises,
  isEditing,
  isFromHistory,
  onToggleEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdate,
  onSwap,
  activeSession,
  onSelect,
}: {
  exercise: WorkoutExercise;
  globalIndex: number;
  totalExercises: number;
  isEditing: boolean;
  isFromHistory: boolean;
  onToggleEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdate: (updated: WorkoutExercise) => void;
  onSwap: (variantName: string, defaultWeight: string) => void;
  activeSession?: boolean;
  onSelect?: () => void;
}) {
  const totalSets = exercise.sets.length;
  const targetInfo = exercise.sets[0];
  const exType = exercise.exerciseType || 'weighted';
  const isTimed = exType === 'timed';
  const isBodyweight = exType === 'bodyweight';
  const isWeightedBW = exType === 'weighted_bw';
  const showWeightField = exType === 'weighted' || exType === 'weighted_bw';

  const displayReps = (reps: string | undefined) => {
    if (!reps) return '-';
    const match = reps.match(/(\d+)\s*[--]\s*(\d+)/);
    if (match) return match[2];
    return reps;
  };

  const formatTimeSummary = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

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

  const completedSetsCount = exercise.sets.filter(s => s.completed).length;
  const allComplete = completedSetsCount === exercise.sets.length;
  const hasProgress = completedSetsCount > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0 }}
      transition={{ duration: 0.15 }}
      className="surface-standard overflow-hidden"
    >
      <div className="flex items-center gap-2 p-3">
        {!activeSession && (
          <div className="flex shrink-0 flex-col gap-1">
            <button
              onClick={onMoveUp}
              disabled={globalIndex === 0}
              aria-label={`Move ${exercise.name} up`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={globalIndex === totalExercises - 1}
              aria-label={`Move ${exercise.name} down`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {activeSession && (
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            allComplete ? 'bg-energy text-energy-foreground' : hasProgress ? 'bg-energy-soft text-energy-ink' : 'bg-muted text-muted-foreground'
          )}>
            {allComplete ? <Check className="h-4 w-4" /> : <span className="type-action tabular-nums">{globalIndex + 1}</span>}
          </div>
        )}

        <button
          onClick={() => {
            haptic('light');
            if (activeSession && onSelect) onSelect();
            else onToggleEdit();
          }}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate type-action">{exercise.name}</span>
            {exercise.mandatory && <span className="shrink-0 rounded-full bg-energy-soft px-2 py-0.5 type-meta text-energy-ink">Must</span>}
            {exercise.exerciseType === 'timed' && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 type-meta">Timed</span>}
            {exercise.exerciseType === 'bodyweight' && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 type-meta">BW</span>}
            {exercise.exerciseType === 'weighted_bw' && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 type-meta">BW+</span>}
          </div>
          {exercise.progression && <div className="mt-0.5 truncate type-meta">{exercise.progression}</div>}
          <div className="mt-1 flex items-center gap-1.5 type-meta">
            {isFromHistory && !activeSession && <History className="h-3 w-3 opacity-60" />}
            {activeSession ? (
              <span className="tabular-nums">{completedSetsCount}/{exercise.sets.length} sets logged</span>
            ) : (
              <>
                <span>{totalSets} sets</span>
                <span>·</span>
                {isTimed ? <span>{formatTimeSummary(targetInfo?.targetTime || parseInt(targetInfo?.targetReps) || 30)}</span> : <span>{displayReps(targetInfo?.targetReps)}{isBodyweight ? ' reps' : ''}</span>}
                {showWeightField && targetInfo?.targetWeight && targetInfo.targetWeight !== 'BW' && <><span>·</span><span>{isWeightedBW ? '+' : ''}{targetInfo.targetWeight}</span></>}
              </>
            )}
          </div>
        </button>

        <span className={cn('shrink-0 rounded-full px-2 py-1 type-meta', exercise.category === 'primary' ? 'bg-energy-soft text-energy-ink' : 'bg-muted')}>
          {exercise.category === 'primary' ? 'Main' : 'Accessory'}
        </span>

        {!activeSession && (
          <button onClick={onRemove} aria-label={`Remove ${exercise.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        )}

        {activeSession && <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted-foreground" />}
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="border-t border-border px-3 pb-3 pt-3">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <span className="type-caption">Sets</span>
                  <div className="mt-1 flex items-center gap-1">
                    <button onClick={() => handleSetsChange(-1)} aria-label="Remove one set" className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:text-foreground"><Minus className="h-4 w-4" /></button>
                    <span className="w-7 text-center type-action tabular-nums">{totalSets}</span>
                    <button onClick={() => handleSetsChange(1)} aria-label="Add one set" className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:text-foreground"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>

                <div>
                  <span className="type-caption">{isTimed ? 'Seconds' : 'Reps'}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={isTimed ? String(targetInfo?.targetTime || parseInt(targetInfo?.targetReps) || 30) : displayReps(targetInfo?.targetReps)}
                    onChange={(e) => {
                      if (isTimed) {
                        const secs = parseInt(e.target.value) || 0;
                        const newSets = exercise.sets.map(s => ({ ...s, targetTime: secs, targetReps: String(secs) }));
                        onUpdate({ ...exercise, sets: newSets });
                      } else handleRepsChange(e.target.value);
                    }}
                    className="mt-1 h-9 w-16 rounded-xl border border-border bg-muted px-2 text-center type-action tabular-nums outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {showWeightField && (
                  <div>
                    <span className="type-caption">{isWeightedBW ? '+Weight' : 'Weight'}</span>
                    <input
                      type="text"
                      value={targetInfo?.targetWeight || ''}
                      onChange={(e) => handleWeightChange(e.target.value)}
                      className="mt-1 h-9 w-20 rounded-xl border border-border bg-muted px-2 text-center type-action tabular-nums outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}

                <div className="flex-1" />

                {hasVariants(exercise.name) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button aria-label="Switch exercise variation" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <ArrowLeftRight className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-50 border-border bg-background">
                      {getExerciseVariants(exercise.name).map((variant) => (
                        <DropdownMenuItem key={variant.name} onClick={() => onSwap(variant.name, variant.defaultWeight)} className="flex items-center justify-between gap-4">
                          {variant.name}
                          {variant.name === exercise.name && <Check className="ml-auto h-3.5 w-3.5" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
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
  availableDays,
  selectedDayKey,
  onSwitchDay,
  onSkipExercises,
  lastUsedNames,
  isResuming,
  activeSession,
  onSelectExercise,
  onFinish,
  isFinishing,
  startLabel,
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

  const primaryExercises = exercises.filter(ex => ex.category === 'primary' || ex.category === 'compound');
  const accessoryExercises = exercises.filter(ex => ex.category !== 'primary' && ex.category !== 'compound');

  const renderExerciseItem = (exercise: WorkoutExercise) => {
    const globalIndex = exercises.indexOf(exercise);
    return (
      <ExerciseItemCard
        key={`${exercise.name}-${globalIndex}`}
        exercise={exercise}
        globalIndex={globalIndex}
        totalExercises={exercises.length}
        isEditing={!activeSession && editingIndex === globalIndex}
        isFromHistory={lastUsedNames?.has(exercise.name) ?? false}
        onToggleEdit={() => setEditingIndex(editingIndex === globalIndex ? null : globalIndex)}
        onMoveUp={() => handleMoveUp(globalIndex)}
        onMoveDown={() => handleMoveDown(globalIndex)}
        onRemove={() => handleRemove(globalIndex)}
        onUpdate={(updated) => handleUpdateExercise(globalIndex, updated)}
        onSwap={(variantName, defaultWeight) => {
          haptic('medium');
          const updated = { ...exercise, name: variantName };
          if (defaultWeight) updated.sets = updated.sets.map(s => ({ ...s, targetWeight: defaultWeight }));
          handleUpdateExercise(globalIndex, updated);
        }}
        activeSession={activeSession}
        onSelect={onSelectExercise ? () => onSelectExercise(globalIndex) : undefined}
      />
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {availableDays && availableDays.length > 1 && onSwitchDay && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {availableDays.map((day) => (
              <button
                key={day.key}
                onClick={() => {
                  if (day.key !== selectedDayKey) {
                    haptic('light');
                    onSwitchDay(day.key);
                  }
                }}
                className={cn('h-9 shrink-0 rounded-xl px-3 type-action transition-colors', day.key === selectedDayKey ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                {day.name}
              </button>
            ))}
          </div>
        )}
        <div>
          <h2 className="type-card-title">{dayName}</h2>
          <p className="mt-1 type-supporting">{dayFocus}</p>
        </div>
      </div>

      <div className="space-y-4">
        {primaryExercises.length > 0 && (
          <section>
            <h3 className="mb-2 type-component-title">Compounds</h3>
            <div className="space-y-2"><AnimatePresence mode="popLayout">{primaryExercises.map(ex => renderExerciseItem(ex))}</AnimatePresence></div>
          </section>
        )}

        {accessoryExercises.length > 0 && (
          <section>
            <h3 className="mb-2 type-component-title">Accessories</h3>
            <div className="space-y-2"><AnimatePresence mode="popLayout">{accessoryExercises.map(ex => renderExerciseItem(ex))}</AnimatePresence></div>
          </section>
        )}

        {exercises.length === 0 && (
          <div className="py-8 text-center">
            <p className="type-action">No exercises yet</p>
            <p className="mt-1 type-meta">Add an exercise to get started.</p>
          </div>
        )}
      </div>

      <div className="flex w-full flex-col items-center space-y-3">
        {activeSession ? (
          (() => {
            const allDone = exercises.length > 0 && exercises.every(ex => ex.sets.every(s => s.completed));
            if (allDone) {
              return (
                <button onClick={onFinish} disabled={isFinishing} className="control-large w-full rounded-xl bg-foreground px-5 type-action text-background disabled:opacity-50">
                  {isFinishing ? 'Saving…' : 'Finish workout'}
                </button>
              );
            }
            const resumeIndex = exercises.findIndex(ex => ex.sets.some(s => !s.completed));
            return (
              <>
                <button onClick={() => onSelectExercise?.(resumeIndex >= 0 ? resumeIndex : 0)} className="control-large flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 type-action text-background">
                  <Play className="h-4 w-4" />
                  Resume workout
                </button>
                <button onClick={onFinish} disabled={isFinishing} className="control-standard px-3 type-action text-muted-foreground transition-colors hover:text-foreground">
                  {isFinishing ? 'Saving…' : 'Finish early'}
                </button>
              </>
            );
          })()
        ) : (
          <>
            <div className="flex justify-center gap-2">
              {showPicker && <ExercisePicker existingExercises={exercises} onAddExercise={handleAddExercise} dayType={dayType} autoOpen onClose={() => setShowPicker(false)} />}
              {!showPicker && (
                <button onClick={() => setShowPicker(true)} className="control-standard flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-5 type-action text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                  Add exercise
                </button>
              )}
            </div>

            <button onClick={onStart} disabled={exercises.length === 0} className="control-large flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 type-action text-background disabled:opacity-40">
              <Play className="h-4 w-4" />
              {startLabel || (isResuming ? 'Resume workout' : `Start workout · ${exercises.length} exercises`)}
            </button>

            {onSkipExercises && (
              <button onClick={onSkipExercises} className="control-standard px-3 type-action text-muted-foreground transition-colors hover:text-foreground">
                Skip exercises
              </button>
            )}
          </>
        )}
      </div>

      {!activeSession && <p className="type-meta text-center">Tap an exercise to adjust sets, reps, weight, or duration.</p>}
    </div>
  );
}
