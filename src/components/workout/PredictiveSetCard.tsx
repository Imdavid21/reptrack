import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { Check, Trophy, TrendingUp, Minus } from 'lucide-react';
import { useSetPrediction, useLastWeekPerformance } from '@/hooks/useSetPrediction';

interface SetData {
  setNumber: number;
  targetWeight: string;
  targetReps: string;
  actualWeight: string;
  actualReps: string;
  completed: boolean;
}

interface PredictiveSetCardProps {
  exerciseName: string;
  set: SetData;
  setIndex: number;
  personalRecord?: { maxWeight: number; reps: string };
  onUpdate: (weight: string, reps: string, completed: boolean) => void;
  onRemove?: () => void;
  canRemove: boolean;
}

export function PredictiveSetCard({
  exerciseName,
  set,
  setIndex,
  personalRecord,
  onUpdate,
  onRemove,
  canRemove,
}: PredictiveSetCardProps) {
  const prediction = useSetPrediction(exerciseName, set.setNumber);
  const { data: lastWeek } = useLastWeekPerformance(exerciseName);

  // Initialize with prediction or existing values
  const [selectedWeight, setSelectedWeight] = useState<string>(
    set.actualWeight || prediction.weight.toString()
  );
  const [selectedReps, setSelectedReps] = useState<string>(
    set.actualReps || prediction.reps.toString()
  );

  // Update when prediction changes (for new sets)
  useEffect(() => {
    if (!set.actualWeight && prediction.weight) {
      setSelectedWeight(prediction.weight.toString());
    }
    if (!set.actualReps && prediction.reps) {
      setSelectedReps(prediction.reps.toString());
    }
  }, [prediction.weight, prediction.reps, set.actualWeight, set.actualReps]);

  const handleConfirm = () => {
    haptic('medium');
    onUpdate(selectedWeight, selectedReps, true);
  };

  const handleWeightChange = (value: string) => {
    if (!value) return;
    haptic('light');
    setSelectedWeight(value);
    
    // Auto-adjust reps when weight increases significantly
    const newWeight = parseFloat(value);
    const predWeight = prediction.weight;
    if (newWeight > predWeight + 2.5) {
      // Reduce expected reps for heavier weight
      const adjustedReps = Math.max(6, prediction.reps - 1);
      setSelectedReps(adjustedReps.toString());
    }
  };

  const handleRepsChange = (value: string) => {
    if (!value) return;
    haptic('light');
    setSelectedReps(value);
  };

  const currentWeight = parseFloat(selectedWeight) || 0;
  const isNewPR = personalRecord && currentWeight > personalRecord.maxWeight && set.completed;
  const isProgressiveOverload = prediction.reason === 'progressive_overload';

  // Last week's same set for reference
  const lastWeekSet = lastWeek?.[setIndex];

  return (
    <div className={cn(
      'border border-border p-4 space-y-4',
      set.completed && 'bg-primary/5 border-primary/30'
    )}>
      {/* Set Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tabular-nums">SET {set.setNumber}</span>
          {isProgressiveOverload && !set.completed && (
            <span className="flex items-center gap-1 text-xs text-primary px-2 py-0.5 bg-primary/10">
              <TrendingUp className="h-3 w-3" />
              PUSH
            </span>
          )}
          {isNewPR && (
            <span className="flex items-center gap-1 text-xs text-primary px-2 py-0.5 bg-primary/10">
              <Trophy className="h-3 w-3" />
              NEW PR
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {lastWeekSet && (
            <span className="text-xs text-muted-foreground">
              Last: {lastWeekSet.weight}×{lastWeekSet.reps}
            </span>
          )}
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRemove}
            >
              <Minus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {set.completed ? (
        // Completed state - show summary
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border bg-primary border-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold tabular-nums">
                {set.actualWeight}kg × {set.actualReps}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate(selectedWeight, selectedReps, false)}
            className="text-xs text-muted-foreground"
          >
            EDIT
          </Button>
        </div>
      ) : (
        // Input state - toggle buttons
        <>
          {/* Weight Selection */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              WEIGHT (KG)
            </label>
            <ToggleGroup
              type="single"
              value={selectedWeight}
              onValueChange={handleWeightChange}
              className="flex flex-wrap gap-1 justify-start"
            >
              {prediction.weightOptions.map((w) => (
                <ToggleGroupItem
                  key={w}
                  value={w.toString()}
                  className={cn(
                    'min-w-[50px] h-10 text-sm font-medium border',
                    selectedWeight === w.toString() 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {w}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Reps Selection */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              REPS
            </label>
            <ToggleGroup
              type="single"
              value={selectedReps}
              onValueChange={handleRepsChange}
              className="flex flex-wrap gap-1 justify-start"
            >
              {prediction.repOptions.map((r) => (
                <ToggleGroupItem
                  key={r}
                  value={r.toString()}
                  className={cn(
                    'min-w-[40px] h-10 text-sm font-medium border',
                    selectedReps === r.toString() 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {r}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            className="w-full btn-brutalist btn-primary h-12"
          >
            <Check className="h-4 w-4 mr-2" />
            CONFIRM {selectedWeight}KG × {selectedReps}
          </Button>
        </>
      )}
    </div>
  );
}
