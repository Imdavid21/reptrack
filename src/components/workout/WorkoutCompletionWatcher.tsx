import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdvancedMode, enqueueCoachEvent } from '@/hooks/useAdvancedMode';
import { supabase } from '@/integrations/supabase/client';
import { getQueuedItems } from '@/lib/offlineSyncQueue';
import { sessionQuality } from '@/lib/advanced/engine';
import type { DraftWorkout } from '@/hooks/useDraftWorkout';

const SNAPSHOT_PREFIX = 'reptrack-workout-completion:';

function readDraft(userId: string): DraftWorkout | null {
  try {
    const raw = window.localStorage.getItem(`fittrack_draft_workout_${userId}`);
    return raw ? JSON.parse(raw) as DraftWorkout : null;
  } catch {
    return null;
  }
}

function hasLoggedWork(draft: DraftWorkout | null) {
  return !!draft?.exercises?.some(exercise => exercise.sets.some(set => set.completed));
}

function numeric(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function completionPayload(draft: DraftWorkout) {
  const allSets = draft.exercises.flatMap(exercise => exercise.sets.map(set => ({ exercise: exercise.name, set })));
  const completed = allSets.filter(row => row.set.completed);
  const changed = completed.filter(({ set }) => {
    const targetWeight = numeric(set.targetWeight), actualWeight = numeric(set.actualWeight);
    const targetReps = numeric(set.targetReps), actualReps = numeric(set.actualReps);
    return (targetWeight > 0 && actualWeight > 0 && Math.abs(targetWeight - actualWeight) > 0.001)
      || (targetReps > 0 && actualReps > 0 && targetReps !== actualReps);
  });
  const quality = sessionQuality({
    completedSets: completed.length,
    plannedSets: allSets.length,
    progressionWins: 0,
    regressions: 0,
    durationMinutes: Math.max(1, Math.round((draft.elapsedSeconds || 0) / 60)),
  });
  return {
    workout_id: draft.saveId,
    session: draft.dayName,
    workout_date: draft.date,
    duration_minutes: Math.max(1, Math.round((draft.elapsedSeconds || 0) / 60)),
    planned_sets: allSets.length,
    completed_sets: completed.length,
    completion_percent: quality.completion,
    changed_sets: changed.length,
    changed_exercises: [...new Set(changed.map(row => row.exercise))],
    flags: quality.flags,
    review: quality.review,
    source: 'reptrack_advanced_mode',
  };
}

export function WorkoutCompletionWatcher() {
  const { user } = useAuth();
  const advanced = useAdvancedMode();
  const location = useLocation();
  const navigate = useNavigate();
  const previousDraft = useRef<DraftWorkout | null>(null);
  const handling = useRef(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const current = readDraft(user.id);
      if (current) {
        if (hasLoggedWork(current)) previousDraft.current = current;
        return;
      }

      const finished = previousDraft.current;
      if (!finished?.saveId || !hasLoggedWork(finished) || handling.current) return;
      if (!location.pathname.startsWith('/app/train') && location.pathname !== '/app/log') {
        previousDraft.current = null;
        return;
      }

      handling.current = true;
      try {
        const [{ data: stored }, queued] = await Promise.all([
          supabase.from('workouts').select('id').eq('id', finished.saveId).eq('user_id', user.id).maybeSingle(),
          getQueuedItems().catch(() => []),
        ]);
        const queuedWorkout = queued.some(item => item.table === 'workouts' && item.operation === 'insert' && item.payload?.id === finished.saveId);
        if (!stored && !queuedWorkout) {
          previousDraft.current = null;
          return;
        }

        if (advanced.settings.enabled) {
          const payload = completionPayload(finished);
          const eventType = payload.review ? 'session_review_required' : 'workout_completed';
          void enqueueCoachEvent(user.id, eventType, payload, `workout:${finished.saveId}`).catch(error => {
            console.warn('[WorkoutCompletionWatcher] coach event unavailable', error);
          });
        }

        window.sessionStorage.setItem(`${SNAPSHOT_PREFIX}${finished.saveId}`, JSON.stringify(finished));
        previousDraft.current = null;
        navigate(`/app/progress/workout/${finished.saveId}?completed=1${queuedWorkout && !stored ? '&pending=1' : ''}`, { replace: true });
      } finally {
        handling.current = false;
      }
    };

    void check();
    const timer = window.setInterval(() => { void check(); }, 500);
    return () => window.clearInterval(timer);
  }, [user, advanced.settings.enabled, location.pathname, navigate]);

  return null;
}

export function readCompletionSnapshot(workoutId: string): DraftWorkout | null {
  try {
    const raw = window.sessionStorage.getItem(`${SNAPSHOT_PREFIX}${workoutId}`);
    return raw ? JSON.parse(raw) as DraftWorkout : null;
  } catch {
    return null;
  }
}
