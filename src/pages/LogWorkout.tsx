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
import { resolveSplitDays, TrainingSplit } from '@/lib/splitTemplates';
import { derivePersonalizedProgramming, TrainingFocus } from '@/lib/programmingEngine';
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
import { ChevronLeft, Plus, Pencil, Clock, Dumbbell, ChevronRight } from 'lucide-react';
import { WorkoutTimer } from '@/components/workout/WorkoutTimer';
import { SessionTimeDialog } from '@/components/workout/SessionTimeDialog';
import { AdaptiveSuggestionsCard } from '@/components/adaptive/AdaptiveSuggestionsCard';

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
import { localDateKey } from '@/lib/dateKey';

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
  trainingFocus?: TrainingFocus | null,
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

    // Programming engine derives sets/reps/rest/rir for the chosen training
    // focus AND the actual weight/rep target — evidence-based double
    // progression against the user's own last session, not just a verbatim
    // copy of what they did last time.
    const programming = derivePersonalizedProgramming(
      ex as any,
      bias,
      lastUsed as any,
      fitnessGoal,
      trainingFocus,
    );

    const numSets = programming.sets;
    const reps = programming.reps;
    const weight = programming.weight;

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
      // Prefer the live, personalized rationale ("+2.5kg — hit 8 reps last
      // time") over the template's generic static hint — it's the same UI
      // slot, and the live note is always more useful once there's history.
      progression: programming.note || templateEx.progression,
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
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<WorkoutExercise | null>(null);
  // Manual session time (used when back-dating or correcting a quick entry)
  const [manualStart, setManualStart] = useState<Date | null>(null);
  const [manualDuration, setManualDuration] = useState<number | null>(null);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  // Guard: switching days would rebuild the exercise list and wipe logged sets
  const [pendingDaySelect, setPendingDaySelect] = useState<{ day: string; date: Date; week: number } | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  // True once the user deliberately picks a log date (enables back-dating)
  const [dateTouched, setDateTouched] = useState(false);



  const splitDays = useMemo(() => {
    // Single source of truth: the chosen training split wins unless it's
    // explicitly 'custom'. A leftover active custom routine must not override
    // the split the user picked (that's what made Full Body render as PPL here).
    return resolveSplitDays(preferences?.training_split, customDays, hasCustomRoutine);
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
      // a back-dated in-progress workout attributed to its intended day.
      // BUT: a draft carried over from a previous calendar day that is being
      // trained *today* (start time or last save is today) must snap to today —
      // otherwise the finished session silently saves onto yesterday's date and
      // looks to the user like the save "glitched" and never happened.
      const draftDate = draft.date ? new Date(draft.date) : new Date();
      const activityStamp = draft.workoutStartTime || draft.lastSavedAt;
      const trainedToday = activityStamp
        ? localDateKey(new Date(activityStamp)) === localDateKey(new Date())
        : false;
      const isBackdated = localDateKey(draftDate) !== localDateKey(new Date());
      setSelectedDate(isBackdated && trainedToday ? new Date() : draftDate);

      setWeekNumber(draft.weekNumber);
      setExercises(draft.exercises);
      const validStep: Step = draft.step === 'exercises' ? 'exercises' :
                              draft.step === 'review' ? 'review' : 'exercises';
      setStep(validStep);
      setCurrentExerciseIndex(draft.currentExerciseIndex);
      setCurrentSetIndex(draft.currentSetIndex ?? 0);
      if (draft.manualStart) setManualStart(new Date(draft.manualStart));
      if (draft.manualDuration) setManualDuration(draft.manualDuration);
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
      toast.info('Resumed your session');
    }
  }, [loaded, draft, draftRestored]);

  // Auto-save draft
  useEffect(() => {
    if (step === 'select-day' || !selectedDay) return;
    const payload = {
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
      manualStart: manualStart?.toISOString(),
      manualDuration: manualDuration ?? undefined,
    };
    // Persist immediately (no data loss if the app is killed within the debounce
    // window), then again after the debounce so React state settles.
    saveDraft(payload);
    const timeoutId = setTimeout(() => saveDraft(payload), 500);
    return () => clearTimeout(timeoutId);
  }, [exercises, step, currentExerciseIndex, currentSetIndex, selectedDay, selectedDate, weekNumber, workoutStartTime, manualStart, manualDuration, saveDraft, splitDays]);

  const applyDaySelect = (day: string, date: Date, week: number) => {
    setSelectedDay(day);
    setSelectedDate(date);
    setWeekNumber(week);

    const dayInfo = splitDays[day];
    if (dayInfo) {
      setExercises(buildExercisesFromTemplate(dayInfo, lastUsedMap, preferences?.fitness_goal, preferredVariants, preferences?.training_focus as TrainingFocus | null));
    }

    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setStep('review');
  };

  const handleDaySelect = (day: string, date: Date, week: number) => {
    // Never silently rebuild the exercise list over a session that already has
    // logged sets — that's how in-progress work used to disappear.
    const hasCompletedSets = exercises.some(ex => ex.sets.some(s => s.completed));
    if (hasCompletedSets) {
      setPendingDaySelect({ day, date, week });
      return;
    }
    applyDaySelect(day, date, week);
  };

  // Jump back into the saved session from the day picker
  const handleResumeDraft = () => {
    if (!draft) return;
    setStep(draft.step === 'review' ? 'review' : 'exercises');
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

  // Final safety net against mis-dated saves: a session that was actually
  // trained today must never land on the draft's stale calendar date. If the
  // selected date isn't today but the session clock started today, snap it —
  // unless the user deliberately picked a date or set a manual session time.
  const resolveSaveDate = (startedAt?: Date | null) => {
    const todayKey = localDateKey(new Date());
    if (dateTouched || manualStart) return selectedDate;
    if (localDateKey(selectedDate) === todayKey) return selectedDate;
    if (startedAt && localDateKey(startedAt) === todayKey) return new Date();
    return selectedDate;
  };

  // Explicit session time wins over the live timer (back-dated entries).
  const resolveSessionTimes = (liveStart: Date | null) => {
    if (manualStart) {
      const duration = manualDuration ?? 60;
      return {
        startedAt: manualStart,
        completedAt: new Date(manualStart.getTime() + duration * 60000),
        durationMinutes: duration,
      };
    }
    const startedAt = liveStart || new Date();
    const durationMinutes = liveStart
      ? Math.max(1, Math.round((Date.now() - liveStart.getTime()) / 60000))
      : undefined;
    return { startedAt, completedAt: new Date(), durationMinutes };
  };

  const handleQuickLog = async () => {
    if (!selectedDay) {
      toast.error('Please select a workout day first');
      return;
    }
    try {
      const times = resolveSessionTimes(workoutStartTime);
      const saveDate = resolveSaveDate(times.startedAt);
      await createWorkout({
        day: selectedDay,
        day_name: selectedDay === 'custom' ? 'Freestyle' : (splitDays[selectedDay]?.name || 'Workout'),
        week_number: weekNumber,
        date: saveDate,
        exercises: [],
        durationMinutes: times.durationMinutes,
        startedAt: times.startedAt,
        completedAt: times.completedAt,
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

    const times = resolveSessionTimes(workoutStartTime);

    try {
      const saveDate = resolveSaveDate(times.startedAt);
      console.log('[FinishWorkout] Saving…', { completedSets, totalSets, exerciseCount: exercises.length, date: localDateKey(saveDate) });
      await createWorkout({
        day: selectedDay,
        day_name: selectedDay === 'custom' ? 'Freestyle' : (splitDays[selectedDay]?.name || 'Workout'),
        week_number: weekNumber,
        date: saveDate,
        exercises,
        durationMinutes: times.durationMinutes,
        startedAt: times.startedAt,
        completedAt: times.completedAt,
      });
      // Remember which exercises the user actually trained (for the picker).
      recordUsage(
        exercises.filter(ex => ex.sets.some(s => s.completed)).map(ex => ex.name)
      );
      clearDraft();
      const isToday = localDateKey(saveDate) === localDateKey(new Date());
      if (!navigator.onLine) {
        toast.success('Workout saved offline — will sync when back online 📴');
      } else if (!isToday) {
        // Make back-dated saves explicit so a session never silently lands on
        // the wrong day again.
        toast.success(`Workout logged for ${saveDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} 💪`);
      } else {
        toast.success('Workout logged! 💪');
      }

      navigate('/app');
    } catch (error: any) {
      console.error('[FinishWorkout] Error:', error);
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    }
  };

  const hasCompletedProgress = exercises.some(ex => ex.sets.some(s => s.completed));

  const handleBack = () => {
    if (step === 'review') {
      // An active session must never be dropped by a back tap — offer to pause
      // it (draft stays saved) or discard it explicitly.
      if (hasCompletedProgress || workoutStartTime) {
        setShowExitDialog(true);
        return;
      }
      setExercises([]);
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

  // Leave the session running in the background — the draft is already saved,
  // so the Resume card on Today (and here) picks it right back up.
  const handlePauseAndExit = () => {
    setShowExitDialog(false);
    toast.info('Session saved — resume it anytime');
    navigate('/app');
  };

  const handleDiscardSession = () => {
    setShowExitDialog(false);
    clearDraft();
    setExercises([]);
    setWorkoutStartTime(null);
    setManualStart(null);
    setManualDuration(null);
    setDraftRestored(true);
    setStep('select-day');
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
      setExercises(buildExercisesFromTemplate(dayInfo, lastUsedMap, preferences?.fitness_goal, preferredVariants, preferences?.training_focus as TrainingFocus | null));
    }
    
  };

  // Change training split (persists to preferences)
  const handleSplitChange = async (newSplit: TrainingSplit) => {
    try {
      await updatePreferences.mutateAsync({ training_split: newSplit });
      // Reset selection since days changed
      setSelectedDay('');
      setExercises([]);
      setStep('select-day');
      // A saved draft from the OLD split (e.g. a Push A session started before
      // switching to Full Body) must not survive the switch — the draft-restore
      // effect on mount would otherwise repopulate the exercise list with the
      // previous split's exercises the next time this page loads, even though
      // the day picker correctly shows the new split.
      clearDraft();
    } catch (error) {
      toast.error('Failed to change split — please try again');
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
              {draft && draft.exercises?.length > 0 && (
                <button
                  onClick={handleResumeDraft}
                  className="w-full rounded-[24px] bg-foreground text-background p-5 flex items-center gap-3 text-left active:scale-[.99] transition-transform"
                >
                  <span className="h-10 w-10 rounded-xl bg-background/15 flex items-center justify-center">
                    <Dumbbell className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-bold tracking-[.16em] opacity-60">RESUME SESSION</span>
                    <span className="block text-xl font-bold mt-1">{draft.exercises[draft.currentExerciseIndex]?.name || draft.dayName}</span>
                    <span className="block text-xs opacity-65 mt-1">Set {(draft.currentSetIndex || 0) + 1} · {draft.dayName}</span>
                  </span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center justify-between">
                <span className="type-caption">Logging for</span>
                <WorkoutDateSelector date={selectedDate} onChange={(d) => { setDateTouched(true); setSelectedDate(d); }} />
              </div>
              <DaySelectorWithCheckin
                selectedDay={selectedDay}
                selectedDate={selectedDate}
                onSelect={handleDaySelect}
              />


              {preferences?.adaptive_mode_enabled && (
                <motion.div variants={staggerItem}>
                  <AdaptiveSuggestionsCard />
                </motion.div>
              )}

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
              </div>
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
                    <p className="text-xs text-muted-foreground">{selectedDay === 'custom' ? 'Custom Session' : (dayData?.focus || '')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-lg font-bold tabular-nums">
                      {completedSets}/{totalSets}
                    </span>
                    <p className="text-xs text-muted-foreground uppercase">SETS</p>
                  </div>
                  <button
                    onClick={() => setShowTimeDialog(true)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
                    title="Set session time"
                    aria-label="Set session start time and duration"
                  >
                    <Clock size={14} />
                  </button>
                  <button
                    onClick={handleEditExercises}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
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
                    defaultRestSeconds={preferences?.default_rest_seconds}
                    autoRestTimer={preferences?.auto_rest_timer}
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

      {/* Switching day over an in-progress session */}
      <AlertDialog open={pendingDaySelect !== null} onOpenChange={(open) => { if (!open) setPendingDaySelect(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard current session?</AlertDialogTitle>
            <AlertDialogDescription>
              You have logged sets in this session. Switching days rebuilds the exercise list and discards them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDaySelect(null)}>Keep session</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDaySelect) applyDaySelect(pendingDaySelect.day, pendingDaySelect.date, pendingDaySelect.week);
                setPendingDaySelect(null);
              }}
            >
              Switch & discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leaving an active session */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this session?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress is saved. You can pause and resume it later, or discard it completely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <button
              type="button"
              onClick={handleDiscardSession}
              className="h-10 px-4 rounded-xl border border-destructive/30 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              Discard
            </button>
            <AlertDialogAction onClick={handlePauseAndExit}>Pause & exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual session time (back-dated logging or corrections) */}
      <SessionTimeDialog
        open={showTimeDialog}
        onOpenChange={setShowTimeDialog}
        startTime={manualStart ?? workoutStartTime}
        durationMinutes={manualDuration}
        date={selectedDate}
        onSave={(start, mins) => { setManualStart(start); setManualDuration(mins); }}
        onClear={manualStart ? () => { setManualStart(null); setManualDuration(null); } : undefined}
      />
    </MainLayout>
  );
}
