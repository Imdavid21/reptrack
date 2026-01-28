import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, IconButton, LinearProgress, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { DaySelectorWithCheckin } from '@/components/workout/DaySelectorWithCheckin';
import { SwipeableSetCard } from '@/components/workout/SwipeableSetCard';
import { ExerciseOverview } from '@/components/workout/ExerciseOverview';
import { HabitsForm } from '@/components/workout/HabitsForm';
import { PostWorkoutSimple, PostWorkoutData } from '@/components/workout/PostWorkoutSimple';
import { WeeklyProgress } from '@/components/dashboard/WeeklyProgress';
import { defaultRoutine } from '@/lib/workoutPresets';
import { useWorkouts, WorkoutExercise, Habits, ExerciseSet } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { useLastUsedWeights } from '@/hooks/useLastUsedWeights';
import { toast } from '@/lib/toast';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, List, LayoutGrid, Zap } from 'lucide-react';
import { haptic } from '@/lib/haptics';

type Step = 'select-day' | 'exercises' | 'post-checkin' | 'habits';
type ExerciseViewMode = 'swipe' | 'overview';

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

const defaultPostCheckin: PostWorkoutData = {
  difficulty: 5,
  satisfaction: 7,
  durationMinutes: undefined,
  notes: undefined,
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

const STEPS: Step[] = ['select-day', 'exercises', 'post-checkin', 'habits'];

export default function LogWorkout() {
  const navigate = useNavigate();
  const { createWorkout, isCreating } = useWorkouts();
  const { draft, loaded, saveDraft, clearDraft } = useDraftWorkout();
  const { getPRForExercise } = usePersonalRecords();
  const { getLastUsed } = useLastUsedWeights();
  
  const [step, setStep] = useState<Step>('select-day');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [habits, setHabits] = useState<Habits>(defaultHabits);
  const [postCheckin, setPostCheckin] = useState<PostWorkoutData>(defaultPostCheckin);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [exerciseViewMode, setExerciseViewMode] = useState<ExerciseViewMode>('swipe');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  // Restore from draft
  useEffect(() => {
    if (loaded && draft && !draftRestored && draft.exercises.length > 0) {
      setSelectedDay(draft.day);
      setSelectedDate(new Date(draft.date));
      setWeekNumber(draft.weekNumber);
      setExercises(draft.exercises);
      setHabits(draft.habits);
      let validStep: Step = 'exercises';
      if (draft.step === 'select-day') validStep = 'select-day';
      else if (draft.step === 'exercises') validStep = 'exercises';
      else if (draft.step === 'post-checkin') validStep = 'post-checkin';
      else if (draft.step === 'habits') validStep = 'habits';
      setStep(validStep);
      setCurrentExerciseIndex(draft.currentExerciseIndex);
      setCurrentSetIndex(draft.currentSetIndex ?? 0);
      if (draft.postCheckin) setPostCheckin(draft.postCheckin);
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
        dayName: defaultRoutine.days[selectedDay]?.name || '',
        date: selectedDate.toISOString(),
        weekNumber,
        exercises,
        habits,
        currentExerciseIndex,
        currentSetIndex,
        step,
        postCheckin,
        workoutStartTime: workoutStartTime?.toISOString(),
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [exercises, habits, step, currentExerciseIndex, currentSetIndex, selectedDay, selectedDate, weekNumber, postCheckin, workoutStartTime, saveDraft]);

  const handleDaySelect = (day: string, date: Date, week: number) => {
    haptic('medium');
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
    setCurrentSetIndex(0);
    setWorkoutStartTime(new Date());
    setStep('exercises');
  };

  const handleQuickLog = () => {
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

  const handleSetComplete = () => {
    const currentExercise = exercises[currentExerciseIndex];
    const isLastSet = currentSetIndex === currentExercise.sets.length - 1;
    const isLastExercise = currentExerciseIndex === exercises.length - 1;

    if (isLastSet) {
      if (isLastExercise) {
        // All done!
        handleExercisesDone();
      } else {
        // Move to next exercise
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSetIndex(0);
      }
    } else {
      // Move to next set
      setCurrentSetIndex(prev => prev + 1);
    }
  };

  const handleSkipSet = () => {
    const currentExercise = exercises[currentExerciseIndex];
    const isLastSet = currentSetIndex === currentExercise.sets.length - 1;
    const isLastExercise = currentExerciseIndex === exercises.length - 1;

    if (isLastSet) {
      if (isLastExercise) {
        setExerciseViewMode('overview');
      } else {
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSetIndex(0);
      }
    } else {
      setCurrentSetIndex(prev => prev + 1);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSetIndex(0);
    } else {
      handleExercisesDone();
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
    if (workoutStartTime && !postCheckin.durationMinutes) {
      const durationMs = Date.now() - workoutStartTime.getTime();
      const durationMins = Math.round(durationMs / 60000);
      setPostCheckin(prev => ({ ...prev, durationMinutes: durationMins }));
    }
    haptic('success');
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
        postCheckin,
        startedAt: workoutStartTime || undefined,
        completedAt: new Date(),
      });
      clearDraft();
      haptic('success');
      toast.success('Workout logged! 💪');
      navigate('/');
    } catch (error) {
      toast.error('Failed to save workout');
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (step === 'exercises') {
      if (exerciseViewMode === 'swipe') {
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
        setExerciseViewMode('swipe');
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
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <MainLayout title="LOG WORKOUT">
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 6 }}>
          {/* Back Button */}
          {step !== 'select-day' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button
                startIcon={<ChevronLeft size={16} />}
                onClick={handleBack}
                sx={{ 
                  alignSelf: 'flex-start', 
                  color: 'text.secondary',
                  borderRadius: 3,
                }}
              >
                Back
              </Button>
            </motion.div>
          )}

          {/* Progress bar - only show during exercises */}
          {step === 'exercises' && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              style={{ transformOrigin: 'left' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={progress}
                  sx={{ 
                    flex: 1,
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--chart-3)))',
                    },
                  }}
                />
                <Typography variant="caption" fontWeight={600} sx={{ minWidth: 45 }}>
                  {completedSets}/{totalSets}
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Weekly Progress - only on day selection */}
          {step === 'select-day' && (
            <motion.div variants={staggerItem}>
              <WeeklyProgress />
            </motion.div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {step === 'select-day' && (
              <motion.div
                key="select-day"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <DaySelectorWithCheckin 
                  selectedDay={selectedDay} 
                  onSelect={handleDaySelect}
                  onQuickLog={selectedDay ? handleQuickLog : undefined}
                />
              </motion.div>
            )}

            {step === 'exercises' && (
              <motion.div
                key="exercises"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Header with workout info and view toggle */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={700} sx={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      {defaultRoutine.days[selectedDay]?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Week {weekNumber} • {defaultRoutine.days[selectedDay]?.focus}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => setExerciseViewMode('swipe')}
                      sx={{
                        bgcolor: exerciseViewMode === 'swipe' ? 'primary.main' : 'action.hover',
                        color: exerciseViewMode === 'swipe' ? 'primary.contrastText' : 'text.primary',
                        borderRadius: 2,
                      }}
                    >
                      <Zap size={18} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setExerciseViewMode('overview')}
                      sx={{
                        bgcolor: exerciseViewMode === 'overview' ? 'primary.main' : 'action.hover',
                        color: exerciseViewMode === 'overview' ? 'primary.contrastText' : 'text.primary',
                        borderRadius: 2,
                      }}
                    >
                      <List size={18} />
                    </IconButton>
                  </Box>
                </Box>

                {exerciseViewMode === 'swipe' && currentExercise && (
                  <SwipeableSetCard
                    exercise={currentExercise}
                    exerciseIndex={currentExerciseIndex}
                    totalExercises={exercises.length}
                    currentSetIndex={currentSetIndex}
                    onChange={handleExerciseChange}
                    onSetComplete={handleSetComplete}
                    onSkipSet={handleSkipSet}
                    onNextExercise={handleNextExercise}
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
                        setExerciseViewMode('swipe');
                      }}
                      onAddExercise={handleAddExercise}
                      dayType={dayType}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleExercisesDone}
                      disabled={completedSets === 0}
                      sx={{ 
                        py: 1.5, 
                        borderRadius: 3,
                        mt: 2,
                        fontWeight: 700,
                      }}
                    >
                      Finish Exercises
                    </Button>
                  </>
                )}

                {/* Swipe instructions */}
                {exerciseViewMode === 'swipe' && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: 3, 
                    mt: 3,
                    color: 'text.secondary',
                  }}>
                    <Typography variant="caption">← Skip</Typography>
                    <Typography variant="caption">Log →</Typography>
                  </Box>
                )}
              </motion.div>
            )}

            {step === 'post-checkin' && (
              <motion.div
                key="post-checkin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PostWorkoutSimple 
                  data={postCheckin} 
                  onChange={setPostCheckin}
                  autoCalculatedDuration={
                    workoutStartTime 
                      ? Math.round((Date.now() - workoutStartTime.getTime()) / 60000) 
                      : undefined
                  }
                />
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handlePostCheckinDone}
                  sx={{ py: 1.5, borderRadius: 3, mt: 3, fontWeight: 700 }}
                >
                  Continue to Habits
                </Button>
              </motion.div>
            )}

            {step === 'habits' && (
              <motion.div
                key="habits"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <HabitsForm habits={habits} onChange={setHabits} />
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={isCreating}
                  sx={{ py: 1.5, borderRadius: 3, mt: 3, fontWeight: 700 }}
                >
                  {isCreating ? 'Saving...' : 'Complete Workout'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}