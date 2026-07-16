import { useState } from 'react';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { ExercisePicker } from './ExercisePicker';
import { cn } from '@/lib/utils';
import { X, ChevronUp, ChevronDown, Sparkles, Play, Plus, Check, Undo2, Minus, History, ArrowLeftRight } from 'lucide-react';
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
  onSuggest?: () => void;
  isSuggesting?: boolean;
  hasPendingSuggestions?: boolean;
  onConfirmSuggestions?: () => void;
  onDenySuggestions?: () => void;
  availableDays?: DayOption[];
  selectedDayKey?: string;
  onSwitchDay?: (dayKey: string) => void;
  onSkipExercises?: () => void;
  lastUsedNames?: Set<string>;
  isResuming?: boolean;
  // Active session mode (mid-workout overview)
  activeSession?: boolean;
  onSelectExercise?: (index: number) => void;
  onFinish?: () => void;
  isFinishing?: boolean;
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

  // Extract max from rep ranges like "10-12" → "12"
  const displayReps = (reps: string | undefined) => {
    if (!reps) return '—';
    const match = reps.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (match) return match[2];
    return reps;
  };

  // Format seconds for timed display
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
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 p-3">
        {/* Reorder controls — hidden during active session */}
        {!activeSession && (
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
        )}

        {/* Status icon for active session */}
        {activeSession && (
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
            allComplete ? 'bg-primary text-primary-foreground' :
            hasProgress ? 'bg-warning/20 text-warning' :
            'bg-muted text-muted-foreground'
          )}>
            {allComplete ? (
              <Check className="h-4 w-4" />
            ) : (
              <span className="text-sm font-bold">{globalIndex + 1}</span>
            )}
          </div>
        )}

        {/* Exercise info — tap to expand editor or select exercise */}
        <button
          onClick={() => {
            haptic('light');
            if (activeSession && onSelect) {
              onSelect();
            } else {
              onToggleEdit();
            }
          }}
          className="flex-1 min-w-0 text-left"
        >
          <div className="font-semibold text-sm flex items-center gap-1.5 min-w-0">
            <span className="truncate">{exercise.name}</span>
            {exercise.mandatory && (
              <span className="text-[10px] bg-energy text-energy-foreground px-1 py-0.5 rounded uppercase font-bold shrink-0">must</span>
            )}
            {exercise.exerciseType === 'timed' && (
              <span className="text-[10px] bg-muted px-1 py-0.5 rounded uppercase text-muted-foreground shrink-0">timed</span>
            )}
            {exercise.exerciseType === 'bodyweight' && (
              <span className="text-[10px] bg-muted px-1 py-0.5 rounded uppercase text-muted-foreground shrink-0">bw</span>
            )}
            {exercise.exerciseType === 'weighted_bw' && (
              <span className="text-[10px] bg-muted px-1 py-0.5 rounded uppercase text-muted-foreground shrink-0">bw+</span>
            )}
          </div>
          {exercise.progression && (
            <div className="text-[10px] text-muted-foreground/80 italic truncate mt-0.5">{exercise.progression}</div>
          )}
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            {isFromHistory && !activeSession && (
              <>
                <History className="h-2.5 w-2.5 opacity-50" />
              </>
            )}
            {activeSession ? (
              <span>{completedSetsCount}/{exercise.sets.length} sets logged</span>
            ) : (
              <>
                <span>{totalSets} sets</span>
                <span className="opacity-40">·</span>
                {isTimed ? (
                  <span>{formatTimeSummary(targetInfo?.targetTime || parseInt(targetInfo?.targetReps) || 30)}</span>
                ) : (
                  <span>{displayReps(targetInfo?.targetReps)}{isBodyweight ? ' reps' : ''}</span>
                )}
                {showWeightField && targetInfo?.targetWeight && targetInfo.targetWeight !== 'BW' && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>{isWeightedBW ? '+' : ''}{targetInfo.targetWeight}</span>
                  </>
                )}
                {(isTimed || isBodyweight || isWeightedBW) && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="text-[9px] uppercase">{isTimed ? 'timed' : isWeightedBW ? 'bw+' : 'bw'}</span>
                  </>
                )}
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

        {/* Remove button — hidden during active session */}
        {!activeSession && (
          <button
            onClick={onRemove}
            className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Chevron for active session */}
        {activeSession && (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 -rotate-90" />
        )}
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
            <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
              <div className="flex items-center gap-3">
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

                {/* Reps or Time */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                    {isTimed ? 'Secs' : 'Reps'}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={isTimed
                      ? String(targetInfo?.targetTime || parseInt(targetInfo?.targetReps) || 30)
                      : displayReps(targetInfo?.targetReps)
                    }
                    onChange={(e) => {
                      if (isTimed) {
                        const secs = parseInt(e.target.value) || 0;
                        const newSets = exercise.sets.map(s => ({ ...s, targetTime: secs, targetReps: String(secs) }));
                        onUpdate({ ...exercise, sets: newSets });
                      } else {
                        handleRepsChange(e.target.value);
                      }
                    }}
                    className="h-6 w-14 text-center text-sm font-bold bg-muted rounded-md border-none outline-none focus:ring-1 focus:ring-foreground/20"
                  />
                </div>

                {/* Weight — only for weighted and weighted_bw */}
                {showWeightField && (
                  <>
                    <div className="w-px h-8 bg-border/50" />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                        {isWeightedBW ? '+Weight' : 'Weight'}
                      </span>
                      <input
                        type="text"
                        value={targetInfo?.targetWeight || ''}
                        onChange={(e) => handleWeightChange(e.target.value)}
                        className="h-6 w-16 text-center text-sm font-bold bg-muted rounded-md border-none outline-none focus:ring-1 focus:ring-foreground/20"
                      />
                    </div>
                  </>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Swap variant button */}
                {hasVariants(exercise.name) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        <ArrowLeftRight className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border-border z-50">
                      {getExerciseVariants(exercise.name).map((variant) => (
                        <DropdownMenuItem
                          key={variant.name}
                          onClick={() => onSwap(variant.name, variant.defaultWeight)}
                          className="flex items-center justify-between gap-4"
                        >
                          {variant.name}
                          {variant.name === exercise.name && <Check className="h-3 w-3 ml-auto" />}
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
  onSuggest,
  isSuggesting,
  hasPendingSuggestions,
  onConfirmSuggestions,
  onDenySuggestions,
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
          if (defaultWeight) {
            updated.sets = updated.sets.map(s => ({ ...s, targetWeight: defaultWeight }));
          }
          handleUpdateExercise(globalIndex, updated);
        }}
        activeSession={activeSession}
        onSelect={onSelectExercise ? () => onSelectExercise(globalIndex) : undefined}
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
                  'shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
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
        {isSuggesting ? (
          <div className="space-y-4">
            <div>
              <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
              <div className="space-y-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-24 bg-muted/70 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-8 bg-muted/50 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="h-3 w-28 bg-muted rounded animate-pulse mb-2" />
              <div className="space-y-1.5">
                {[1, 2].map(i => (
                  <div key={i} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-20 bg-muted/70 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-8 bg-muted/50 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center animate-pulse">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Generating exercises…
            </p>
          </div>
        ) : (
          <>
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
                <p className="text-xs mt-1">Add exercises or try AI suggestions</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2.5 flex flex-col items-center w-full">
      {activeSession ? (
          /* Active session: Resume / Finish buttons */
          (() => {
            const allDone = exercises.length > 0 && exercises.every(ex =>
              ex.sets.every(s => s.completed)
            );
            if (allDone) {
              return (
                <button
                  onClick={onFinish}
                  disabled={isFinishing}
                  className="btn-brutalist btn-primary self-stretch py-4 text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isFinishing ? 'Saving…' : 'Finish Workout'}
                </button>
              );
            }
            const resumeIndex = exercises.findIndex(ex =>
              ex.sets.some(s => !s.completed)
            );
            return (
              <>
                <button
                  onClick={() => onSelectExercise?.(resumeIndex >= 0 ? resumeIndex : 0)}
                  className="btn-brutalist btn-primary self-stretch py-4 text-base font-bold flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Resume Workout
                </button>
                <button
                  onClick={onFinish}
                  disabled={isFinishing}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {isFinishing ? 'Saving…' : 'Finish Early'}
                </button>
              </>
            );
          })()
        ) : (
          <>
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
            <div className="flex gap-2 justify-center">
              {showPicker && (
                <ExercisePicker
                  existingExercises={exercises}
                  onAddExercise={handleAddExercise}
                  dayType={dayType}
                  autoOpen
                  onClose={() => setShowPicker(false)}
                />
              )}
              {!showPicker && (
                <>
                  <button
                    onClick={() => setShowPicker(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
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
              className="btn-brutalist btn-primary self-stretch py-4 text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isResuming ? 'Resume Workout' : `Start Workout (${exercises.length} exercises)`}
            </button>

            {/* Skip exercises */}
            {onSkipExercises && (
              <button
                onClick={onSkipExercises}
                className="mx-auto block py-2 text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Skip exercises →
              </button>
            )}
          </>
        )}
      </div>

      {/* Info text */}
      {!activeSession && (
        <p className="text-[11px] text-muted-foreground text-center">
          Tap any exercise to adjust sets, reps, weight, or duration
        </p>
      )}
    </div>
  );
}
