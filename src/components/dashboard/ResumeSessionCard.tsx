import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { NextWorkoutCard } from '@/components/dashboard/NextWorkoutCard';
import { useLogDate } from '@/contexts/LogDateContext';
import { useDraftWorkout, isResumableDraft, draftDateKey } from '@/hooks/useDraftWorkout';
import { Button } from '@/components/ui/button';

/**
 * Shows the resume entry point only when a genuinely resumable paused draft
 * exists for the day currently selected on the dashboard. Otherwise the normal
 * "next workout" card is shown, so resume can never point at a dead draft.
 */
export function ResumeSessionCard() {
  const navigate = useNavigate();
  const { draft, loaded, syncStatus, conflict } = useDraftWorkout();
  const { dateStr } = useLogDate();

  if (!loaded) return null;
  const resumable = isResumableDraft(draft) && (!!draft && draftDateKey(draft) === dateStr || !!conflict);
  if (!resumable || !draft) return <NextWorkoutCard />;

  return (
    <Button
      onClick={() => navigate(draft.resumePath || '/app/train')}
      className="w-full h-auto min-h-24 rounded-xl bg-primary text-primary-foreground p-5 flex items-center gap-3 text-left whitespace-normal"
    >
      <span className="h-10 w-10 rounded-xl bg-background/15 flex items-center justify-center">
        <Dumbbell className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block type-eyebrow text-primary-foreground/70">{conflict ? 'Choose saved workout' : 'Resume workout'}</span>
        <span className="block text-xl font-bold mt-1">
          {draft.exercises[draft.currentExerciseIndex]?.name || draft.dayName}
        </span>
        <span className="block text-xs opacity-65 mt-1">
          Set {(draft.currentSetIndex || 0) + 1} · {draft.dayName}
        </span>
        <span className="block text-xs opacity-65 mt-1">{syncStatus === 'synced' ? 'Saved to account' : 'Saved on this device'} · {new Date(draft.lastSavedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
      </span>
      <ChevronRight className="h-5 w-5" />
    </Button>
  );
}
