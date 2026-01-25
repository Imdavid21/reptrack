import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DaySelectorWithCheckin, PreWorkoutData } from '@/components/workout/DaySelectorWithCheckin';
import { SingleExerciseCard } from '@/components/workout/SingleExerciseCard';
import { ExerciseOverview } from '@/components/workout/ExerciseOverview';
import { HabitsForm } from '@/components/workout/HabitsForm';
import { PostWorkoutSimple, PostWorkoutData } from '@/components/workout/PostWorkoutSimple';
import { defaultRoutine } from '@/lib/workoutPresets';
import { useWorkouts, WorkoutExercise, Habits, ExerciseSet } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Step = 'select-day' | 'exercises' | 'post-checkin' | 'habits';
type ExerciseViewMode = 'single' | 'overview';

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
  energy: 5,
  motivation: 5,
  soreness: 3,
};

const defaultPostCheckin: PostWorkoutData = {
  difficulty: 5,
  satisfaction: 7,
  durationMinutes: undefined,
  notes: undefined,
};

// Parse target reps like "4x8-10" into number of sets and rep range
function parseTargetReps(targetReps: string): { sets: number; reps: string } {
  const match = targetReps.match(/^(\d+)x(.+)$/);
  if (match) {
    return { sets: parseInt(match[1], 10), reps: match[2] };
  }
  return { sets: 3, reps: targetReps }; // Default to 3 sets
}

// Determine day type from day name
function getDayType(dayName: string): 'Push' | 'Pull' | 'Legs' | undefined {
  if (dayName.includes('Push')) return 'Push';
  if (dayName.includes('Pull')) return 'Pull';
  if (dayName.includes('Legs')) return 'Legs';
  return undefined;
}

const STEPS: Step[] = ['select-day', 'exercises', 'post-checkin', 'habits'];

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
  const [habits, setHabits] = useState<Habits>(defaultHabits);
  const [preCheckin, setPreCheckin] = useState<PreWorkoutData>(defaultPreCheckin);
  const [postCheckin, setPostCheckin] = useState<PostWorkoutData>(defaultPostCheckin);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  
  // Single exercise mode state
  const [exerciseViewMode, setExerciseViewMode] = useState<ExerciseViewMode>('single');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Restore from draft if available
  useEffect(() => {
    if (loaded && draft && !draftRestored && draft.exercises.length > 0) {
      setSelectedDay(draft.day);
      setSelectedDate(new Date(draft.date));
      setWeekNumber(draft.weekNumber);
      setExercises(draft.exercises);
      setHabits(draft.habits);
      // Handle old drafts - map old step values to new ones
      let validStep: Step = 'exercises';
      if (draft.step === 'select-day') validStep = 'select-day';
      else if (draft.step === 'pre-checkin' || draft.step === 'exercises') validStep = 'exercises';
      else if (draft.step === 'post-checkin') validStep = 'post-checkin';
      else if (draft.step === 'habits') validStep = 'habits';
      setStep(validStep);
      setCurrentExerciseIndex(draft.currentExerciseIndex);
      if (draft.preCheckin) setPreCheckin(draft.preCheckin);
      if (draft.postCheckin) setPostCheckin(draft.postCheckin);
      if (draft.workoutStartTime) setWorkoutStartTime(new Date(draft.workoutStartTime));
      setDraftRestored(true);
      toast.info('Restored your previous session');
    }
  }, [loaded, draft, draftRestored]);

  // Auto-save when state changes (debounced to prevent rapid updates)
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
  }, [exercises, habits, step, currentExerciseIndex, selectedDay, selectedDate, weekNumber, preCheckin, postCheckin, workoutStartTime, saveDraft]);

  const handleDaySelect = (day: string, date: Date, week: number) => {
    setSelectedDay(day);
    setSelectedDate(date);
    setWeekNumber(week);
    
    // Load exercises from routine with individual sets
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

  const handleQuickLog = () => {
    // Quick log - skip exercises, just log that workout happened
    if (!selectedDay) {
      toast.error('Please select a workout day first');
      return;
    }
    setExercises([]);
    setWorkoutStartTime(new Date());
    setStep('post-checkin');
  };

  const handleExerciseChange = (updatedExercise: WorkoutExercise) => {
    setExercises(prev => 
      prev.map((ex, idx) => idx === currentExerciseIndex ? updatedExercise : ex)
    );
  };

  const handleAddExercise = (newExercise: WorkoutExercise) => {
    setExercises(prev => [...prev, newExercise]);
    toast.success(`Added ${newExercise.name}`);
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

  const handleSkipExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      // If last exercise, show overview
      setExerciseViewMode('overview');
    }
  };

  const handleExercisesDone = () => {
    const completedCount = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0
    );
    if (completedCount === 0) {
      toast.error('Complete at least one set');
      return;
    }
    
    // Auto-calculate duration if we have start time
    if (workoutStartTime && !postCheckin.durationMinutes) {
      const durationMs = Date.now() - workoutStartTime.getTime();
      const durationMins = Math.round(durationMs / 60000);
      setPostCheckin(prev => ({ ...prev, durationMinutes: durationMins }));
    }
    
    setStep('post-checkin');
  };

  const handlePostCheckinDone = () => {
    setStep('habits');
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
      
      // Clear draft after successful save
      clearDraft();
      toast.success('Workout logged! 💪');
      navigate('/');
    } catch (error) {
      toast.error('Failed to save workout');
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (step === 'exercises') {
      if (exerciseViewMode === 'single' && currentExerciseIndex > 0) {
        setCurrentExerciseIndex(prev => prev - 1);
      } else {
        setStep('select-day');
      }
    } else if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };

  const { completedSets, totalSets } = useMemo(() => {
    const total = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completed = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0
    );
    return { completedSets: completed, totalSets: total };
  }, [exercises]);

  const dayType = selectedDay ? getDayType(defaultRoutine.days[selectedDay]?.name || '') : undefined;
  const currentExercise = exercises[currentExerciseIndex];
  const stepProgress = STEPS.indexOf(step) / (STEPS.length - 1);

  return (
    <MainLayout title="LOG WORKOUT">
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Back Button */}
        {step !== 'select-day' && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            BACK
          </button>
        )}

        {/* Progress indicator */}
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 transition-colors ${
                i <= STEPS.indexOf(step)
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        {step === 'select-day' && (
          <DaySelectorWithCheckin 
            selectedDay={selectedDay} 
            preCheckin={preCheckin}
            onSelect={handleDaySelect}
            onPreCheckinChange={setPreCheckin}
            onQuickLog={selectedDay ? handleQuickLog : undefined}
          />
        )}

        {step === 'exercises' && (
          <>
            {/* Header with view toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">{defaultRoutine.days[selectedDay]?.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Week {weekNumber} • {defaultRoutine.days[selectedDay]?.focus}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <div className="text-xl font-bold tabular-nums">
                    {completedSets}/{totalSets}
                  </div>
                  <div className="text-xs text-muted-foreground">SETS</div>
                </div>
                <Button
                  variant={exerciseViewMode === 'single' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setExerciseViewMode('single')}
                  title="Single exercise view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={exerciseViewMode === 'overview' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setExerciseViewMode('overview')}
                  title="Overview"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Exercise content based on view mode */}
            {exerciseViewMode === 'single' && currentExercise && (
              <SingleExerciseCard
                exercise={currentExercise}
                exerciseIndex={currentExerciseIndex}
                totalExercises={exercises.length}
                weekNumber={weekNumber}
                dayName={selectedDay}
                onChange={handleExerciseChange}
                onNext={handleNextExercise}
                onPrev={handlePrevExercise}
                onSkip={handleSkipExercise}
                onComplete={handleExercisesDone}
                isFirst={currentExerciseIndex === 0}
                isLast={currentExerciseIndex === exercises.length - 1}
                personalRecord={getPRForExercise(currentExercise.name)}
              />
            )}

            {exerciseViewMode === 'overview' && (
              <>
                <ExerciseOverview
                  exercises={exercises}
                  currentIndex={currentExerciseIndex}
                  onSelectExercise={(idx) => {
                    setCurrentExerciseIndex(idx);
                    setExerciseViewMode('single');
                  }}
                  onAddExercise={handleAddExercise}
                  dayType={dayType}
                />

                <button
                  onClick={handleExercisesDone}
                  disabled={completedSets === 0}
                  className="btn-brutalist btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  FINISH EXERCISES
                </button>
              </>
            )}
          </>
        )}

        {step === 'post-checkin' && (
          <>
            <PostWorkoutSimple 
              data={postCheckin} 
              onChange={setPostCheckin}
              autoCalculatedDuration={
                workoutStartTime 
                  ? Math.round((Date.now() - workoutStartTime.getTime()) / 60000) 
                  : undefined
              }
            />
            
            <button
              onClick={handlePostCheckinDone}
              className="btn-brutalist btn-primary w-full py-4"
            >
              CONTINUE TO HABITS
            </button>
          </>
        )}

        {step === 'habits' && (
          <>
            <HabitsForm habits={habits} onChange={setHabits} />

            <button
              onClick={handleSubmit}
              disabled={isCreating}
              className="btn-brutalist btn-primary w-full py-4"
            >
              {isCreating ? 'SAVING...' : 'COMPLETE WORKOUT'}
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
