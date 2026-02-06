import { RoutineSetup } from '@/components/workout/RoutineSetup';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerItem } from '@/components/layout/AnimatedPage';
import { DaySelectorWithCheckin } from '@/components/workout/DaySelectorWithCheckin';
import { SetBySetCard } from '@/components/workout/SetBySetCard';
import { ExerciseOverview } from '@/components/workout/ExerciseOverview';
import { WeeklyProgress } from '@/components/dashboard/WeeklyProgress';
import { getSplitDays } from '@/lib/splitTemplates';
import { useWorkouts, WorkoutExercise, Habits, ExerciseSet } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { useLastUsedWeights } from '@/hooks/useLastUsedWeights';
import { toast } from '@/lib/toast';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, List, LayoutGrid, Plus } from 'lucide-react';

type Step = 'select-day' | 'exercises';
type ExerciseViewMode = 'single' | 'overview';

const defaultHabits: Habits = {
  pullups: 0,
  water_intake: 0,
  sleep_hours: 0,
  energy_level: 5,
  bodyweight: undefined,
  notes: '',
};

function parseTargetReps(targetReps: string): { sets: number; reps: string } {
  const match = targetReps.match(/^(\d+)x(.+)$/);
  if (match) {
    return { sets: parseInt(match[1], 10), reps: match[2] };
  }
  return { sets: 3, reps: targetReps };
}

function getDayType(dayName: string): 'Push' | 'Pull' | 'Legs' | undefined {
  if (dayName.includes('Push')) return 'Push';
  if (dayName.includes('Pull')) return 'Pull';
  if (dayName.includes('Legs')) return 'Legs';
  return undefined;
}

export default function LogWorkout() {
  const navigate = useNavigate();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { createWorkout, isCreating } = useWorkouts();
  const { draft, loaded, saveDraft, clearDraft } = useDraftWorkout();
  const { getPRForExercise } = usePersonalRecords();
  const { getLastUsed } = useLastUsedWeights();

  const [step, setStep] = useState<Step>('select-day');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [habits] = useState<Habits>(defaultHabits);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [exerciseViewMode, setExerciseViewMode] = useState<ExerciseViewMode>('single');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  const splitDays = useMemo(() => {
    const split = preferences?.training_split || 'ppl6';
    return getSplitDays(split);
  }, [preferences?.training_split]);

  const { completedSets, totalSets } = useMemo(() => {
    const total = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completed = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0
    );
    return { completedSets: completed, totalSets: total };
  }, [exercises]);

  const dayType = selectedDay === 'custom' ? undefined : (selectedDay ? getDayType(splitDays[selectedDay]?.name || '') : undefined);
  const currentExercise = exercises[currentExerciseIndex];
  const progressPercent = step === 'select-day' ? 50 : 100;

  // Restore from draft
  useEffect(() => {
    if (loaded && draft && !draftRestored && draft.exercises.length > 0) {
      setSelectedDay(draft.day);
      setSelectedDate(new Date(draft.date));
      setWeekNumber(draft.weekNumber);
      setExercises(draft.exercises);
      const validStep: Step = draft.step === 'select-day' ? 'select-day' : 'exercises';
      setStep(validStep);
      setCurrentExerciseIndex(draft.currentExerciseIndex);
      setCurrentSetIndex(draft.currentSetIndex ?? 0);
      if (draft.workoutStartTime) setWorkoutStartTime(new Date(draft.workoutStartTime));
      setDraftRestored(true);
      toast.info('Restored your previous session');
    }
  }, [loaded, draft, draftRestored]);

  // Auto-save
  useEffect(() => {
    if (step === 'select-day' || !selectedDay) return;
    const timeoutId = setTimeout(() => {
      saveDraft({
        day: selectedDay,
        dayName: selectedDay === 'custom' ? 'Freestyle' : (splitDays[selectedDay]?.name || ''),
        date: selectedDate.toISOString(),
        weekNumber,
        exercises,
        habits,
        currentExerciseIndex,
        currentSetIndex,
        step,
        workoutStartTime: workoutStartTime?.toISOString(),
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [exercises, habits, step, currentExerciseIndex, currentSetIndex, selectedDay, selectedDate, weekNumber, workoutStartTime, saveDraft, splitDays]);

  if (prefsLoading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (preferences && !preferences.routine_setup_completed) {
    return (
      <MainLayout title="SETUP ROUTINE">
        <AnimatedPage>
          <RoutineSetup onComplete={() => { }} />
        </AnimatedPage>
      </MainLayout>
    );
  }

  const handleDaySelect = (day: string, date: Date, week: number) => {
    setSelectedDay(day);
    setSelectedDate(date);
    setWeekNumber(week);
    const dayData = splitDays[day];
    if (dayData) {
      const workExercises = dayData.exercises.filter(ex => ex.category !== 'warmup');
      setExercises(
        workExercises.map((ex, idx) => {
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
    setCurrentSetIndex(0);
    setWorkoutStartTime(new Date());
    setStep('exercises');
  };

  const handleQuickLog = async () => {
    if (!selectedDay) {
      toast.error('Please select a workout day first');
      return;
    }
    try {
      await createWorkout({
        day: selectedDay,
        day_name: selectedDay === 'custom' ? 'Freestyle' : (splitDays[selectedDay]?.name || 'Workout'),
        week_number: weekNumber,
        date: selectedDate,
        exercises: [],
        habits,
        startedAt: new Date(),
        completedAt: new Date(),
      });
      clearDraft();
      toast.success('Workout logged! 💪');
      navigate('/app');
    } catch (error) {
      toast.error('Failed to save workout');
    }
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
      setCurrentSetIndex(0);
    }
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      const prevExercise = exercises[currentExerciseIndex - 1];
      setCurrentSetIndex(prevExercise.sets.length - 1);
    }
  };

  const handleSkipExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSetIndex(0);
    } else {
      setExerciseViewMode('overview');
    }
  };

  const handleExercisesDone = async () => {
    if (completedSets === 0) {
      toast.error('Complete at least one set');
      return;
    }

    const durationMinutes = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime.getTime()) / 60000)
      : undefined;

    try {
      await createWorkout({
        day: selectedDay,
        day_name: selectedDay === 'custom' ? 'Freestyle' : (splitDays[selectedDay]?.name || 'Workout'),
        week_number: weekNumber,
        date: selectedDate,
        exercises,
        habits,
        postCheckin: {
          difficulty: 5,
          satisfaction: 7,
          durationMinutes,
        },
        startedAt: workoutStartTime || undefined,
        completedAt: new Date(),
      });
      clearDraft();
      toast.success('Workout logged! 💪');
      navigate('/app');
    } catch (error) {
      toast.error('Failed to save workout');
    }
  };

  const handleBack = () => {
    if (step === 'exercises') {
      if (exerciseViewMode === 'single') {
        if (currentSetIndex > 0) {
          setCurrentSetIndex(prev => prev - 1);
        } else if (currentExerciseIndex > 0) {
          setCurrentExerciseIndex(prev => prev - 1);
          const prevEx = exercises[currentExerciseIndex - 1];
          setCurrentSetIndex(prevEx.sets.length - 1);
        } else {
          setStep('select-day');
        }
      } else {
        setStep('select-day');
      }
    }
  };

  return (
    <MainLayout title="LOG WORKOUT">
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 10 }}>
          {/* Back Button */}
          {step !== 'select-day' && (
            <Button
              startIcon={<ChevronLeft size={16} />}
              onClick={handleBack}
              sx={{ alignSelf: 'flex-start', color: 'text.secondary', textTransform: 'none' }}
            >
              Back
            </Button>
          )}

          {/* Progress Bar - thick brutalist style */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Weekly Progress */}
          {step === 'select-day' && (
            <motion.div variants={staggerItem}>
              <WeeklyProgress />
            </motion.div>
          )}

          {/* Step: Select Day */}
          {step === 'select-day' && (
            <div className="space-y-5">
              <DaySelectorWithCheckin
                selectedDay={selectedDay}
                onSelect={handleDaySelect}
                onQuickLog={selectedDay ? handleQuickLog : undefined}
              />

              <div className="flex justify-center">
                <button
                  className="flex items-center gap-2 px-6 py-3 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  onClick={() => {
                    setSelectedDay('custom');
                    setSelectedDate(new Date());
                    setWeekNumber(weekNumber);
                    setExercises([]);
                    setStep('exercises');
                    setWorkoutStartTime(new Date());
                  }}
                >
                  <Plus size={16} />
                  Start Empty / Freestyle Session
                </button>
              </div>
            </div>
          )}

          {/* Step: Exercises */}
          {step === 'exercises' && (
            <>
              {/* Header with view toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedDay === 'custom' ? 'Freestyle Workout' : splitDays[selectedDay]?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Week {weekNumber} • {selectedDay === 'custom' ? 'Custom Session' : splitDays[selectedDay]?.focus}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ textAlign: 'right', mr: 1 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {completedSets}/{totalSets}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">SETS</Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setExerciseViewMode('single')}
                    sx={{
                      bgcolor: exerciseViewMode === 'single' ? 'text.primary' : 'action.hover',
                      color: exerciseViewMode === 'single' ? 'background.default' : 'text.primary',
                      '&:hover': {
                        bgcolor: exerciseViewMode === 'single' ? 'text.primary' : 'action.selected',
                      },
                    }}
                  >
                    <LayoutGrid size={18} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setExerciseViewMode('overview')}
                    sx={{
                      bgcolor: exerciseViewMode === 'overview' ? 'text.primary' : 'action.hover',
                      color: exerciseViewMode === 'overview' ? 'background.default' : 'text.primary',
                      '&:hover': {
                        bgcolor: exerciseViewMode === 'overview' ? 'text.primary' : 'action.selected',
                      },
                    }}
                  >
                    <List size={18} />
                  </IconButton>
                </Box>
              </Box>

              {exerciseViewMode === 'single' && currentExercise && (
                <SetBySetCard
                  exercise={currentExercise}
                  exerciseIndex={currentExerciseIndex}
                  totalExercises={exercises.length}
                  currentSetIndex={currentSetIndex}
                  onChange={handleExerciseChange}
                  onSetIndexChange={setCurrentSetIndex}
                  onNextExercise={handleNextExercise}
                  onPrevExercise={handlePrevExercise}
                  onSkipExercise={handleSkipExercise}
                  onComplete={handleExercisesDone}
                  isFirstExercise={currentExerciseIndex === 0}
                  isLastExercise={currentExerciseIndex === exercises.length - 1}
                  personalRecord={getPRForExercise(currentExercise.name)}
                  lastUsed={getLastUsed(currentExercise.name)}
                />
              )}

              {exerciseViewMode === 'overview' && (
                <>
                  <ExerciseOverview
                    exercises={exercises}
                    currentIndex={currentExerciseIndex}
                    onSelectExercise={(idx) => {
                      setCurrentExerciseIndex(idx);
                      setCurrentSetIndex(0);
                      setExerciseViewMode('single');
                    }}
                    onAddExercise={handleAddExercise}
                    dayType={dayType}
                  />
                  <button
                    className="btn-brutalist btn-primary w-full py-4 text-base font-bold disabled:opacity-50"
                    onClick={handleExercisesDone}
                    disabled={completedSets === 0}
                  >
                    Finish Workout
                  </button>
                </>
              )}
            </>
          )}
        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
