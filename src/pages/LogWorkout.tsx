import { RoutineSetup } from '@/components/workout/RoutineSetup';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useState, useMemo, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerItem } from '@/components/layout/AnimatedPage';
import { DaySelectorWithCheckin } from '@/components/workout/DaySelectorWithCheckin';
import { ExerciseReview } from '@/components/workout/ExerciseReview';
import { SetBySetCard } from '@/components/workout/SetBySetCard';

import { SplitSelector } from '@/components/workout/SplitSelector';
import { AIGoalPrompt } from '@/components/workout/AIGoalPrompt';
import { getSplitDays, TrainingSplit } from '@/lib/splitTemplates';
import { derivePersonalizedProgramming } from '@/lib/programmingEngine';
import { useCustomRoutine } from '@/hooks/useCustomRoutine';
import { useWorkouts, WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { getExerciseType } from '@/lib/exerciseLibrary';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { useLastUsedWeights } from '@/hooks/useLastUsedWeights';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { haptic } from '@/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Sparkles } from 'lucide-react';
import { WorkoutTimer } from '@/components/workout/WorkoutTimer';
import { WorkoutCoachCard } from '@/components/workout/WorkoutCoachCard';
import { Separator } from '@/components/ui/separator';

import { findBestMatch } from '@/lib/exerciseMatching';

type Step = 'select-day' | 'review' | 'exercises';




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
  dayData: { exercises: Array<{ name: string; category: string; targetWeight: string; targetReps: string; restSeconds?: number; rir?: string; notes?: string }>; bias?: 'heavy' | 'volume' },
  lastUsedMap?: Record<string, { weight: number; reps: number; sets: number; date: string; perSet?: Array<{ weight: number; reps: number }> }>,
  fitnessGoal?: string | null,
): WorkoutExercise[] {
  const workExercises = dayData.exercises.filter(ex => ex.category !== 'warmup');
  const bias = (dayData as any).bias as 'heavy' | 'volume' | undefined;

  return workExercises.map((ex, idx) => {
    const exType = getExerciseType(ex.name, ex.targetWeight, ex.targetReps);
    const lastUsed = findLastUsed(ex.name, lastUsedMap);

    // Use programming engine for personalized sets/reps/rest/rir
    const programming = derivePersonalizedProgramming(
      ex as any,
      bias,
      lastUsed as any,
      fitnessGoal,
    );

    const numSets = programming.sets;
    const reps = lastUsed ? String(lastUsed.reps) : programming.reps;
    const weight = lastUsed ? `${lastUsed.weight}kg` : ex.targetWeight;

    const setsArray: ExerciseSet[] = Array.from({ length: numSets }, (_, i) => {
      const set: ExerciseSet = {
        setNumber: i + 1,
        targetWeight: weight,
        targetReps: reps,
        actualWeight: '',
        actualReps: '',
        completed: false,
      };
      if (exType === 'timed') {
        const seconds = parseInt(reps, 10);
        if (!isNaN(seconds)) {
          set.targetTime = seconds;
        }
      }
      return set;
    });
    return {
      name: ex.name,
      category: ex.category,
      sets: setsArray,
      sort_order: idx,
      exerciseType: exType,
      restSeconds: programming.restSeconds,
      rir: programming.rir,
    } as WorkoutExercise;
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
  const { customDays, hasCustomRoutine, isLoading: routineLoading } = useCustomRoutine();

  const [step, setStep] = useState<Step>('select-day');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [preSuggestionExercises, setPreSuggestionExercises] = useState<WorkoutExercise[] | null>(null);
  const [showAIGoalPrompt, setShowAIGoalPrompt] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  const splitDays = useMemo(() => {
    if (hasCustomRoutine && customDays) return customDays;
    const split = preferences?.training_split || 'ppl6';
    return getSplitDays(split);
  }, [preferences?.training_split, hasCustomRoutine, customDays]);

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
      // Always use current date when restoring a draft to avoid stale dates
      setSelectedDate(new Date());
      setWeekNumber(draft.weekNumber);
      setExercises(draft.exercises);
      const validStep: Step = draft.step === 'exercises' ? 'exercises' :
                              draft.step === 'review' ? 'review' : 'exercises';
      setStep(validStep);
      setCurrentExerciseIndex(draft.currentExerciseIndex);
      setCurrentSetIndex(draft.currentSetIndex ?? 0);
      if (draft.workoutStartTime) {
        setWorkoutStartTime(new Date(draft.workoutStartTime));
      } else {
        // Fallback: if there's progress but no start time saved (e.g. app was force-killed
        // before the draft auto-saved the start time), use lastSavedAt as a conservative estimate.
        const hasProgress = draft.exercises.some(ex => ex.sets.some(s => s.completed));
        if (hasProgress && draft.lastSavedAt) {
          setWorkoutStartTime(new Date(draft.lastSavedAt));
        }
      }
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
        habits: { pullups: 0, water_intake: 0, sleep_hours: 0 },
        currentExerciseIndex,
        currentSetIndex,
        step,
        workoutStartTime: workoutStartTime?.toISOString(),
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [exercises, step, currentExerciseIndex, currentSetIndex, selectedDay, selectedDate, weekNumber, workoutStartTime, saveDraft, splitDays]);

  if (prefsLoading || routineLoading) {
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
      setExercises(buildExercisesFromTemplate(dayInfo, lastUsedMap, preferences?.fitness_goal));
    }

    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setStep('review');
  };

  // Start session from review — preserve original start time if already set
  const handleStartSession = () => {
    setWorkoutStartTime(prev => {
      if (prev) return prev; // Never overwrite an existing start time
      const now = new Date();
      // Eagerly flush start time to draft so it survives immediate backgrounding
      const key = user ? `fittrack_draft_workout_${user.id}` : null;
      if (key) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const saved = JSON.parse(raw);
            saved.workoutStartTime = now.toISOString();
            localStorage.setItem(key, JSON.stringify(saved));
          }
        } catch (_) { /* ignore */ }
      }
      return now;
    });
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setStep('exercises');
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
          const suggested = buildExercisesFromTemplate(firstDay, lastUsedMap, preferences?.fitness_goal);
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
    setExercises(prev => [...prev, { ...newExercise, sort_order: prev.length }]);
    toast.success(`Added ${newExercise.name}`);
  };

  const handleRemoveExercise = (indexToRemove: number) => {
    setExercises(prev => {
      const updated = prev.filter((_, i) => i !== indexToRemove);
      updated.forEach((ex, i) => (ex.sort_order = i));
      return updated;
    });
    // Adjust currentExerciseIndex if needed to avoid pointing at wrong exercise
    setCurrentExerciseIndex(prev => {
      if (prev >= indexToRemove && prev > 0) return prev - 1;
      return prev;
    });
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
      setStep('review');
    }
  };

  const handleExercisesDone = async () => {
    if (isCreating) return; // Prevent double-tap
    if (completedSets === 0) {
      toast.error('Complete at least one set');
      return;
    }

    const durationMinutes = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime.getTime()) / 60000)
      : undefined;

    try {
      console.log('[FinishWorkout] Saving…', { completedSets, totalSets, exerciseCount: exercises.length });
      await createWorkout({
        day: selectedDay,
        day_name: selectedDay === 'custom' ? 'Freestyle' : (splitDays[selectedDay]?.name || 'Workout'),
        week_number: weekNumber,
        date: selectedDate,
        exercises,
        durationMinutes,
        startedAt: workoutStartTime || undefined,
        completedAt: new Date(),
      });
      clearDraft();
      if (!navigator.onLine) {
        toast.success('Workout saved offline — will sync when back online 📴');
      } else {
        toast.success('Workout logged! 💪');
      }
      navigate('/app');
    } catch (error: any) {
      console.error('[FinishWorkout] Error:', error);
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleBack = () => {
    if (step === 'review') {
      // Going back to day selection — only clear exercises if nothing has been completed
      const hasCompletedSets = exercises.some(ex => ex.sets.some(s => s.completed));
      if (!hasCompletedSets) {
        setExercises([]);
      }
      setStep('select-day');
    } else if (step === 'exercises') {
      if (currentSetIndex > 0) {
        setCurrentSetIndex(prev => prev - 1);
      } else if (currentExerciseIndex > 0) {
        setCurrentExerciseIndex(prev => prev - 1);
        const prevEx = exercises[currentExerciseIndex - 1];
        setCurrentSetIndex(prevEx.sets.length - 1);
      } else {
        setStep('review');
      }
    }
  };

  // Switch to a different day from the review screen — preserve any completed progress
  const handleSwitchDay = (dayKey: string) => {
    const hasCompletedSets = exercises.some(ex => ex.sets.some(s => s.completed));
    if (hasCompletedSets) {
      // Don't wipe exercises that have progress — warn the user
      toast.error('Finish or discard current progress first');
      return;
    }
    setSelectedDay(dayKey);
    const dayInfo = splitDays[dayKey];
    if (dayInfo) {
      setExercises(buildExercisesFromTemplate(dayInfo, lastUsedMap, preferences?.fitness_goal));
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
          const suggested = buildExercisesFromTemplate(firstDay, lastUsedMap, preferences?.fitness_goal);
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
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2.5, 
          pb: 10,
          ...(step === 'select-day' && {
            minHeight: 'calc(100vh - 140px)',
            justifyContent: 'center',
          }),
        }}>
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

              {/* Divider */}
              <Separator className="my-1" />

              {/* Workout Coach */}
              <WorkoutCoachCard />

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
              onChange={(updated) => {
                // If exercises were removed, clamp the currentExerciseIndex
                setExercises(updated);
                if (updated.length > 0) {
                  setCurrentExerciseIndex(prev => Math.min(prev, updated.length - 1));
                }
              }}
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
              isResuming={!!workoutStartTime}
              activeSession={!!workoutStartTime}
              onSelectExercise={workoutStartTime ? (idx) => {
                setCurrentExerciseIndex(idx);
                setCurrentSetIndex(0);
                setStep('exercises');
              } : undefined}
              onFinish={workoutStartTime ? handleExercisesDone : undefined}
              isFinishing={isCreating}
              lastUsedNames={new Set(
                exercises
                  .filter(ex => findLastUsed(ex.name, lastUsedMap))
                  .map(ex => ex.name)
              )}
            />
          )}

          {/* Log Sets */}
          {step === 'exercises' && currentExercise && (
            <div className="flex flex-col min-h-[calc(100vh-10rem)] justify-center">
              {/* Header with timer + sets counter */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBack}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold">
                      {selectedDay === 'custom' ? 'Freestyle Workout' : dayData?.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedDay === 'custom' ? 'Custom Session' : dayData?.focus}
                      </p>
                      <WorkoutTimer startTime={workoutStartTime} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold tabular-nums">
                    {completedSets}/{totalSets}
                  </span>
                  <p className="text-[10px] text-muted-foreground uppercase">SETS</p>
                </div>
              </div>

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
                onComplete={() => setStep('review')}
                isFirstExercise={currentExerciseIndex === 0}
                isLastExercise={currentExerciseIndex === exercises.length - 1}
                personalRecord={getPRForExercise(currentExercise.name)}
                lastUsed={getLastUsed(currentExercise.name)}
                workoutBias={dayData?.bias}
              />
            </div>
          )}
        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
