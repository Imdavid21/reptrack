import { RoutineSetup } from '@/components/workout/RoutineSetup';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerItem } from '@/components/layout/AnimatedPage';
import { DaySelectorWithCheckin } from '@/components/workout/DaySelectorWithCheckin';
import { ExerciseReview } from '@/components/workout/ExerciseReview';
import { SetBySetCard } from '@/components/workout/SetBySetCard';
import { ExerciseOverview } from '@/components/workout/ExerciseOverview';
import { SplitSelector } from '@/components/workout/SplitSelector';
import { AIGoalPrompt } from '@/components/workout/AIGoalPrompt';
import { getSplitDays, TrainingSplit } from '@/lib/splitTemplates';
import { useWorkouts, WorkoutExercise, Habits, ExerciseSet } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { useLastUsedWeights } from '@/hooks/useLastUsedWeights';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { haptic } from '@/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, List, LayoutGrid, Plus, Pencil, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeExerciseName, findBestMatch } from '@/lib/exerciseMatching';

type Step = 'select-day' | 'review' | 'exercises';
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

// findLastUsed delegates to the shared findBestMatch utility
function findLastUsed(
  exerciseName: string,
  lastUsedMap?: Record<string, { weight: number; reps: number; sets: number; date: string }>
): { weight: number; reps: number; sets: number; date: string } | undefined {
  return findBestMatch(exerciseName, lastUsedMap);
}

function buildExercisesFromTemplate(
  dayData: { exercises: Array<{ name: string; category: string; targetWeight: string; targetReps: string }> },
  lastUsedMap?: Record<string, { weight: number; reps: number; sets: number; date: string }>
): WorkoutExercise[] {
  const workExercises = dayData.exercises.filter(ex => ex.category !== 'warmup');
  return workExercises.map((ex, idx) => {
    const lastUsed = findLastUsed(ex.name, lastUsedMap);
    const { sets: templateSets, reps: templateReps } = parseTargetReps(ex.targetReps);

    // Use last-used values if available, otherwise fall back to template
    const numSets = lastUsed ? lastUsed.sets : templateSets;
    const reps = lastUsed ? String(lastUsed.reps) : templateReps;
    const weight = lastUsed ? `${lastUsed.weight}kg` : ex.targetWeight;

    const setsArray: ExerciseSet[] = Array.from({ length: numSets }, (_, i) => ({
      setNumber: i + 1,
      targetWeight: weight,
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
  });
}


export default function LogWorkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, isLoading: prefsLoading, updatePreferences } = useUserPreferences();
  const { workouts, isLoading: workoutsLoading, createWorkout, isCreating } = useWorkouts();
  const { draft, loaded, saveDraft, clearDraft } = useDraftWorkout();
  const { getPRForExercise } = usePersonalRecords();
  const { getLastUsed, lastUsedMap, isLoading: weightsLoading } = useLastUsedWeights();

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
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [preSuggestionExercises, setPreSuggestionExercises] = useState<WorkoutExercise[] | null>(null);
  const [showAIGoalPrompt, setShowAIGoalPrompt] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

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

  const dayData = selectedDay !== 'custom' && selectedDay ? splitDays[selectedDay] : null;
  const dayType = dayData ? getDayType(dayData.name) : undefined;
  const currentExercise = exercises[currentExerciseIndex];

  const progressPercent = step === 'select-day' ? 33
    : step === 'review' ? 66
    : 100;

  // Build available days list for the day switcher
  const availableDays = useMemo(() => {
    return Object.entries(splitDays).map(([key, day]) => ({
      key,
      name: day.name,
      focus: day.focus,
    }));
  }, [splitDays]);

  // Restore from draft
  useEffect(() => {
    if (loaded && draft && !draftRestored && draft.exercises.length > 0) {
      setSelectedDay(draft.day);
      setSelectedDate(new Date(draft.date));
      setWeekNumber(draft.weekNumber);
      setExercises(draft.exercises);
      const validStep: Step = draft.step === 'exercises' ? 'exercises' :
                              draft.step === 'review' ? 'review' : 'review';
      setStep(validStep);
      setCurrentExerciseIndex(draft.currentExerciseIndex);
      setCurrentSetIndex(draft.currentSetIndex ?? 0);
      if (draft.workoutStartTime) setWorkoutStartTime(new Date(draft.workoutStartTime));
      setDraftRestored(true);
      toast.info('Restored your previous session');
    }
  }, [loaded, draft, draftRestored]);

  // Auto-save draft
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
      <MainLayout>
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

    const dayInfo = splitDays[day];
    if (dayInfo) {
      setExercises(buildExercisesFromTemplate(dayInfo, lastUsedMap));
    }

    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setStep('review');
  };

  // Start session from review
  const handleStartSession = () => {
    setWorkoutStartTime(new Date());
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setStep('exercises');
  };

  // Navigate to review from exercises (edit exercises escape hatch)
  const handleEditExercises = () => {
    setStep('review');
  };

  // AI suggestions
  const handleSuggestExercises = async () => {
    if (!dayData) return;
    const backup = [...exercises];
    setIsSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: {
          goals: `${dayData.name} workout focusing on ${dayData.focus}. Suggest exercises for this single day only.`,
          trainingSplit: preferences?.training_split || 'ppl6',
          experienceLevel: 'intermediate',
        },
      });

      if (error) throw error;

      const routine = data?.routine;
      if (routine?.days) {
        const firstDay = Object.values(routine.days)[0] as any;
        if (firstDay?.exercises && firstDay.exercises.length > 0) {
          const suggested = buildExercisesFromTemplate(firstDay, lastUsedMap);
          // Only swap if we got valid exercises
          setPreSuggestionExercises(backup);
          setExercises(suggested);
          toast.success(`${suggested.length} AI exercises loaded — confirm or undo`);
          return;
        }
      }
      // If we get here, AI returned no usable exercises
      toast.error('AI returned no exercises. Keeping current list.');
    } catch (err) {
      console.error('AI suggestion failed:', err);
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleConfirmSuggestions = () => {
    haptic('light');
    setPreSuggestionExercises(null);
    toast.success('Exercises confirmed');
  };

  const handleDenySuggestions = () => {
    haptic('light');
    if (preSuggestionExercises) {
      setExercises(preSuggestionExercises);
    }
    setPreSuggestionExercises(null);
    toast.info('Reverted to previous exercises');
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
    if (step === 'review') {
      setStep('select-day');
      setExercises([]);
    } else if (step === 'exercises') {
      if (exerciseViewMode === 'single') {
        if (currentSetIndex > 0) {
          setCurrentSetIndex(prev => prev - 1);
        } else if (currentExerciseIndex > 0) {
          setCurrentExerciseIndex(prev => prev - 1);
          const prevEx = exercises[currentExerciseIndex - 1];
          setCurrentSetIndex(prevEx.sets.length - 1);
        } else {
          setStep('review');
        }
      } else {
        setStep('review');
      }
    }
  };

  // Switch to a different day from the review screen
  const handleSwitchDay = (dayKey: string) => {
    setSelectedDay(dayKey);
    const dayInfo = splitDays[dayKey];
    if (dayInfo) {
      setExercises(buildExercisesFromTemplate(dayInfo, lastUsedMap));
    }
    setPreSuggestionExercises(null);
  };

  // Change training split (persists to preferences)
  const handleSplitChange = (newSplit: TrainingSplit) => {
    updatePreferences.mutate({ training_split: newSplit });
    // Reset selection since days changed
    setSelectedDay('');
    setExercises([]);
  };

  // AI goal-based routine generation
  const handleAIGenerate = async (goals: string, split: TrainingSplit, experience: string) => {
    setIsAIGenerating(true);
    try {

      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: {
          goals,
          trainingSplit: split,
          experienceLevel: experience,
        },
      });

      if (error) throw error;

      const routine = data?.routine;
      if (routine?.days && Object.keys(routine.days).length > 0) {
        // Apply the generated routine to the first day and navigate to review
        const firstDayKey = Object.keys(routine.days)[0];
        const firstDay = routine.days[firstDayKey] as any;
        if (firstDay?.exercises && firstDay.exercises.length > 0) {
          const suggested = buildExercisesFromTemplate(firstDay, lastUsedMap);
          const newSplitDays = getSplitDays(split);
          const dayKey = Object.keys(newSplitDays)[0] || 'Day 1';
          setSelectedDay(dayKey);
          setSelectedDate(new Date());
          setExercises(suggested);
          setShowAIGoalPrompt(false);
          setStep('review');
          toast.success(`AI routine generated — review your exercises`);
          return;
        }
      }
      toast.error('AI returned no exercises. Try different goals.');
    } catch (err) {
      console.error('AI generation failed:', err);
      toast.error('Failed to generate routine');
    } finally {
      setIsAIGenerating(false);
    }
  };

  return (
    <MainLayout>
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 10 }}>
          {/* Back Button */}
          {step === 'review' && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
            >
              <ChevronLeft size={16} />
              Select Split
            </button>
          )}

          {/* Split selector - only on day selection */}
          {step === 'select-day' && preferences && (
            <motion.div variants={staggerItem}>
              <SplitSelector
                currentSplit={(preferences.training_split as TrainingSplit) || 'ppl6'}
                onChangeSplit={handleSplitChange}
                isUpdating={updatePreferences.isPending}
              />
            </motion.div>
          )}

          {/* Step 1: Select Day */}
          {step === 'select-day' && (
            <div className="space-y-5">
              <DaySelectorWithCheckin
                selectedDay={selectedDay}
                onSelect={handleDaySelect}
              />


              <div className="flex gap-2 justify-center">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setSelectedDay('custom');
                    setSelectedDate(new Date());
                    setWeekNumber(weekNumber);
                    setExercises([]);
                    setStep('review');
                  }}
                >
                  <Plus size={13} />
                  Freestyle
                </button>

                <button
                  onClick={() => {
                    haptic('light');
                    setShowAIGoalPrompt(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Sparkles size={13} />
                  AI Routine
                </button>
              </div>

              {/* AI Goal Prompt Sheet */}
              <AIGoalPrompt
                isOpen={showAIGoalPrompt}
                onClose={() => setShowAIGoalPrompt(false)}
                onGenerate={handleAIGenerate}
                isGenerating={isAIGenerating}
                currentSplit={(preferences?.training_split as TrainingSplit) || 'ppl6'}
              />
            </div>
          )}

          {/* Step 2: Review & Edit Exercises */}
          {step === 'review' && (
            <ExerciseReview
              exercises={exercises}
              dayName={selectedDay === 'custom' ? 'Freestyle Workout' : (dayData?.name || 'Workout')}
              dayFocus={selectedDay === 'custom' ? 'Build your own session' : (dayData?.focus || '')}
              dayType={dayType}
              onChange={setExercises}
              onStart={handleStartSession}
              onSuggest={selectedDay !== 'custom' ? handleSuggestExercises : undefined}
              isSuggesting={isSuggesting}
              hasPendingSuggestions={preSuggestionExercises !== null}
              onConfirmSuggestions={handleConfirmSuggestions}
              onDenySuggestions={handleDenySuggestions}
              availableDays={selectedDay !== 'custom' ? availableDays : undefined}
              selectedDayKey={selectedDay}
              onSwitchDay={selectedDay !== 'custom' ? handleSwitchDay : undefined}
              onSkipExercises={selectedDay ? handleQuickLog : undefined}
              lastUsedNames={new Set(
                exercises
                  .filter(ex => findLastUsed(ex.name, lastUsedMap))
                  .map(ex => ex.name)
              )}
            />
          )}

          {/* Log Sets */}
          {step === 'exercises' && (
            <div className={cn(
              exerciseViewMode === 'single' 
                ? 'flex flex-col min-h-[calc(100vh-10rem)] justify-center' 
                : ''
            )}>
              {/* Header with view toggle + edit exercises button */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {selectedDay === 'custom' ? 'Freestyle Workout' : dayData?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedDay === 'custom' ? 'Custom Session' : dayData?.focus}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-lg font-bold tabular-nums">
                      {completedSets}/{totalSets}
                    </span>
                    <p className="text-[10px] text-muted-foreground uppercase">SETS</p>
                  </div>
                  <button
                    onClick={() => setExerciseViewMode(exerciseViewMode === 'single' ? 'overview' : 'single')}
                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {exerciseViewMode === 'single' ? <List size={16} /> : <LayoutGrid size={16} />}
                  </button>
                  <button
                    onClick={handleEditExercises}
                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit exercises"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

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
            </div>
          )}
        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
