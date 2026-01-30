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
  step: 'select-day' | 'exercises';
  lastSavedAt: string;
  workoutStartTime?: string;
}

const DRAFT_KEY = 'fittrack_draft_workout';

export function useDraftWorkout() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<DraftWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pendingSaveRef = useRef<DraftWorkout | null>(null);

  // Get storage key for current user
  const getKey = useCallback(() => {
    return user ? `${DRAFT_KEY}_${user.id}` : null;
  }, [user]);

  // Load draft from localStorage on mount
  useEffect(() => {
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
        // Check if draft is from today (don't restore old drafts)
        const draftDate = new Date(parsed.date).toDateString();
        const today = new Date().toDateString();
        if (draftDate === today) {
          setDraft(parsed);
        } else {
          // Clear old drafts
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.error('Failed to parse draft workout:', e);
        localStorage.removeItem(key);
      }
    }
    setLoaded(true);
  }, [user, getKey]);

  // iOS visibility handler - save immediately when app is backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingSaveRef.current) {
        const key = getKey();
        if (key) {
          // Synchronous save - critical for iOS which may kill the app
          try {
            localStorage.setItem(key, JSON.stringify(pendingSaveRef.current));
          } catch (e) {
            console.error('Failed to save draft on visibility change:', e);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle pagehide for iOS Safari
    const handlePageHide = () => {
      if (pendingSaveRef.current) {
        const key = getKey();
        if (key) {
          try {
            localStorage.setItem(key, JSON.stringify(pendingSaveRef.current));
          } catch (e) {
            console.error('Failed to save draft on pagehide:', e);
          }
        }
      }
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
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
    loaded,
    saveDraft,
    clearDraft,
    hasProgress,
  };
}
