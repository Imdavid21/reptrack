import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getQueuedItems } from '@/lib/offlineSyncQueue';
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

/**
 * AdaptiveWorkout deliberately owns the workout transaction and draft. This
 * small route-level observer adds a completion screen without duplicating that
 * transaction: a draft only becomes a completion when the same saveId exists
 * either on the server or in the existing offline queue.
 */
export function WorkoutCompletionWatcher() {
  const { user } = useAuth();
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
          // A draft can also disappear when the user deliberately discards it.
          // No matching server/queue transaction means this was not a finish.
          previousDraft.current = null;
          return;
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
  }, [user, location.pathname, navigate]);

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
