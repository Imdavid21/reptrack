import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkoutDetails } from '@/hooks/useWorkoutDetails';
import { format } from 'date-fns';
import { parseDateKey } from '@/lib/dateKey';
import { Check, Edit2, Loader2, Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddExerciseSheet, NewSetRow } from '@/components/workout/AddExerciseSheet';

interface InlineEdit {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

export default function WorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const {
    workout,
    isLoading,
    updateExercise,
    isUpdatingExercise,
    deleteExercise,
    deleteExerciseGroup,
    renameExerciseGroup,
    createExercise
  } = useWorkoutDetails(workoutId || null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<InlineEdit | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<{ baseName: string; value: string } | null>(null);

  if (isLoading) {
    return (
      <MainLayout showBack backTo="/app/history">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!workout) {
    return (
      <MainLayout showBack backTo="/app/history">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Workout not found</p>
          <Button
            variant="link"
            onClick={() => navigate('/app/history')}
            className="mt-2"
          >
            Back to History
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Group exercises by base name
  const groupedExercises = workout.exercises.reduce((acc, ex) => {
    const baseName = ex.name.replace(/ \(Set \d+\)$/, '');
    if (!acc[baseName]) {
      acc[baseName] = [];
    }
    acc[baseName].push(ex);
    return acc;
  }, {} as Record<string, typeof workout.exercises>);

  const handleStartInlineEdit = (set: typeof workout.exercises[0]) => {
    setEditingSet({
      id: set.id,
      weight: set.actual_weight || set.target_weight || '',
      reps: set.actual_reps || set.target_reps || '',
      completed: set.completed,
    });
  };

  const handleSaveInlineEdit = async () => {
    if (!editingSet) return;
    try {
      await updateExercise({
        id: editingSet.id,
        actual_weight: editingSet.weight,
        actual_reps: editingSet.reps,
        completed: editingSet.completed,
      });
      toast.success('Updated');
      setEditingSet(null);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleCancelInlineEdit = () => {
    setEditingSet(null);
  };

  const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    try {
      await deleteExercise(exerciseToDelete);
      toast.success('Set deleted');
      setExerciseToDelete(null);
    } catch (error) {
      toast.error('Failed to delete set');
    }
  };

  const handleAddExercise = async (exercise: { name: string; category: string; sets: NewSetRow[] }) => {
    if (!workoutId) return;
    try {
      const currentMaxOrder = Math.max(...workout.exercises.map(e => e.sort_order), 0);
      await Promise.all(
        exercise.sets.map((set, idx) =>
          createExercise({
            workout_id: workoutId,
            name: `${exercise.name} (Set ${idx + 1})`,
            category: exercise.category,
            target_weight: set.weight,
            target_reps: set.reps,
            actual_weight: set.weight,
            actual_reps: set.reps,
            completed: Boolean(set.reps?.trim()),
            sort_order: currentMaxOrder + 100 + idx,
          })
        )
      );
      toast.success(`Added ${exercise.name}`);
      setIsAddSheetOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to add exercise');
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    const ids = (groupedExercises[groupToDelete] || []).map(s => s.id);
    try {
      await deleteExerciseGroup(ids);
      toast.success('Exercise deleted');
      setGroupToDelete(null);
    } catch (e) {
      toast.error('Failed to delete exercise');
    }
  };

  const handleSaveRename = async () => {
    if (!renamingGroup) return;
    const nextName = renamingGroup.value.trim();
    const sets = groupedExercises[renamingGroup.baseName] || [];
    if (!nextName || nextName === renamingGroup.baseName) {
      setRenamingGroup(null);
      return;
    }
    try {
      await renameExerciseGroup({
        updates: sets.map((set, idx) => ({ id: set.id, name: `${nextName} (Set ${idx + 1})` })),
      });
      toast.success('Exercise renamed');
      setRenamingGroup(null);
    } catch (e) {
      toast.error('Failed to rename exercise');
    }
  };

  const handleAddSet = async (baseName: string, sets: typeof workout.exercises) => {
    if (!workoutId) return;
    const lastSet = sets[sets.length - 1];
    const nextSetNum = sets.length + 1;
    const currentMaxOrder = Math.max(...workout.exercises.map(e => e.sort_order), 0);
    const weight = lastSet?.actual_weight || lastSet?.target_weight || '';
    const reps = lastSet?.actual_reps || lastSet?.target_reps || '';
    try {
      await createExercise({
        workout_id: workoutId,
        name: `${baseName} (Set ${nextSetNum})`,
        category: lastSet?.category || 'Other',
        target_weight: weight,
        target_reps: reps,
        actual_weight: weight,
        actual_reps: reps,
        completed: Boolean(reps),
        sort_order: currentMaxOrder + 1,
      });
      toast.success('Set added');
    } catch (e) {
      toast.error('Failed to add set');
    }
  };

  const completedCount = workout.exercises.filter(e => e.completed).length;
  const totalCount = workout.exercises.length;

  return (
    <MainLayout showBack backTo="/app/history">
      <div className="space-y-5 animate-fade-in pb-20">
        {/* Workout Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{workout.day_name}</h2>
            <p className="text-sm text-muted-foreground">
              {format(parseDateKey(workout.date), 'EEEE, MMM d')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-1">
              <span className="text-lg font-bold tabular-nums">{completedCount}/{totalCount}</span>
              <p className="text-xs text-muted-foreground">Sets</p>
            </div>
            <button
              className={cn(
                isEditMode ? 'h-8 px-3' : 'h-8 w-8 justify-center',
                'rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
                isEditMode
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setIsEditMode(!isEditMode)}
              aria-label={isEditMode ? 'Done editing workout' : 'Edit workout'}
              title={isEditMode ? 'Done' : 'Edit workout'}
            >
              {isEditMode ? <><Check className="h-3.5 w-3.5" />Done</> : <Edit2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-3">
          {Object.entries(groupedExercises).map(([baseName, sets]) => (
            <div key={baseName} className="card-brutalist space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {renamingGroup?.baseName === baseName ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={renamingGroup.value}
                        onChange={(e) => setRenamingGroup(prev => prev ? { ...prev, value: e.target.value } : null)}
                        className="h-8 text-sm"
                        autoFocus
                        aria-label="Exercise name"
                      />
                      <button
                        onClick={handleSaveRename}
                        className="h-7 w-7 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                        aria-label="Save name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingGroup(null)}
                        className="h-7 w-7 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center"
                        aria-label="Cancel rename"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-semibold text-sm truncate">{baseName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {sets[0].category} · {sets.filter(s => s.completed).length}/{sets.length} done
                      </p>
                    </>
                  )}
                </div>
                {isEditMode && renamingGroup?.baseName !== baseName && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setRenamingGroup({ baseName, value: baseName })}
                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={`Rename ${baseName}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setGroupToDelete(baseName)}
                      className="h-7 w-7 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`Delete ${baseName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sets table */}
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-1.5 px-1 text-xs text-muted-foreground  tracking-wider">
                  <span className="text-center">#</span>
                  <span className="text-center">Weight</span>
                  <span className="text-center">Reps</span>
                  <span></span>
                </div>

                {sets.map((set, idx) => {
                  const isEditing = editingSet?.id === set.id;

                  return (
                    <div
                      key={set.id}
                      className={cn(
                        'grid grid-cols-[2rem_1fr_1fr_2rem] gap-1.5 items-center p-1.5 rounded-lg transition-all',
                        set.completed && !isEditing && 'bg-energy/5',
                        isEditing && 'bg-muted ring-1 ring-ring',
                        !isEditing && 'cursor-pointer hover:bg-muted/50',
                        isEditMode && !isEditing && 'border border-dashed border-border'
                      )}
                      onClick={() => {
                        if (!isEditing) handleStartInlineEdit(set);
                      }}
                    >
                      {/* Set number */}
                      <div className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium mx-auto',
                        set.completed ? 'bg-energy text-energy-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        {set.completed ? <Check className="h-3 w-3" /> : idx + 1}
                      </div>

                      {/* Weight */}
                      {isEditing ? (
                        <Input
                          value={editingSet.weight}
                          onChange={(e) => setEditingSet(prev => prev ? { ...prev, weight: e.target.value } : null)}
                          className="h-7 text-xs text-center"
                          inputMode="decimal"
                          autoFocus
                        />
                      ) : (
                        <div className="text-xs text-center tabular-nums">
                          {set.actual_weight || <span className="text-muted-foreground">{set.target_weight || '-'}</span>}
                        </div>
                      )}

                      {/* Reps */}
                      {isEditing ? (
                        <Input
                          value={editingSet.reps}
                          onChange={(e) => setEditingSet(prev => prev ? { ...prev, reps: e.target.value } : null)}
                          className="h-7 text-xs text-center"
                          inputMode="numeric"
                        />
                      ) : (
                        <div className="text-xs text-center tabular-nums">
                          {set.actual_reps || <span className="text-muted-foreground">{set.target_reps || '-'}</span>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-center">
                        {isEditing ? (
                          <div className="flex gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSaveInlineEdit(); }}
                              className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancelInlineEdit(); }}
                              className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : isEditMode ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExerciseToDelete(set.id); }}
                            className="h-6 w-6 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {isEditMode && (
                <button
                  onClick={() => handleAddSet(baseName, sets)}
                  className="w-full mt-1 py-1.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Set
                </button>
              )}
            </div>
          ))}

          {Object.keys(groupedExercises).length === 0 && (
            <div className="text-center py-8 text-muted-foreground italic text-sm">
              No exercises logged
            </div>
          )}

          {/* Add exercise button - always visible in edit mode */}
          {isEditMode && (
            <button
              className="w-full py-3 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center gap-2 transition-colors"
              onClick={() => setIsAddSheetOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </button>
          )}
        </div>

        {/* Tap to edit hint */}
        {!isEditMode && Object.keys(groupedExercises).length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Tap any set to edit weight & reps. Use Edit to add, rename or delete exercises.
          </p>
        )}

        <AddExerciseSheet
          open={isAddSheetOpen}
          onOpenChange={setIsAddSheetOpen}
          onAdd={handleAddExercise}
        />

        {/* Delete Exercise Confirmation */}
        <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {groupToDelete}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the exercise and all of its sets from this workout.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!exerciseToDelete} onOpenChange={(open) => !open && setExerciseToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Set?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this set from your workout.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteExercise} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
