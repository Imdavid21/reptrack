import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkoutDetails } from '@/hooks/useWorkoutDetails';
import { EditExerciseDialog } from '@/components/workout/EditExerciseDialog';
import { format } from 'date-fns';
import { ChevronLeft, Check, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export default function WorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { workout, isLoading, updateExercise, isUpdatingExercise } = useWorkoutDetails(workoutId || null);
  
  const [editingExercise, setEditingExercise] = useState<typeof workout extends { exercises: infer E } ? E extends Array<infer T> ? T : null : null>(null);

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

  return (
    <MainLayout title={workout.day_name.toUpperCase()} showBack backTo="/app/history">
      <div className="space-y-6 animate-fade-in">
        {/* Workout Header */}
        <div className="card-brutalist">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">{workout.day_name}</h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(workout.date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="text-right">
              <span className="badge-brutalist">Week {workout.week_number}</span>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          <h3 className="section-header">EXERCISES</h3>
          
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
                      'flex items-center justify-between p-2 rounded border',
                      set.completed ? 'bg-primary/5 border-primary/30' : 'border-border'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center text-xs',
                        set.completed ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        {set.completed ? <Check className="h-3 w-3" /> : idx + 1}
                      </div>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingExercise(set)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
      </div>
    </MainLayout>
  );
}
