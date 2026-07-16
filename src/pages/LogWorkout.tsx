import { RoutineSetup } from '@/components/workout/RoutineSetup';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useState, useMemo, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerItem } from '@/components/layout/AnimatedPage';
import { DaySelectorWithCheckin } from '@/components/workout/DaySelectorWithCheckin';
import { WorkoutDateSelector } from '@/components/workout/WorkoutDateSelector';
import { ExerciseReview } from '@/components/workout/ExerciseReview';
import { SetBySetCard } from '@/components/workout/SetBySetCard';
import { ExercisePicker } from '@/components/workout/ExercisePicker';

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
import { useExercisePreferences } from '@/hooks/useExercisePreferences';
import { getExerciseVariants } from '@/lib/exerciseVariants';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { haptic } from '@/lib/haptics';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Sparkles } from 'lucide-react';
import { WorkoutTimer } from '@/components/workout/WorkoutTimer';
import { WorkoutCoachCard } from '@/components/workout/WorkoutCoachCard';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
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
  dayData: { exercises: Array<{ name: string; category: string; targetWeight: string; targetReps: string; restSeconds?: number; rir?: string; notes?: string; mandatory?: boolean; progression?: string }>; bias?: 'heavy' | 'volume' },
  lastUsedMap?: Record<string, { weight: number; reps: number; sets: number; date: string; perSet?: Array<{ weight: number; reps: number }> }>,
  fitnessGoal?: string | null,
  preferredVariants?: Record<string, string>,
): WorkoutExercise[] {
  const workExercises = dayData.exercises.filter(ex => ex.category !== 'warmup');
  const bias = (dayData as any).bias as 'heavy' | 'volume' | undefined;

  return workExercises.map((templateEx, idx) => {
    // Honor the user's remembered preferred variation of this movement.
    const preferred = preferredVariants?.[templateEx.name];
    const ex = preferred
      ? {
          ...templateEx,
          name: preferred,
          targetWeight: getExerciseVariants(templateEx.name).find(v => v.name === preferred)?.defaultWeight ?? templateEx.targetWeight,
        }
      : templateEx;
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
      mandatory: templateEx.mandatory,
      progression: templateEx.progression,
    } as WorkoutExercise;
  });
}

export default function LogWorkout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { preferences, isLoading: prefsLoading, updatePreferences } = useUserPreferences();
  const { workouts, isLoading: workoutsLoading, createWorkout, isCreating } = useWorkouts();
  const { draft, loaded, saveDraft, clearDraft, hasProgress: draftHasProgress } = useDraftWorkout();
  const { getPRForExercise } = usePersonalRecords();
  const { getLastUsed, lastUsedMap, isLoading: weightsLoading } = useLastUsedWeights();
  const { customDays, hasCustomRoutine, isLoading: routineLoading } = useCustomRoutine();
  const { recordUsage, setPreferredVariant, preferredVariants } = useExercisePreferences();

  const [step, setStep] = useState<Step>('select-day');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showActiveOverview, setShowActiveOverview] = useState(false);
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [preSuggestionExercises, setPreSuggestionExercises] = useState<WorkoutExercise[] | null>(null);
  const [showAIGoalPrompt, setShowAIGoalPrompt] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<WorkoutExercise | null>(null);

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
      // Restore the date the workout was actually logged for. draft.date is an
      // ISO timestamp of the (possibly back-dated) session, so honoring it keeps
      // a back-dated in-progress workout attributed to its intended day instead
      // of silently jumping to today on resume.
      setSelectedDate(draft.date ? new Date(draft.date) : new Date());
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

  const handleDaySelect = (day: string, date: Date, week: number) => {
    setSelectedDay(day);
    setSelectedDate(date);
    setWeekNumber(week);

    const dayInfo = splitDays[day];
    if (dayInfo) {
      setExercises(buildExercisesFromTemplate(dayInfo, lastUsedMap, preferences?.fitness_goal, preferredVariants));
    }

    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setStep('review');
  };

  // Deep link from the Today screen: /app/log?day=Day%201 jumps straight into
  // that day's review, with last-used weights already applied. Skipped if a
  // draft was restored so we never clobber an in-progress session.
  // NOTE: this hook MUST stay above the early returns below — React requires
  // hooks to run in the same order every render, and gating it behind a
  // loading/`return` guard is what previously crashed this page on a cold
  // load/refresh straight onto /app/log. The prefs-loading check now lives
  // inside the effect body instead (splitDays changes when prefs resolve, so
  // the effect re-runs and proceeds then).
  useEffect(() => {
    if (prefsLoading || routineLoading) return;
    if (!loaded || draftRestored) return;
    const dayParam = searchParams.get('day');
    if (!dayParam || step !== 'select-day') return;
    if (!splitDays[dayParam]) return;
    handleDaySelect(dayParam, new Date(), weekNumber);
    // consume the param so a back-nav doesn't re-trigger the jump
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, draftRestored, searchParams, splitDays, prefsLoading, routineLoading]);

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
    // Only reset to beginning for fresh starts; when resuming a draft, keep saved position
    if (!draftHasProgress) {
      setCurrentExerciseIndex(0);
      setCurrentSetIndex(0);
    }
    setStep('exercises');
  };

  // Navigate to review from exercises (edit exercises escape hatch)
  const handleEditExercises = () => {
    setShowActiveOverview(false);
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
          const suggested = buildExercisesFromTemplate(firstDay, lastUsedMap, preferences?.fitness_goal, preferredVariants);
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

  const performSwap = (newExercise: WorkoutExercise) => {
    const previousName = exercises[currentExerciseIndex]?.name;
    setExercises(prev =>
      prev.map((ex, idx) =>
        idx === currentExerciseIndex
          ? { ...newExercise, sort_order: ex.sort_order }
          : ex
      )
    );
    // Remember this as the user's preferred variation of the original movement.
    if (previousName && previousName !== newExercise.name) {
      setPreferredVariant(previousName, newExercise.name);
    }
    setCurrentSetIndex(0);
    setShowSwapPicker(false);
    toast.success(`Switched to ${newExercise.name}`);
  };

  const handleSwapExercise = (newExercise: WorkoutExercise) => {
    const current = exercises[currentExerciseIndex];
    const hasCompletedSets = current?.sets.some(s => s.completed);

    if (hasCompletedSets) {
      // Confirm via an accessible dialog instead of window.confirm
      setShowSwapPicker(false);
      setPendingSwap(newExercise);
      return;
    }

    performSwap(newExercise);
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
      setShowActiveOverview(true);
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
      // Remember which exercises the user actually trained (for the picker).
      recordUsage(
        exercises.filter(ex => ex.sets.some(s => s.completed)).map(ex => ex.name)
      );
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
      setExercises(buildExercisesFromTemplate(dayInfo, lastUsedMap, preferences?.fitness_goal, preferredVariants));
    }
    setPreSuggestionExercises(null);
  };

  // Change training split (persists to preferences)
  const handleSplitChange = async (newSplit: TrainingSplit) => {
    try {
      await updatePreferences.mutateAsync({ training_split: newSplit });
      // Reset selection since days changed
      setSelectedDay('');
      setExercises([]);
    } catch (error) {
      toast.error('Failed to change split — please try again');
    }
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
          const suggested = buildExercisesFromTemplate(firstDay, lastUsedMap, preferences?.fitness_goal, preferredVariants);
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
          {/* Back Button + date (review) */}
          {step === 'review' && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
              >
                <ChevronLeft size={16} />
                Select Split
              </button>
              <WorkoutDateSelector date={selectedDate} onChange={setSelectedDate} />
            </div>
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
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Logging for</span>
                <WorkoutDateSelector date={selectedDate} onChange={setSelectedDate} />
              </div>
              <DaySelectorWithCheckin
                selectedDay={selectedDay}
                selectedDate={selectedDate}
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
              lastUsedNames={new Set(
                exercises
                  .filter(ex => findLastUsed(ex.name, lastUsedMap))
                  .map(ex => ex.name)
              )}
              {...(workoutStartTime && showActiveOverview ? {
                activeSession: true,
                onSelectExercise: (idx: number) => {
                  setCurrentExerciseIndex(idx);
                  setCurrentSetIndex(0);
                  setShowActiveOverview(false);
                  setStep('exercises');
                },
                onFinish: handleExercisesDone,
                isFinishing: isCreating,
              } : {})}
            />
          )}

          {/* Log Sets */}
          {step === 'exercises' && (
            <div className="flex flex-col min-h-[calc(100vh-10rem)] justify-center">
              {/* Header with timer + edit exercises button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <WorkoutTimer startTime={workoutStartTime} />
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">
                      {selectedDay === 'custom' ? 'Freestyle' : (dayData?.name || 'Workout')}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">{selectedDay === 'custom' ? 'Custom Session' : (dayData?.focus || '')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-lg font-bold tabular-nums">
                      {completedSets}/{totalSets}
                    </span>
                    <p className="text-[10px] text-muted-foreground uppercase">SETS</p>
                  </div>
                  <button
                    onClick={handleEditExercises}
                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit exercises"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {currentExercise && (
                <>
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
                    onSwapExercise={() => setShowSwapPicker(true)}
                    onJumpToExercise={(idx) => {
                      setCurrentExerciseIndex(idx);
                      // Land on first uncompleted set, or last set if all done
                      const ex = exercises[idx];
                      const firstIncomplete = ex?.sets.findIndex(s => !s.completed);
                      setCurrentSetIndex(firstIncomplete >= 0 ? firstIncomplete : Math.max(0, (ex?.sets.length ?? 1) - 1));
                    }}
                    onComplete={() => { setShowActiveOverview(true); setStep('review'); }}
                    isFirstExercise={currentExerciseIndex === 0}
                    isLastExercise={currentExerciseIndex === exercises.length - 1}
                    personalRecord={getPRForExercise(currentExercise.name)}
                    lastUsed={getLastUsed(currentExercise.name)}
                    workoutBias={dayData?.bias}
                  />
                  {showSwapPicker && (
                    <ExercisePicker
                      existingExercises={exercises}
                      onAddExercise={handleSwapExercise}
                      dayType={dayType}
                      autoOpen={true}
                      onClose={() => setShowSwapPicker(false)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </Box>
      </AnimatedPage>

      {/* Accessible confirm for swapping an exercise that already has logged sets */}
      <AlertDialog open={pendingSwap !== null} onOpenChange={(open) => { if (!open) setPendingSwap(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard completed sets?</AlertDialogTitle>
            <AlertDialogDescription>
              You've completed sets for "{currentExercise?.name}". Swapping to{' '}
              {pendingSwap?.name ? `"${pendingSwap.name}"` : 'a new exercise'} will discard them. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSwap(null)}>Keep current</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingSwap) performSwap(pendingSwap);
                setPendingSwap(null);
              }}
            >
              Swap & discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
