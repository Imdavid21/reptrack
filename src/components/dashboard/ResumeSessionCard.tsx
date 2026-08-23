import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { NextWorkoutCard } from '@/components/dashboard/NextWorkoutCard';
import { useLogDate } from '@/contexts/LogDateContext';
import { useDraftWorkout, isResumableDraft, draftDateKey } from '@/hooks/useDraftWorkout';

export function ResumeSessionCard() {
  const navigate = useNavigate();
  const { draft } = useDraftWorkout();
  const { dateStr } = useLogDate();

  const resumable = isResumableDraft(draft) && draftDateKey(draft!) === dateStr;
  if (!resumable || !draft) return <NextWorkoutCard />;

  const exercise = draft.exercises[draft.currentExerciseIndex];
  const totalExercises = draft.exercises.length;
  return (
    <button
      onClick={() => navigate(draft.resumePath || '/app/train')}
      className="w-full rounded-[24px] bg-foreground text-background p-5 flex items-center gap-3 text-left active:opacity-90 transition-opacity"
    >
      <span className="h-10 w-10 rounded-xl bg-background/15 flex items-center justify-center shrink-0"><Dumbbell className="h-5 w-5" /></span>
      <span className="flex-1 min-w-0">
        <span className="block type-eyebrow text-primary-foreground/70">Resume</span>
        <span className="block text-xl font-bold mt-1 truncate">{exercise?.name || draft.dayName}</span>
        <span className="block text-xs opacity-70 mt-1 tabular-nums">Set {(draft.currentSetIndex || 0) + 1} · Exercise {(draft.currentExerciseIndex || 0) + 1}/{totalExercises} · {draft.dayName}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" />
    </button>
  );
}
