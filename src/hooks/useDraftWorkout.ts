import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkoutExercise, Habits } from './useWorkouts';
import { useAuth } from './useAuth';

export interface DraftWorkout {
  day: string;
  dayName: string;
  date: string;
  weekNumber: number;
  exercises: WorkoutExercise[];
  habits: Habits;
  currentExerciseIndex: number;
  currentSetIndex: number;
  step: 'select-day' | 'review' | 'exercises';
  lastSavedAt: string;
  workoutStartTime?: string;
  /** Manually set session start (used for back-dated logging). */
  manualStart?: string;
  /** Manually set session duration in minutes (used for back-dated logging). */
  manualDuration?: number;

  /** Stable client id for the eventual workout row, so an interrupted save can
   *  be retried idempotently after resuming. */
  saveId?: string;

  /** Route to return to when resuming (the screen the session was paused from). */
  resumePath?: string;

  elapsedSeconds?: number;
  pausedSeconds?: number;
  pauseStartedAt?: string;
  pauseIntervals?: Array<{ pausedAt: string; resumedAt?: string }>;
}

const DRAFT_KEY = 'fittrack_draft_workout';

/** The local yyyy-MM-dd day a draft belongs to. */
export function draftDateKey(draft: DraftWorkout): string {
  const parsed = draft.date ? new Date(draft.date) : new Date();
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/**
 * A draft can only be resumed when it is an in-progress exercise session that
 * still holds exercises, has at least one logged set, and was saved within the
 * 24h retention window. Drafts with no logged sets carry no progress, so they
 * are treated as dead state rather than a resumable session.
 */
export function isResumableDraft(draft: DraftWorkout | null | undefined): boolean {
  if (!draft) return false;
  if (!Array.isArray(draft.exercises) || draft.exercises.length === 0) return false;
  if (draft.step === 'select-day') return false;
  if (!draft.exercises.some(ex => ex.sets?.some(set => set.completed))) return false;
  const savedAt = new Date(draft.lastSavedAt ?? draft.date).getTime();
  if (Number.isNaN(savedAt)) return false;
  return (Date.now() - savedAt) / 3_600_000 < 24;
}


export function useDraftWorkout() {
  const { user, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState<DraftWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pendingSaveRef = useRef<DraftWorkout | null>(null);

  // Get storage key for current user
  const getKey = useCallback(() => {
    return user ? `${DRAFT_KEY}_${user.id}` : null;
  }, [user]);

  // Load draft from localStorage on mount
  useEffect(() => {
    // Wait for auth to settle. Reporting "loaded with no draft" while the
    // session is still resolving makes consumers mark the restore as done and
    // silently skip the paused session that arrives a tick later.
    if (authLoading) return;
    if (!user) {
      setLoaded(true);
      return;
    }

    const key = getKey();
    if (!key) return;

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DraftWorkout;
        // Staleness must be measured from when the draft was last SAVED, not from
        // parsed.date - parsed.date is the workout's (possibly back-dated) logging
        // date, so basing staleness on it makes any back-dated session look >24h
        // old the instant it's saved and silently discards the in-progress sets.
        const referenceTime = parsed.lastSavedAt ?? parsed.date;
        const draftTime = new Date(referenceTime).getTime();
        const now = Date.now();
        const hoursSinceDraft = (now - draftTime) / (1000 * 60 * 60);
        if (hoursSinceDraft < 24) {
          setDraft(parsed);
        } else {
          // Clear stale drafts older than 24h
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.error('Failed to parse draft workout:', e);
        localStorage.removeItem(key);
      }
    }
    setLoaded(true);
  }, [user, authLoading, getKey]);

  // Aggressive persistence - save immediately when app is backgrounded, closed, or killed
  useEffect(() => {
    const flushDraft = () => {
      if (pendingSaveRef.current) {
        const key = getKey();
        if (key) {
          try {
            localStorage.setItem(key, JSON.stringify(pendingSaveRef.current));
          } catch (e) {
            console.error('Failed to persist draft:', e);
          }
        }
      }
    };

    // iOS: app backgrounded
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushDraft();
    };

    // Safari iOS: page being unloaded
    const handlePageHide = () => flushDraft();

    // Desktop/Android: tab or browser being closed
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      flushDraft();
      // Show browser confirmation dialog if there's an active workout
      if (pendingSaveRef.current && pendingSaveRef.current.step === 'exercises') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Periodic background save every 5s as a safety net against force kills
    const intervalId = setInterval(flushDraft, 5000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [getKey]);

  // Save draft to localStorage
  const saveDraft = useCallback((draftData: Omit<DraftWorkout, 'lastSavedAt'>) => {
    if (!user) return;

    const key = getKey();
    if (!key) return;

    const newDraft: DraftWorkout = {
      ...draftData,
      currentSetIndex: draftData.currentSetIndex ?? 0,
      lastSavedAt: new Date().toISOString(),
    };

    // Keep ref updated for visibility handler
    pendingSaveRef.current = newDraft;
    setDraft(newDraft);
    localStorage.setItem(key, JSON.stringify(newDraft));
  }, [user, getKey]);

  // Clear draft after successful submission
  const clearDraft = useCallback(() => {
    if (!user) return;
    const key = getKey();
    if (!key) return;
    
    localStorage.removeItem(key);
    setDraft(null);
    pendingSaveRef.current = null;
  }, [user, getKey]);

  // Check if there are any completed sets in draft
  const hasProgress = draft?.exercises?.some(ex => 
    ex.sets.some(s => s.completed)
  ) ?? false;

  return {
    draft,
    resumable: isResumableDraft(draft),
    loaded,
    saveDraft,
    clearDraft,
    hasProgress,
  };
}
