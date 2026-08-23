import { useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { isResumableDraft, useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useLiveWorkoutSession } from '@/hooks/useLiveWorkoutSession';

/**
 * Keeps the existing live-workout MCP/coach capability working after the Train
 * rewrite without turning AI into a primary destination. The existing draft is
 * the source of active-session truth; this component adds no new persistence.
 */
export function LiveWorkoutCoachBridge() {
  const location = useLocation();
  const { draft } = useDraftWorkout();
  const inTrain = location.pathname.startsWith('/app/train');
  const active = inTrain && isResumableDraft(draft);
  const wasActive = useRef(false);

  const live = useLiveWorkoutSession({
    active,
    date: draft?.date || '',
    day: draft?.day || '',
    dayName: draft?.dayName || '',
    exercises: draft?.exercises || [],
    exerciseIndex: draft?.currentExerciseIndex || 0,
    setIndex: draft?.currentSetIndex || 0,
    elapsedSeconds: draft?.elapsedSeconds || 0,
    startedAt: draft?.workoutStartTime || null,
  });

  useEffect(() => {
    if (active) wasActive.current = true;
    if (!active && wasActive.current) {
      wasActive.current = false;
      void live.endSession();
    }
  }, [active, live.endSession]);

  useEffect(() => () => {
    if (wasActive.current) void live.endSession();
  }, [live.endSession]);

  if (!active || (!live.cue && !live.coachNote)) return null;

  return (
    <aside
      className="fixed left-1/2 z-[56] w-[min(calc(100%-24px),520px)] -translate-x-1/2 rounded-2xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur"
      style={{ top: 'max(12px, env(safe-area-inset-top))' }}
      aria-live="polite"
    >
      {live.cue && (
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="type-caption">Coach cue</div>
            <p className="mt-1 text-sm leading-5">{live.cue.message}</p>
          </div>
          <button onClick={live.dismissCue} aria-label="Dismiss coach cue" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      )}
      {live.coachNote && (
        <div className={live.cue ? 'mt-3 border-t border-border pt-3' : ''}>
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1"><div className="type-caption">Coach note</div><p className="mt-1 text-sm leading-5">{live.coachNote}</p></div>
            <button onClick={live.dismissNote} aria-label="Dismiss coach note" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </aside>
  );
}
