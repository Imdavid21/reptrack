import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkoutDetails } from '@/hooks/useWorkoutDetails';
import { EditExerciseDialog } from '@/components/workout/EditExerciseDialog';
import { format } from 'date-fns';
import { Check, Edit2, Loader2, Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { AddExerciseSheet } from '@/components/workout/AddExerciseSheet'; // We need this component

export default function WorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const {
    workout,
    isLoading,
    updateExercise,
    isUpdatingExercise,
    deleteExercise,
    createExercise
  } = useWorkoutDetails(workoutId || null);

  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <MainLayout title="WORKOUT" showBack backTo="/app/history">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!workout) {
    return (
      <MainLayout title="WORKOUT" showBack backTo="/app/history">
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

  // Group exercises by base name (without set number)
  // When in Edit Mode, we visualize sets individually to allow deletion
  // But grouping usually looks better. 
  // Let's keep grouping but add delete buttons to individual sets
  const groupedExercises = workout.exercises.reduce((acc, ex) => {
    const baseName = ex.name.replace(/ \(Set \d+\)$/, '');
    if (!acc[baseName]) {
      acc[baseName] = [];
    }
    acc[baseName].push(ex);
    return acc;
  }, {} as Record<string, typeof workout.exercises>);

  const handleSaveExercise = async (data: {
    id: string;
    actual_weight: string;
    actual_reps: string;
    completed: boolean;
  }) => {
    try {
      await updateExercise(data);
      toast.success('Exercise updated');
    } catch (error) {
      toast.error('Failed to update exercise');
      throw error;
    }
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

  const handleAddExercise = async (exercise: { name: string; category: string; targetReps: string; targetWeight: string; sets: number }) => {
    if (!workoutId) return;
    try {
      // Add multiple sets
      const currentMaxOrder = Math.max(...workout.exercises.map(e => e.sort_order), 0);

      const promises = Array.from({ length: exercise.sets }).map((_, idx) => {
        return createExercise({
          workout_id: workoutId,
          name: `${exercise.name} (Set ${idx + 1})`,
          category: exercise.category,
          target_weight: exercise.targetWeight,
          target_reps: exercise.targetReps,
          sort_order: currentMaxOrder + 100 + idx, // Simple ordering strategy
        });
      });

      await Promise.all(promises);
      toast.success(`Added ${exercise.name}`);
      setIsAddSheetOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to add exercise');
    }
  };

  return (
    <MainLayout title={workout.day_name.toUpperCase()} showBack backTo="/app/history">
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Workout Header */}
        <div className="card-brutalist relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h2 className="font-bold text-lg">{workout.day_name}</h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(workout.date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isEditMode ? "default" : "outline"}
                className={cn("h-8 gap-2", isEditMode && "bg-primary text-primary-foreground")}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                {isEditMode ? 'Done' : 'Edit'}
              </Button>
            </div>
          </div>
          {isEditMode && (
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          )}
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          <h3 className="section-header flex justify-between items-center">
            EXERCISES
            {isEditMode && (
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setIsAddSheetOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            )}
          </h3>

          {Object.entries(groupedExercises).map(([baseName, sets]) => (
            <div key={baseName} className="card-brutalist space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{baseName}</h4>
                  <p className="text-xs text-muted-foreground">
                    {sets[0].category} • {sets.length} set{sets.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-sm">
                  {sets.filter(s => s.completed).length}/{sets.length} done
                </div>
              </div>

              <div className="space-y-2">
                {sets.map((set, idx) => (
                  <div
                    key={set.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded border transition-colors',
                      set.completed ? 'bg-primary/5 border-primary/30' : 'border-border',
                      isEditMode && "border-dashed"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center text-xs transition-transform',
                        set.completed ? 'bg-primary text-primary-foreground' : 'bg-muted',
                        isEditMode && "scale-0 w-0 h-0 overflow-hidden m-0"
                      )}>
                        {set.completed ? <Check className="h-3 w-3" /> : idx + 1}
                      </div>

                      {isEditMode && (
                        <div className="h-6 w-6 flex items-center justify-center text-muted-foreground text-xs font-mono">
                          #{idx + 1}
                        </div>
                      )}

                      <div className="text-sm">
                        <span className="font-mono">
                          {set.actual_weight || set.target_weight || '-'}
                        </span>
                        <span className="text-muted-foreground mx-1">×</span>
                        <span className="font-mono">
                          {set.actual_reps || set.target_reps || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditMode ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setExerciseToDelete(set.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingExercise(set)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {groupedExercises && Object.keys(groupedExercises).length === 0 && (
            <div className="text-center py-8 text-muted-foreground italic">
              No exercises logged.
            </div>
          )}

          {isEditMode && (
            <Button className="w-full border-dashed" variant="outline" onClick={() => setIsAddSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Selection
            </Button>
          )}
        </div>

        {/* Habits Summary */}
        {workout.habits && (
          <div className="space-y-4">
            <h3 className="section-header">HABITS</h3>
            <div className="card-brutalist">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {workout.habits.pullups}
                  </div>
                  <div className="text-xs text-muted-foreground">PULL-UPS</div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {workout.habits.water_intake}L
                  </div>
                  <div className="text-xs text-muted-foreground">WATER</div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {workout.habits.sleep_hours}h
                  </div>
                  <div className="text-xs text-muted-foreground">SLEEP</div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {workout.habits.energy_level}/10
                  </div>
                  <div className="text-xs text-muted-foreground">ENERGY</div>
                </div>
              </div>
              {workout.habits.bodyweight && (
                <div className="mt-4 pt-4 border-t">
                  <span className="text-muted-foreground text-sm">Bodyweight: </span>
                  <span className="font-mono">{workout.habits.bodyweight}kg</span>
                </div>
              )}
              {workout.habits.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{workout.habits.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <EditExerciseDialog
          exercise={editingExercise}
          open={!!editingExercise}
          onOpenChange={(open) => !open && setEditingExercise(null)}
          onSave={handleSaveExercise}
          isSaving={isUpdatingExercise}
        />

        {/* Add Exercise Sheet (placeholder import until implemented) */}
        {/* We need to implement AddExerciseSheet or reuse an existing component */}
        <AddExerciseSheet
          open={isAddSheetOpen}
          onOpenChange={setIsAddSheetOpen}
          onAdd={handleAddExercise}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!exerciseToDelete} onOpenChange={(open) => !open && setExerciseToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Set?</AlertDialogTitle>
              <AlertDialogDescription>
                This will check off this set from your workout.
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
