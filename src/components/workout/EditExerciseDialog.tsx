import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  category: string;
  target_weight: string | null;
  target_reps: string | null;
  actual_weight: string | null;
  actual_reps: string | null;
  completed: boolean;
}

interface EditExerciseDialogProps {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (exercise: {
    id: string;
    actual_weight: string;
    actual_reps: string;
    completed: boolean;
  }) => Promise<void>;
  isSaving: boolean;
}

export function EditExerciseDialog({
  exercise,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: EditExerciseDialogProps) {
  const [actualWeight, setActualWeight] = useState(exercise?.actual_weight || '');
  const [actualReps, setActualReps] = useState(exercise?.actual_reps || '');
  const [completed, setCompleted] = useState(exercise?.completed ?? false);

  // Reset state when exercise changes
  useState(() => {
    if (exercise) {
      setActualWeight(exercise.actual_weight || '');
      setActualReps(exercise.actual_reps || '');
      setCompleted(exercise.completed);
    }
  });

  const handleSave = async () => {
    if (!exercise) return;
    await onSave({
      id: exercise.id,
      actual_weight: actualWeight,
      actual_reps: actualReps,
      completed,
    });
    onOpenChange(false);
  };

  if (!exercise) return null;

  // Extract exercise name without set number
  const exerciseName = exercise.name.replace(/ \(Set \d+\)$/, '');
  const setMatch = exercise.name.match(/\(Set (\d+)\)$/);
  const setNumber = setMatch ? setMatch[1] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {exerciseName}
            {setNumber && <span className="text-muted-foreground"> (Set {setNumber})</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Weight</Label>
              <div className="text-sm text-muted-foreground font-mono">
                {exercise.target_weight || '-'}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Reps</Label>
              <div className="text-sm text-muted-foreground font-mono">
                {exercise.target_reps || '-'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actual-weight">Actual Weight</Label>
              <Input
                id="actual-weight"
                value={actualWeight}
                onChange={(e) => setActualWeight(e.target.value)}
                placeholder={exercise.target_weight || 'e.g. 30kg'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-reps">Actual Reps</Label>
              <Input
                id="actual-reps"
                value={actualReps}
                onChange={(e) => setActualReps(e.target.value)}
                placeholder={exercise.target_reps || 'e.g. 10'}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="completed"
              checked={completed}
              onCheckedChange={(checked) => setCompleted(!!checked)}
            />
            <Label htmlFor="completed" className="cursor-pointer">
              Mark as completed
            </Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
