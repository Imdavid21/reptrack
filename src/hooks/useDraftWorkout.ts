import { useState, useEffect, useCallback } from 'react';
import { WorkoutExercise, Habits, PreCheckin, PostCheckin } from './useWorkouts';
import { useAuth } from './useAuth';

export interface DraftWorkout {
  day: string;
  dayName: string;
  date: string;
  weekNumber: number;
  exercises: WorkoutExercise[];
  habits: Habits;
  currentExerciseIndex: number;
  step: 'select-day' | 'pre-checkin' | 'exercises' | 'post-checkin' | 'habits';
  lastSavedAt: string;
  preCheckin?: PreCheckin;
  postCheckin?: PostCheckin;
  workoutStartTime?: string;
}

const DRAFT_KEY = 'fittrack_draft_workout';

export function useDraftWorkout() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<DraftWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }

    const key = `${DRAFT_KEY}_${user.id}`;
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
  }, [user]);

  // Save draft to localStorage - use ref to avoid dependency loop
  const saveDraft = useCallback((draftData: Omit<DraftWorkout, 'lastSavedAt'>) => {
    if (!user) return;

    const key = `${DRAFT_KEY}_${user.id}`;
    const newDraft: DraftWorkout = {
      ...draftData,
      lastSavedAt: new Date().toISOString(),
    };

    setDraft(newDraft);
    localStorage.setItem(key, JSON.stringify(newDraft));
  }, [user]);

  // Clear draft after successful submission
  const clearDraft = useCallback(() => {
    if (!user) return;
    const key = `${DRAFT_KEY}_${user.id}`;
    localStorage.removeItem(key);
    setDraft(null);
  }, [user]);

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
