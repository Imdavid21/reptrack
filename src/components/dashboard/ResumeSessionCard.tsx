import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Dumbbell } from 'lucide-react';
import { NextWorkoutCard } from '@/components/dashboard/NextWorkoutCard';
import { useLogDate } from '@/contexts/LogDateContext';
import { useDraftWorkout, isResumableDraft, draftDateKey } from '@/hooks/useDraftWorkout';
import { useWorkouts } from '@/hooks/useWorkouts';

export function ResumeSessionCard() {
  const navigate = useNavigate();
  const { draft } = useDraftWorkout();
  const { dateStr } = useLogDate();
  const { workouts } = useWorkouts();

  const resumable = isResumableDraft(draft) && draftDateKey(draft!) === dateStr;
  if (resumable && draft) {
    const exercise = draft.exercises[draft.currentExerciseIndex];
    const totalExercises = draft.exercises.length;
    const completed = draft.exercises.reduce((sum, item) => sum + item.sets.filter(set => set.completed).length, 0);
    const total = draft.exercises.reduce((sum, item) => sum + item.sets.length, 0);
    return (
      <button
        onClick={() => navigate(draft.resumePath || '/app/train')}
        className="w-full rounded-[24px] bg-foreground text-background p-5 flex items-center gap-3 text-left active:opacity-90 transition-opacity"
      >
        <span className="h-10 w-10 rounded-xl bg-background/15 flex items-center justify-center shrink-0"><Dumbbell className="h-5 w-5" /></span>
        <span className="flex-1 min-w-0">
          <span className="block type-eyebrow text-primary-foreground/70">Resume</span>
          <span className="block text-xl font-bold mt-1 truncate">{exercise?.name || draft.dayName}</span>
          <span className="block text-xs opacity-70 mt-1 tabular-nums">Set {(draft.currentSetIndex || 0) + 1} · Exercise {(draft.currentExerciseIndex || 0) + 1}/{totalExercises} · {completed}/{total} sets</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0" />
      </button>
    );
  }

  const completedWorkout = workouts.find(workout => workout.date === dateStr && Boolean(workout.completed_at));
  if (completedWorkout) {
    const completedSets = (completedWorkout.exercises || []).reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
    return (
      <button onClick={() => navigate(`/app/progress/workout/${completedWorkout.id}`)} className="w-full rounded-[24px] border border-border bg-card p-5 flex items-center gap-3 text-left hover:bg-muted/25 transition-colors">
        <span className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0"><Check className="h-5 w-5" /></span>
        <span className="flex-1 min-w-0">
          <span className="block type-eyebrow">Workout complete</span>
          <span className="block text-xl font-bold mt-1 truncate">{completedWorkout.day_name}</span>
          <span className="block type-caption mt-1 tabular-nums">{completedWorkout.workout_duration_minutes ? `${Math.round(completedWorkout.workout_duration_minutes)} min` : 'Completed'}{completedSets ? ` · ${completedSets} sets` : ''}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </button>
    );
  }

  return <NextWorkoutCard />;
}
