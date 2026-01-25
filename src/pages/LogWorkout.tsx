import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DaySelectorV3, PreWorkoutData } from '@/components/workout/DaySelectorV3';
import { SetLoggerV3 } from '@/components/workout/SetLoggerV3';
import { PostWorkoutV3, PostWorkoutData } from '@/components/workout/PostWorkoutV3';
import { defaultRoutine } from '@/lib/workoutPresets';
import { useWorkouts, WorkoutExercise, Habits, ExerciseSet } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

type Step = 'select-day' | 'exercises' | 'post-checkin';

const defaultHabits: Habits = {
  pullups: 0,
  water_intake: 0,
  sleep_hours: 0,
  energy_level: 5,
  bodyweight: undefined,
  notes: '',
  supplements: {
    whey: false,
    casein: false,
    creatine: false,
    omega3: false,
    vitaminD: false,
    magnesium: false,
    zinc: false,
  },
};

const defaultPreCheckin: PreWorkoutData = {
  energy: 3,
  motivation: 3,
  soreness: 3,
};

const defaultPostCheckin: PostWorkoutData = {
  difficulty: 3,
  satisfaction: 3,
  durationMinutes: undefined,
};

// Parse target reps like "4x8-10" into number of sets and rep range
function parseTargetReps(targetReps: string): { sets: number; reps: string } {
  const match = targetReps.match(/^(\d+)x(.+)$/);
  if (match) {
    return { sets: parseInt(match[1], 10), reps: match[2] };
  }
  return { sets: 3, reps: targetReps };
}

export default function LogWorkout() {
  const navigate = useNavigate();
  const { createWorkout, isCreating } = useWorkouts();
  const { draft, loaded, saveDraft, clearDraft } = useDraftWorkout();
  const { getPRForExercise } = usePersonalRecords();
  
  const [step, setStep] = useState<Step>('select-day');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [habits] = useState<Habits>(defaultHabits);
  const [preCheckin, setPreCheckin] = useState<PreWorkoutData>(defaultPreCheckin);
  const [postCheckin, setPostCheckin] = useState<PostWorkoutData>(defaultPostCheckin);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  // Restore from draft if available
  useEffect(() => {
    if (loaded && draft && !draftRestored && draft.exercises.length > 0) {
      setSelectedDay(draft.day);
      setSelectedDate(new Date(draft.date));
      setWeekNumber(draft.weekNumber);
      setExercises(draft.exercises);
      let validStep: Step = 'exercises';
      if (draft.step === 'select-day') validStep = 'select-day';
      else if (draft.step === 'post-checkin') validStep = 'post-checkin';
      else validStep = 'exercises';
      setStep(validStep);
      setCurrentExerciseIndex(draft.currentExerciseIndex);
      if (draft.preCheckin) setPreCheckin(draft.preCheckin);
      if (draft.postCheckin) setPostCheckin(draft.postCheckin);
      if (draft.workoutStartTime) setWorkoutStartTime(new Date(draft.workoutStartTime));
      setDraftRestored(true);
    }
  }, [loaded, draft, draftRestored]);

  // Auto-save when state changes
  useEffect(() => {
    if (step === 'select-day' || !selectedDay || exercises.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      saveDraft({
        day: selectedDay,
        dayName: defaultRoutine.days[selectedDay]?.name || '',
        date: selectedDate.toISOString(),
        weekNumber,
        exercises,
        habits,
        currentExerciseIndex,
        step,
        preCheckin,
        postCheckin,
        workoutStartTime: workoutStartTime?.toISOString(),
      });
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [exercises, step, currentExerciseIndex, selectedDay, selectedDate, weekNumber, preCheckin, postCheckin, workoutStartTime, habits, saveDraft]);

  const handleDaySelect = (day: string, date: Date, week: number) => {
    setSelectedDay(day);
    setSelectedDate(date);
    setWeekNumber(week);
    
    const dayData = defaultRoutine.days[day];
    if (dayData) {
      setExercises(
        dayData.exercises.map((ex, idx) => {
          const { sets: numSets, reps } = parseTargetReps(ex.targetReps);
          
          const setsArray: ExerciseSet[] = Array.from({ length: numSets }, (_, i) => ({
            setNumber: i + 1,
            targetWeight: ex.targetWeight,
            targetReps: reps,
            actualWeight: '',
            actualReps: '',
            completed: false,
          }));

          return {
            name: ex.name,
            category: ex.category,
            sets: setsArray,
            sort_order: idx,
          };
        })
      );
    }
    
    setCurrentExerciseIndex(0);
    setWorkoutStartTime(new Date());
    setStep('exercises');
  };

  const handleExerciseChange = (updatedExercise: WorkoutExercise) => {
    setExercises(prev => 
      prev.map((ex, idx) => idx === currentExerciseIndex ? updatedExercise : ex)
    );
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  const handleExercisesDone = () => {
    if (workoutStartTime && !postCheckin.durationMinutes) {
      const durationMs = Date.now() - workoutStartTime.getTime();
      const durationMins = Math.round(durationMs / 60000);
      setPostCheckin(prev => ({ ...prev, durationMinutes: durationMins }));
    }
    setStep('post-checkin');
  };

  const handleSubmit = async () => {
    const completedCount = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0
    );
    if (completedCount === 0) {
      toast.error('Complete at least one set');
      return;
    }

    try {
      await createWorkout({
        day: selectedDay,
        day_name: defaultRoutine.days[selectedDay].name,
        week_number: weekNumber,
        date: selectedDate,
        exercises,
        habits,
        preCheckin,
        postCheckin,
        startedAt: workoutStartTime || undefined,
        completedAt: new Date(),
      });
      
      clearDraft();
      setSaved(true);
      
      // Brief confirmation then navigate
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch {
      toast.error('Failed to save workout');
    }
  };

  const handleBack = () => {
    if (step === 'exercises') {
      if (currentExerciseIndex > 0) {
        setCurrentExerciseIndex(prev => prev - 1);
      } else {
        setStep('select-day');
      }
    } else if (step === 'post-checkin') {
      setStep('exercises');
    }
  };

  const { completedSets, totalSets, totalVolume } = useMemo(() => {
    const total = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completed = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0
    );
    const volume = exercises.reduce((sum, ex) => {
      return sum + ex.sets
        .filter(s => s.completed && s.actualWeight && s.actualReps)
        .reduce((setSum, s) => setSum + (parseFloat(s.actualWeight) * parseInt(s.actualReps)), 0);
    }, 0);
    return { completedSets: completed, totalSets: total, totalVolume: volume };
  }, [exercises]);

  const currentExercise = exercises[currentExerciseIndex];
  const dayName = selectedDay ? defaultRoutine.days[selectedDay]?.name : '';

  // Show saved confirmation
  if (saved) {
    return (
      <MainLayout title="LOG WORKOUT">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="flash-saved text-h1 font-bold mb-4">SAVED</div>
            <div className="label-v3">
              {dayName} · WEEK {weekNumber}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="LOG WORKOUT">
      <div className="space-y-6 pb-20">
        {/* Back Button */}
        {step !== 'select-day' && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            BACK
          </button>
        )}

        {/* Progress indicator */}
        <div className="flex gap-1">
          <div className={`h-0.5 flex-1 ${step === 'select-day' || step === 'exercises' || step === 'post-checkin' ? 'bg-foreground' : 'bg-muted'}`} />
          <div className={`h-0.5 flex-1 ${step === 'exercises' || step === 'post-checkin' ? 'bg-foreground' : 'bg-muted'}`} />
          <div className={`h-0.5 flex-1 ${step === 'post-checkin' ? 'bg-foreground' : 'bg-muted'}`} />
        </div>

        {/* Step Content */}
        {step === 'select-day' && (
          <DaySelectorV3 
            preCheckin={preCheckin}
            onSelect={handleDaySelect}
            onPreCheckinChange={setPreCheckin}
          />
        )}

        {step === 'exercises' && currentExercise && (
          <SetLoggerV3
            exercise={currentExercise}
            exerciseIndex={currentExerciseIndex}
            totalExercises={exercises.length}
            dayName={dayName}
            weekNumber={weekNumber}
            onChange={handleExerciseChange}
            onNext={handleNextExercise}
            onPrev={handlePrevExercise}
            onComplete={handleExercisesDone}
            isFirst={currentExerciseIndex === 0}
            isLast={currentExerciseIndex === exercises.length - 1}
            personalRecord={getPRForExercise(currentExercise.name)}
          />
        )}

        {step === 'post-checkin' && (
          <>
            <PostWorkoutV3 
              data={postCheckin} 
              onChange={setPostCheckin}
              autoCalculatedDuration={
                workoutStartTime 
                  ? Math.round((Date.now() - workoutStartTime.getTime()) / 60000) 
                  : undefined
              }
              totalVolume={totalVolume}
            />
            
            <button
              onClick={handleSubmit}
              disabled={isCreating}
              className="btn-v3 btn-v3-primary w-full py-4"
            >
              {isCreating ? 'SAVING...' : 'SAVE WORKOUT'}
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
