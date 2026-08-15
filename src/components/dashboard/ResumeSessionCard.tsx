import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { NextWorkoutCard } from '@/components/dashboard/NextWorkoutCard';
import { useLogDate } from '@/contexts/LogDateContext';
import { useDraftWorkout, isResumableDraft, draftDateKey } from '@/hooks/useDraftWorkout';

/**
 * Shows the resume entry point only when a genuinely resumable paused draft
 * exists for the day currently selected on the dashboard. Otherwise the normal
 * "next workout" card is shown, so resume can never point at a dead draft.
 */
export function ResumeSessionCard() {
  const navigate = useNavigate();
  const { draft } = useDraftWorkout();
  const { dateStr } = useLogDate();

  const resumable = isResumableDraft(draft) && draftDateKey(draft!) === dateStr;
  if (!resumable || !draft) return <NextWorkoutCard />;

  return (
    <button
      onClick={() => navigate(draft.resumePath || '/app/log')}
      className="w-full rounded-[24px] bg-foreground text-background p-5 flex items-center gap-3 text-left active:scale-[.99] transition-transform"
    >
      <span className="h-10 w-10 rounded-xl bg-background/15 flex items-center justify-center">
        <Dumbbell className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block text-xs font-bold tracking-[.16em] opacity-60">RESUME</span>
        <span className="block text-xl font-bold mt-1">
          {draft.exercises[draft.currentExerciseIndex]?.name || draft.dayName}
        </span>
        <span className="block text-xs opacity-65 mt-1">
          Set {(draft.currentSetIndex || 0) + 1} · {draft.dayName}
        </span>
      </span>
      <ChevronRight className="h-5 w-5" />
    </button>
  );
}
