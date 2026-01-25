import { useState, useEffect, useCallback } from 'react';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import { RestTimer } from '@/components/ui/RestTimer';
import { getExerciseTaxonomy } from '@/lib/exerciseTaxonomy';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface PersonalRecord {
  maxWeight: number;
  reps: string;
  date: string;
}

interface SetLoggerV3Props {
  exercise: WorkoutExercise;
  exerciseIndex: number;
  totalExercises: number;
  dayName: string;
  weekNumber: number;
  onChange: (exercise: WorkoutExercise) => void;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  isFirst: boolean;
  isLast: boolean;
  personalRecord?: PersonalRecord;
  lastWeekData?: { weight: number; reps: number };
}

// Generate weight options around a base value
function generateWeightOptions(baseWeight: number): number[] {
  const base = parseFloat(String(baseWeight)) || 30;
  const step = base > 50 ? 5 : 2.5;
  const options: number[] = [];
  
  for (let i = -2; i <= 2; i++) {
    const weight = base + (i * step);
    if (weight > 0) options.push(weight);
  }
  
  return options;
}

// Generate rep options
function generateRepOptions(): number[] {
  return [6, 7, 8, 9, 10, 11, 12];
}

export function SetLoggerV3({
  exercise,
  exerciseIndex,
  totalExercises,
  dayName,
  weekNumber,
  onChange,
  onNext,
  onPrev,
  onComplete,
  isFirst,
  isLast,
  personalRecord,
  lastWeekData,
}: SetLoggerV3Props) {
  // Find the current set to log (first incomplete set)
  const currentSetIndex = exercise.sets.findIndex(s => !s.completed);
  const currentSet = currentSetIndex >= 0 ? exercise.sets[currentSetIndex] : null;
  const allSetsComplete = currentSetIndex === -1;
  
  // State for current selection
  const [selectedWeight, setSelectedWeight] = useState<number>(0);
  const [selectedReps, setSelectedReps] = useState<number>(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [justLoggedSet, setJustLoggedSet] = useState<{ setNum: number; weight: number; reps: number } | null>(null);

  // Get exercise taxonomy for display
  const taxonomy = getExerciseTaxonomy(exercise.name);
  const primaryMuscle = taxonomy?.primaryMuscles?.[0] || exercise.category;

  // Initialize selection based on target or last set
  useEffect(() => {
    if (currentSet) {
      const targetWeight = parseFloat(currentSet.targetWeight) || 30;
      const targetReps = parseInt(currentSet.targetReps?.split('-')[0] || '8') || 8;
      
      // If there was a previous set, use its values
      const prevSetIndex = currentSetIndex - 1;
      if (prevSetIndex >= 0 && exercise.sets[prevSetIndex].completed) {
        const prevSet = exercise.sets[prevSetIndex];
        setSelectedWeight(parseFloat(prevSet.actualWeight) || targetWeight);
        setSelectedReps(parseInt(prevSet.actualReps) || targetReps);
      } else {
        setSelectedWeight(targetWeight);
        setSelectedReps(targetReps);
      }
    }
    setShowRestTimer(false);
    setJustLoggedSet(null);
  }, [currentSetIndex, exercise.name]);

  const handleLogSet = useCallback(() => {
    if (!currentSet || currentSetIndex < 0) return;

    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[currentSetIndex] = {
      ...updated.sets[currentSetIndex],
      actualWeight: String(selectedWeight),
      actualReps: String(selectedReps),
      completed: true,
    };
    
    onChange(updated);
    setJustLoggedSet({ setNum: currentSetIndex + 1, weight: selectedWeight, reps: selectedReps });
    
    // Show rest timer if not the last set
    if (currentSetIndex < exercise.sets.length - 1) {
      setShowRestTimer(true);
    }
  }, [currentSet, currentSetIndex, exercise, selectedWeight, selectedReps, onChange]);

  const handleRestComplete = () => {
    setShowRestTimer(false);
    setJustLoggedSet(null);
  };

  const weightOptions = generateWeightOptions(parseFloat(currentSet?.targetWeight || '30'));
  const repOptions = generateRepOptions();

  // Completed sets display
  const completedSets = exercise.sets.filter(s => s.completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-h2 font-bold">{dayName}</div>
          <div className="label-v3">WEEK {weekNumber} · DAY {exerciseIndex + 1}</div>
        </div>
      </div>

      <div className="divider-v3" />

      {/* Exercise info */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-h2 font-bold uppercase">{exercise.name}</div>
          <div className="label-v3">PRIMARY {primaryMuscle?.toUpperCase()}</div>
        </div>
        <div className="text-right">
          <div className="text-h3 font-bold tabular-nums">
            SET {allSetsComplete ? exercise.sets.length : currentSetIndex + 1}/{exercise.sets.length}
          </div>
        </div>
      </div>

      {/* Completed sets */}
      {completedSets.length > 0 && (
        <div className="space-y-1">
          {completedSets.map((set, idx) => (
            <div key={idx} className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Check className="h-3 w-3" />
              SET {set.setNumber}: {set.actualWeight}KG × {set.actualReps}
            </div>
          ))}
        </div>
      )}

      {/* Rest Timer */}
      {showRestTimer && (
        <RestTimer 
          initialSeconds={150}
          onSkip={handleRestComplete}
          onComplete={handleRestComplete}
        />
      )}

      {/* Set input (only show if not resting and not all complete) */}
      {!showRestTimer && !allSetsComplete && currentSet && (
        <>
          {/* Weight selection */}
          <div className="space-y-2">
            <div className="label-v3">WEIGHT (KG)</div>
            <ToggleGroup
              value={selectedWeight}
              options={weightOptions}
              onChange={(v) => setSelectedWeight(v as number)}
            />
          </div>

          {/* Reps selection */}
          <div className="space-y-2">
            <div className="label-v3">REPS</div>
            <ToggleGroup
              value={selectedReps}
              options={repOptions}
              onChange={(v) => setSelectedReps(v as number)}
            />
          </div>

          {/* Current selection display */}
          <div className="text-center py-4 border border-border">
            <div className="text-h1 font-bold tabular-nums">
              {selectedWeight}KG × {selectedReps} REPS
            </div>
            {lastWeekData && (
              <div className="label-v3 mt-2">
                LAST WEEK: {lastWeekData.weight}KG × {lastWeekData.reps}
              </div>
            )}
          </div>

          {/* Log button */}
          <button 
            onClick={handleLogSet}
            className="btn-v3 btn-v3-primary w-full py-4"
          >
            LOG SET
          </button>

          {/* Form cue (minimal) */}
          {taxonomy && (
            <div className="text-sm text-muted-foreground border-l-2 border-border pl-4">
              {taxonomy.movementPattern === 'push' && 'KEEP ELBOWS AT 45°'}
              {taxonomy.movementPattern === 'pull' && 'INITIATE WITH LATS'}
              {taxonomy.movementPattern === 'hinge' && 'MAINTAIN NEUTRAL SPINE'}
              {taxonomy.movementPattern === 'squat' && 'KNEES TRACK OVER TOES'}
            </div>
          )}
        </>
      )}

      {/* All sets complete */}
      {allSetsComplete && !showRestTimer && (
        <div className="text-center py-8">
          <div className="text-h2 font-bold">EXERCISE COMPLETE</div>
          <div className="label-v3 mt-2">
            {completedSets.length} SETS LOGGED
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-4">
        {!isFirst && (
          <button onClick={onPrev} className="btn-v3 flex-1 flex items-center justify-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            PREV
          </button>
        )}
        
        {isLast ? (
          <button 
            onClick={onComplete}
            className="btn-v3 btn-v3-primary flex-1"
            disabled={completedSets.length === 0}
          >
            FINISH WORKOUT
          </button>
        ) : (
          <button 
            onClick={onNext}
            className="btn-v3 btn-v3-primary flex-1 flex items-center justify-center gap-1"
          >
            NEXT
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
