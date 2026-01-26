import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, ChevronUp, ChevronDown, Minus, Trophy } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { ExerciseSet } from '@/hooks/useWorkouts';
import { useLastWeekSets, calculateSmartDefault, LastWeekSet } from '@/hooks/useLastWeekSets';
import { format } from 'date-fns';

interface PersonalRecord {
  maxWeight: number;
  reps: string;
  date: string;
}

interface QuickSetLoggerProps {
  exerciseName: string;
  sets: ExerciseSet[];
  personalRecord?: PersonalRecord;
  onSetComplete: (setIndex: number, weight: number, reps: number) => void;
  onSetRemove: (setIndex: number) => void;
  onAddSet: () => void;
}

// Weight options - common increments
const WEIGHT_OPTIONS = [
  5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40,
  42.5, 45, 47.5, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120
];

// Rep options
const REP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20];

export function QuickSetLogger({
  exerciseName,
  sets,
  personalRecord,
  onSetComplete,
  onSetRemove,
  onAddSet,
}: QuickSetLoggerProps) {
  const { data: lastWeekData, isLoading } = useLastWeekSets(exerciseName);
  
  // Find first incomplete set
  const currentSetIndex = sets.findIndex(s => !s.completed);
  const currentSet = currentSetIndex >= 0 ? sets[currentSetIndex] : null;
  
  // Calculate smart default for current set
  const smartDefault = lastWeekData?.sets
    ? calculateSmartDefault(lastWeekData.sets, currentSetIndex + 1)
    : { weight: parseFloat(currentSet?.targetWeight || '30') || 30, reps: parseInt(currentSet?.targetReps || '9') || 9, source: 'default' as const };

  const [selectedWeight, setSelectedWeight] = useState(smartDefault.weight);
  const [selectedReps, setSelectedReps] = useState(smartDefault.reps);

  // Update selections when smart default changes
  useEffect(() => {
    setSelectedWeight(smartDefault.weight);
    setSelectedReps(smartDefault.reps);
  }, [smartDefault.weight, smartDefault.reps, currentSetIndex]);

  // Check if current selection is a PR
  const isNewPR = personalRecord && selectedWeight > personalRecord.maxWeight;

  const handleLogSet = () => {
    if (currentSetIndex < 0) return;
    haptic('success');
    onSetComplete(currentSetIndex, selectedWeight, selectedReps);
  };

  const adjustWeight = (delta: number) => {
    haptic('light');
    const currentIdx = WEIGHT_OPTIONS.findIndex(w => w >= selectedWeight);
    const newIdx = Math.max(0, Math.min(WEIGHT_OPTIONS.length - 1, currentIdx + delta));
    setSelectedWeight(WEIGHT_OPTIONS[newIdx]);
  };

  const adjustReps = (delta: number) => {
    haptic('light');
    const currentIdx = REP_OPTIONS.findIndex(r => r >= selectedReps);
    const newIdx = Math.max(0, Math.min(REP_OPTIONS.length - 1, currentIdx + delta));
    setSelectedReps(REP_OPTIONS[newIdx]);
  };

  const completedSets = sets.filter(s => s.completed);
  const allDone = currentSetIndex < 0;

  return (
    <div className="space-y-4">
      {/* Last Week Context */}
      {lastWeekData && lastWeekData.sets.length > 0 && (
        <div className="text-sm text-muted-foreground p-3 bg-muted/30 border border-border">
          <div className="font-medium mb-1">LAST WEEK ({format(new Date(lastWeekData.lastPerformed), 'MMM d')})</div>
          <div className="font-mono text-xs">
            {lastWeekData.sets.map((s, i) => (
              <span key={i}>
                {i > 0 && ', '}
                <span className={cn(
                  s.reps >= 10 && 'text-primary',
                  s.reps < 8 && 'text-muted-foreground/70'
                )}>
                  {s.weight}kg × {s.reps}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Completed Sets Summary */}
      {completedSets.length > 0 && (
        <div className="space-y-1">
          {completedSets.map((set, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 bg-primary/5 border border-primary/30"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-medium">Set {idx + 1}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg">
                  {set.actualWeight}kg × {set.actualReps}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onSetRemove(idx)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Set Input */}
      {currentSet && (
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-sm text-muted-foreground">SET {currentSetIndex + 1}</span>
          </div>

          {/* PR Indicator */}
          {isNewPR && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 border border-primary text-primary">
              <Trophy className="h-4 w-4" />
              <span className="font-bold">NEW PR!</span>
            </div>
          )}

          {/* Weight & Reps Selectors */}
          <div className="grid grid-cols-2 gap-4">
            {/* Weight Selector */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground text-center block">WEIGHT (KG)</label>
              <div className="flex flex-col items-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full h-12 border-border"
                  onClick={() => adjustWeight(1)}
                >
                  <ChevronUp className="h-6 w-6" />
                </Button>
                <div 
                  className={cn(
                    "w-full h-24 flex items-center justify-center border-x border-border transition-colors",
                    smartDefault.source === 'history' && selectedWeight === smartDefault.weight
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  )}
                >
                  <span className="text-5xl font-bold tabular-nums">{selectedWeight}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full h-12 border-border"
                  onClick={() => adjustWeight(-1)}
                >
                  <ChevronDown className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* Reps Selector */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground text-center block">REPS</label>
              <div className="flex flex-col items-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full h-12 border-border"
                  onClick={() => adjustReps(1)}
                >
                  <ChevronUp className="h-6 w-6" />
                </Button>
                <div 
                  className={cn(
                    "w-full h-24 flex items-center justify-center border-x border-border transition-colors",
                    smartDefault.source === 'history' && selectedReps === smartDefault.reps
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  )}
                >
                  <span className="text-5xl font-bold tabular-nums">{selectedReps}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full h-12 border-border"
                  onClick={() => adjustReps(-1)}
                >
                  <ChevronDown className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Smart Default Indicator */}
          {smartDefault.source === 'history' && (
            <div className="text-center text-xs text-muted-foreground">
              {selectedWeight === smartDefault.weight && selectedReps === smartDefault.reps
                ? '✓ Smart default from last week'
                : 'Adjusted from smart default'}
            </div>
          )}

          {/* Log Set Button - Large Tap Target */}
          <Button
            onClick={handleLogSet}
            className="w-full h-16 text-xl font-bold btn-brutalist btn-primary"
          >
            <Check className="h-6 w-6 mr-2" />
            LOG SET
          </Button>
        </div>
      )}

      {/* All Sets Done or Add More */}
      {allDone && (
        <div className="text-center space-y-4 py-4">
          <div className="text-lg font-medium text-primary">
            All {sets.length} sets completed!
          </div>
          <Button
            variant="outline"
            onClick={() => { haptic('light'); onAddSet(); }}
            className="w-full"
          >
            + Add Another Set
          </Button>
        </div>
      )}
    </div>
  );
}
