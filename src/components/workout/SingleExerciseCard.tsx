import { WorkoutExercise } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { useState, useMemo } from 'react';
import { getExerciseTaxonomy } from '@/lib/exerciseTaxonomy';

interface PersonalRecord {
  maxWeight: number;
  reps: string;
  date: string;
}

interface LastWeekSet {
  weight: number;
  reps: number;
}

interface SingleExerciseCardProps {
  exercise: WorkoutExercise;
  exerciseIndex: number;
  totalExercises: number;
  weekNumber: number;
  dayName: string;
  onChange: (exercise: WorkoutExercise) => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirst: boolean;
  isLast: boolean;
  personalRecord?: PersonalRecord;
  lastWeekSets?: LastWeekSet[];
}

// Generate weight options based on context
function generateWeightOptions(lastWeekWeight: number): number[] {
  const baseWeight = lastWeekWeight || 20;
  const step = baseWeight < 20 ? 2.5 : 2.5;
  const options: number[] = [];
  
  // Generate 3 below and 3 above the base weight
  for (let i = -3; i <= 3; i++) {
    const weight = baseWeight + (i * step);
    if (weight > 0) options.push(weight);
  }
  
  return options;
}

// Generate rep options
const REP_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14];

export function SingleExerciseCard({
  exercise,
  exerciseIndex,
  totalExercises,
  weekNumber,
  dayName,
  onChange,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  isFirst,
  isLast,
  personalRecord,
  lastWeekSets = [],
}: SingleExerciseCardProps) {
  // Find the current set being worked on
  const currentSetIndex = exercise.sets.findIndex(s => !s.completed);
  const effectiveSetIndex = currentSetIndex === -1 ? exercise.sets.length - 1 : currentSetIndex;
  const currentSet = exercise.sets[effectiveSetIndex];
  const totalSets = exercise.sets.length;

  // Get taxonomy info for muscle groups
  const taxonomy = getExerciseTaxonomy(exercise.name);
  const primaryMuscle = taxonomy?.primaryMuscles?.[0] || 'Compound';
  const secondaryMuscles = taxonomy?.secondaryMuscles?.slice(0, 2).join(', ') || '';

  // Get last week's average weight for weight options
  const lastWeekAvgWeight = lastWeekSets.length > 0 
    ? lastWeekSets.reduce((sum, s) => sum + s.weight, 0) / lastWeekSets.length
    : parseFloat(currentSet?.targetWeight) || 20;

  const weightOptions = useMemo(() => generateWeightOptions(lastWeekAvgWeight), [lastWeekAvgWeight]);

  // State for current selections
  const [selectedWeight, setSelectedWeight] = useState<number>(() => {
    const lastSetWeight = lastWeekSets[effectiveSetIndex]?.weight;
    return lastSetWeight || parseFloat(currentSet?.targetWeight) || weightOptions[3];
  });

  const [selectedReps, setSelectedReps] = useState<number>(() => {
    const lastSetReps = lastWeekSets[effectiveSetIndex]?.reps;
    return lastSetReps || parseInt(currentSet?.targetReps) || 10;
  });

  // Format last week data string
  const lastWeekString = lastWeekSets.length > 0
    ? lastWeekSets.map(s => `${s.weight}KG × ${s.reps}`).join(', ')
    : 'No data from last week';

  const handleLogSet = () => {
    haptic('medium');
    
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[effectiveSetIndex] = {
      ...updated.sets[effectiveSetIndex],
      actualWeight: selectedWeight.toString(),
      actualReps: selectedReps.toString(),
      completed: true,
    };
    onChange(updated);

    // If this was the last set, trigger next exercise or complete
    if (effectiveSetIndex === totalSets - 1) {
      if (isLast) {
        onComplete();
      } else {
        onNext();
      }
    }
  };

  const handleBack = () => {
    haptic('light');
    if (effectiveSetIndex > 0) {
      // Uncomplete previous set to go back
      const updated = { ...exercise };
      updated.sets = [...updated.sets];
      updated.sets[effectiveSetIndex - 1] = {
        ...updated.sets[effectiveSetIndex - 1],
        completed: false,
      };
      onChange(updated);
    } else if (!isFirst) {
      onPrev();
    }
  };

  const allSetsCompleted = exercise.sets.every(s => s.completed);

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#000000] border-b border-[#2A2A2A] px-4" style={{ height: '60px' }}>
        <div className="flex items-center justify-between h-full">
          <button 
            onClick={handleBack}
            className="p-2 -ml-2"
            disabled={isFirst && effectiveSetIndex === 0}
          >
            <ChevronLeft className={cn(
              "h-6 w-6",
              isFirst && effectiveSetIndex === 0 ? "text-[#3A3A3A]" : "text-white"
            )} />
          </button>
          
          <span 
            className="text-[20px] font-bold tracking-[0.1em] uppercase text-white"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {dayName}
          </span>
          
          <span 
            className="text-[10px] tracking-wide uppercase text-[#7A7A7A]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            WEEK {weekNumber} · EX {exerciseIndex + 1}/{totalExercises}
          </span>
        </div>
      </header>

      {/* Exercise Name Section */}
      <div className="sticky top-[60px] z-30 bg-[#000000] px-4 py-3">
        <h1 
          className="text-[24px] font-semibold tracking-[0.1em] uppercase text-white"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {exercise.name}
        </h1>
        <p className="text-[12px] text-[#7A7A7A] mt-1">
          Primary: {primaryMuscle}{secondaryMuscles && ` · Secondary: ${secondaryMuscles}`}
        </p>
      </div>

      {/* Context Bar - Last Week */}
      <div className="bg-[#1A1A1A] px-4 py-4 mb-6">
        <span 
          className="text-[10px] font-medium tracking-[0.05em] uppercase text-[#9A9A9A] block mb-1"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          LAST WEEK
        </span>
        <span 
          className="text-[12px] text-[#CACACA]"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {lastWeekString}
        </span>
      </div>

      {/* Set Counter */}
      <div className="text-center mb-8">
        <div 
          className="text-[48px] font-bold tabular-nums"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <span className="text-white">{effectiveSetIndex + 1}</span>
          <span className="text-[#3A3A3A]">/</span>
          <span className="text-white">{totalSets}</span>
        </div>
        <span 
          className="text-[10px] font-medium tracking-[0.05em] uppercase text-[#7A7A7A]"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          CURRENT SET
        </span>
      </div>

      {/* Weight Selection */}
      <div className="px-4 mb-8">
        <span 
          className="text-[12px] font-medium tracking-[0.05em] uppercase text-[#9A9A9A] block mb-3"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          WEIGHT (KG)
        </span>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {weightOptions.map((weight) => (
            <button
              key={weight}
              onClick={() => { haptic('light'); setSelectedWeight(weight); }}
              className={cn(
                "flex-shrink-0 w-[100px] h-[100px] flex items-center justify-center transition-colors",
                selectedWeight === weight
                  ? "bg-white text-black"
                  : "bg-[#1A1A1A] text-[#CACACA] border border-[#2A2A2A]"
              )}
            >
              <span 
                className="text-[48px] font-medium tabular-nums"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {weight}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reps Selection */}
      <div className="px-4 mb-8">
        <span 
          className="text-[12px] font-medium tracking-[0.05em] uppercase text-[#9A9A9A] block mb-3"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          REPS
        </span>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {REP_OPTIONS.map((reps) => (
            <button
              key={reps}
              onClick={() => { haptic('light'); setSelectedReps(reps); }}
              className={cn(
                "flex-shrink-0 w-[100px] h-[100px] flex items-center justify-center transition-colors",
                selectedReps === reps
                  ? "bg-white text-black"
                  : "bg-[#1A1A1A] text-[#CACACA] border border-[#2A2A2A]"
              )}
            >
              <span 
                className="text-[48px] font-medium tabular-nums"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {reps}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Spacer to push button to bottom */}
      <div className="flex-1" />

      {/* Confirm Button */}
      <div className="px-4 mb-4">
        <button
          onClick={handleLogSet}
          disabled={allSetsCompleted}
          className={cn(
            "w-full py-6 flex flex-col items-center justify-center transition-colors",
            allSetsCompleted
              ? "bg-[#2A2A2A] text-[#7A7A7A]"
              : "bg-white text-black"
          )}
        >
          <span 
            className="text-[14px] font-medium tracking-[0.05em] uppercase"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {allSetsCompleted ? 'ALL SETS COMPLETE' : 'LOG SET'}
          </span>
          <span 
            className="text-[20px] font-medium tabular-nums mt-1"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {selectedWeight}KG × {selectedReps}
          </span>
        </button>
      </div>

      {/* AI Hint Bar */}
      <div className="bg-[#1A1A1A] px-4 py-4 flex items-start gap-3">
        <span className="text-[#7A7A7A]">💡</span>
        <p className="text-[12px] text-[#7A7A7A] leading-relaxed">
          {taxonomy?.movementPattern === 'push' && 'Keep elbows at 45° for shoulder safety'}
          {taxonomy?.movementPattern === 'pull' && 'Initiate with your back, not your arms'}
          {taxonomy?.movementPattern === 'squat' && 'Drive through your heels, keep chest up'}
          {taxonomy?.movementPattern === 'hinge' && 'Maintain neutral spine, hinge at hips'}
          {!taxonomy?.movementPattern && 'Focus on controlled tempo and full range of motion'}
        </p>
      </div>

      {/* Navigation for completed exercises */}
      {allSetsCompleted && (
        <div className="px-4 py-4 border-t border-[#2A2A2A]">
          <button
            onClick={() => { haptic('medium'); isLast ? onComplete() : onNext(); }}
            className="w-full py-4 bg-white text-black text-center"
          >
            <span 
              className="text-[14px] font-medium tracking-[0.05em] uppercase"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {isLast ? 'FINISH WORKOUT' : 'NEXT EXERCISE'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
