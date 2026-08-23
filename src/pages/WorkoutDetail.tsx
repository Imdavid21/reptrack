import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Check, ChevronRight, Edit2, Loader2, Plus, Trash2, Undo2, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkoutDetails } from '@/hooks/useWorkoutDetails';
import { useWorkouts } from '@/hooks/useWorkouts';
import { parseDateKey } from '@/lib/dateKey';
import { Input } from '@/components/ui/input';
import { AddExerciseSheet, NewSetRow } from '@/components/workout/AddExerciseSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { readCompletionSnapshot } from '@/components/workout/WorkoutCompletionWatcher';

interface InlineEdit {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

type DetailSet = {
  id: string;
  name: string;
  category: string;
  target_weight: string | null;
  target_reps: string | null;
  actual_weight: string | null;
  actual_reps: string | null;
  completed: boolean;
  sort_order: number;
};

function baseName(name: string) {
  return name.replace(/ \(Set \d+\)$/, '').trim();
}

function groupSets(sets: DetailSet[]) {
  return sets.reduce((acc, set) => {
    const name = baseName(set.name);
    (acc[name] ||= []).push(set);
    return acc;
  }, {} as Record<string, DetailSet[]>);
}

function setScore(set: DetailSet) {
  if (!set.completed) return 0;
  const weight = Number.parseFloat(set.actual_weight || '0') || 0;
  const reps = Number.parseFloat(set.actual_reps || '0') || 0;
  return weight > 0 ? weight * (1 + reps / 30) : reps;
}

function bestSet(sets: DetailSet[]) {
  return [...sets].filter(set => set.completed).sort((a, b) => setScore(b) - setScore(a))[0] || null;
}

function bestLabel(set: DetailSet | null) {
  if (!set) return '—';
  const weight = Number.parseFloat(set.actual_weight || '0') || 0;
  const reps = Number.parseFloat(set.actual_reps || '0') || 0;
  return weight > 0 ? `${Number(weight.toFixed(2))} × ${Number(reps.toFixed(0))}` : `${Number(reps.toFixed(0))} reps`;
}

function volume(sets: DetailSet[]) {
  return Math.round(sets.filter(set => set.completed).reduce((sum, set) => {
    const weight = Number.parseFloat(set.actual_weight || '0') || 0;
    const reps = Number.parseFloat(set.actual_reps || '0') || 0;
    return sum + weight * reps;
  }, 0));
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return (current - previous) / previous * 100;
}

function deltaLabel(value: number, unit: string) {
  if (value === 0) return `No change`;
  return `${value > 0 ? '+' : '−'}${Math.abs(value)} ${unit}`;
}

export default function WorkoutDetail() {
  const { workoutId = '' } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const completedMode = searchParams.get('completed') === '1';
  const pendingMode = searchParams.get('pending') === '1';
  const completionSnapshot = useMemo(() => workoutId ? readCompletionSnapshot(workoutId) : null, [workoutId]);

  const currentDetails = useWorkoutDetails(workoutId || null);
  const { workouts } = useWorkouts();
  const workout = currentDetails.workout;

  const previousId = useMemo(() => {
    if (!workout) return null;
    const currentTime = new Date((workout as typeof workout & { completed_at?: string; created_at?: string }).completed_at || workout.created_at).getTime();
    const candidates = workouts.filter(candidate => {
      if (candidate.id === workout.id || candidate.day_name !== workout.day_name || !candidate.completed_at) return false;
      if ((candidate as typeof candidate & { is_skipped?: boolean }).is_skipped) return false;
      return new Date(candidate.completed_at).getTime() < currentTime;
    });
    candidates.sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
    return candidates[0]?.id || null;
  }, [workout, workouts]);
  const previousDetails = useWorkoutDetails(previousId);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<InlineEdit | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<{ baseName: string; value: string } | null>(null);
  const [deletedSet, setDeletedSet] = useState<DetailSet | null>(null);

  const grouped = useMemo(() => workout ? groupSets(workout.exercises as DetailSet[]) : {}, [workout]);
  const previousGrouped = useMemo(() => previousDetails.workout ? groupSets(previousDetails.workout.exercises as DetailSet[]) : {}, [previousDetails.workout]);

  const comparison = useMemo(() => {
    if (!workout) return null;
    const currentSets = workout.exercises as DetailSet[];
    const previousSets = previousDetails.workout?.exercises as DetailSet[] | undefined;
    const currentDuration = Math.round(Number((workout as typeof workout & { workout_duration_minutes?: number }).workout_duration_minutes || 0));
    const previousDuration = Math.round(Number((previousDetails.workout as typeof previousDetails.workout & { workout_duration_minutes?: number } | null)?.workout_duration_minutes || 0));
    const currentVolume = volume(currentSets);
    const previousVolume = previousSets ? volume(previousSets) : 0;
    const wins = Object.entries(grouped).filter(([name, sets]) => {
      const before = previousGrouped[name];
      if (!before?.length) return false;
      const currentBest = bestSet(sets);
      const previousBest = bestSet(before);
      return !!currentBest && !!previousBest && setScore(currentBest) > setScore(previousBest) * 1.002;
    }).length;
    return {
      currentDuration,
      previousDuration,
      currentSets: currentSets.filter(set => set.completed).length,
      previousSets: previousSets?.filter(set => set.completed).length || 0,
      currentVolume,
      previousVolume,
      volumeChange: percentChange(currentVolume, previousVolume),
      wins,
    };
  }, [workout, previousDetails.workout, grouped, previousGrouped]);

  if (currentDetails.isLoading && !(pendingMode && completionSnapshot)) {
    return <MainLayout showBack backTo="/app/progress"><div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div></MainLayout>;
  }

  if (!workout && pendingMode && completionSnapshot) {
    const completedSets = completionSnapshot.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
    const duration = Math.max(1, Math.round((completionSnapshot.elapsedSeconds || 0) / 60));
    return <MainLayout hideNav>
      <div className="mx-auto max-w-[680px] pb-10">
        <section className="pt-5 pb-7 border-b border-border">
          <div className="type-eyebrow">Workout complete</div>
          <h1 className="type-page-title mt-1">{completionSnapshot.dayName}</h1>
          <div className="mt-5 grid grid-cols-2 gap-4"><div><div className="type-caption">Duration</div><div className="text-2xl font-semibold tabular-nums">{duration} min</div></div><div><div className="type-caption">Working sets</div><div className="text-2xl font-semibold tabular-nums">{completedSets}</div></div></div>
          <div className="mt-5 rounded-xl bg-muted/40 p-3 text-sm"><span className="font-semibold">Saved on device.</span> <span className="text-muted-foreground">This session is waiting to sync. You can close RepTrack; the existing offline queue will retry it.</span></div>
        </section>
        <div className="py-5 divide-y divide-border">{completionSnapshot.exercises.filter(exercise => exercise.sets.some(set => set.completed)).map(exercise => <div key={exercise.name} className="py-4"><div className="text-sm font-semibold">{exercise.name}</div><div className="mt-2 flex flex-wrap gap-2">{exercise.sets.filter(set => set.completed).map(set => <span key={set.setNumber} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium tabular-nums">{set.actualWeight ? `${set.actualWeight} × ${set.actualReps}` : `${set.actualReps} reps`}</span>)}</div></div>)}</div>
        <button onClick={() => navigate('/app', { replace: true })} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold">Done</button>
      </div>
    </MainLayout>;
  }

  if (!workout) {
    return <MainLayout showBack backTo="/app/progress"><div className="py-14 text-center"><p className="font-semibold">Workout not found.</p><button onClick={() => navigate('/app/progress/history')} className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-4">Back to timeline</button></div></MainLayout>;
  }

  const handleStartEdit = (set: DetailSet) => setEditingSet({ id: set.id, weight: set.actual_weight || set.target_weight || '', reps: set.actual_reps || set.target_reps || '', completed: set.completed });
  const handleSaveSet = async () => {
    if (!editingSet) return;
    try {
      await currentDetails.updateExercise({ id: editingSet.id, actual_weight: editingSet.weight, actual_reps: editingSet.reps, completed: editingSet.completed });
      setEditingSet(null);
    } catch { toast.error('Set was not updated.'); }
  };

  const handleDeleteSet = async (set: DetailSet) => {
    try {
      await currentDetails.deleteExercise(set.id);
      setDeletedSet(set);
    } catch { toast.error('Set was not deleted.'); }
  };

  const undoDeleteSet = async () => {
    if (!deletedSet || !workoutId) return;
    try {
      await currentDetails.createExercise({
        workout_id: workoutId,
        name: deletedSet.name,
        category: deletedSet.category,
        target_weight: deletedSet.target_weight || undefined,
        target_reps: deletedSet.target_reps || undefined,
        actual_weight: deletedSet.actual_weight || undefined,
        actual_reps: deletedSet.actual_reps || undefined,
        completed: deletedSet.completed,
        sort_order: deletedSet.sort_order,
      });
      setDeletedSet(null);
    } catch { toast.error('Could not restore the set.'); }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await currentDetails.deleteExerciseGroup((grouped[groupToDelete] || []).map(set => set.id));
      setGroupToDelete(null);
    } catch { toast.error('Exercise was not deleted.'); }
  };

  const handleSaveRename = async () => {
    if (!renamingGroup) return;
    const nextName = renamingGroup.value.trim();
    const sets = grouped[renamingGroup.baseName] || [];
    if (!nextName || nextName === renamingGroup.baseName) { setRenamingGroup(null); return; }
    try {
      await currentDetails.renameExerciseGroup({ updates: sets.map((set, index) => ({ id: set.id, name: `${nextName} (Set ${index + 1})` })) });
      setRenamingGroup(null);
    } catch { toast.error('Exercise was not renamed.'); }
  };

  const handleAddSet = async (name: string, sets: DetailSet[]) => {
    if (!workoutId) return;
    const last = sets[sets.length - 1];
    const currentMaxOrder = Math.max(...(workout.exercises as DetailSet[]).map(set => set.sort_order), 0);
    const weight = last?.actual_weight || last?.target_weight || '';
    const reps = last?.actual_reps || last?.target_reps || '';
    try {
      await currentDetails.createExercise({ workout_id: workoutId, name: `${name} (Set ${sets.length + 1})`, category: last?.category || 'Other', target_weight: weight, target_reps: reps, actual_weight: weight, actual_reps: reps, completed: Boolean(reps), sort_order: currentMaxOrder + 1 });
    } catch { toast.error('Set was not added.'); }
  };

  const handleAddExercise = async (exercise: { name: string; category: string; sets: NewSetRow[] }) => {
    if (!workoutId) return;
    const maxOrder = Math.max(...(workout.exercises as DetailSet[]).map(set => set.sort_order), 0);
    try {
      for (let index = 0; index < exercise.sets.length; index++) {
        const set = exercise.sets[index];
        await currentDetails.createExercise({ workout_id: workoutId, name: `${exercise.name} (Set ${index + 1})`, category: exercise.category, target_weight: set.weight, target_reps: set.reps, actual_weight: set.weight, actual_reps: set.reps, completed: Boolean(set.reps?.trim()), sort_order: maxOrder + 100 + index });
      }
      setIsAddSheetOpen(false);
    } catch { toast.error('Exercise was not added.'); }
  };

  const completedCount = workout.exercises.filter(set => set.completed).length;
  const duration = Math.round(Number((workout as typeof workout & { workout_duration_minutes?: number }).workout_duration_minutes || 0));

  return <MainLayout showBack={!completedMode} backTo="/app/progress/history" hideNav={completedMode} wide>
    <div className="mx-auto w-full max-w-[900px] pb-12">
      {completedMode ? (
        <section className="pt-4 pb-7 border-b border-border">
          <div className="type-eyebrow">Workout complete</div>
          <h1 className="type-page-title mt-1">{workout.day_name}</h1>
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-5">
            <div><div className="type-caption">Duration</div><div className="text-2xl font-semibold tabular-nums">{duration ? `${duration} min` : '—'}</div></div>
            <div><div className="type-caption">Working sets</div><div className="text-2xl font-semibold tabular-nums">{completedCount}</div></div>
            <div><div className="type-caption">Progression wins</div><div className="text-2xl font-semibold tabular-nums">{comparison?.wins ?? 0}</div></div>
            <div><div className="type-caption">Volume</div><div className="text-2xl font-semibold tabular-nums">{comparison?.currentVolume ? comparison.currentVolume.toLocaleString() : '—'}</div></div>
          </div>
          <div className="mt-6 flex gap-2"><button onClick={() => navigate('/app', { replace: true })} className="min-h-14 flex-1 rounded-2xl bg-foreground text-background font-semibold">Done</button><button onClick={() => document.getElementById('workout-review')?.scrollIntoView({ behavior: 'smooth' })} className="min-h-14 flex-1 rounded-2xl border border-border font-semibold">Review workout</button></div>
        </section>
      ) : (
        <header className="flex items-start justify-between gap-4 mb-5">
          <div><h1 className="type-page-title">{workout.day_name}</h1><p className="type-supporting mt-1">{format(parseDateKey(workout.date), 'EEEE, MMM d')}{duration ? ` · ${duration} min` : ''}</p></div>
          <button onClick={() => setIsEditMode(value => !value)} className={cn('min-h-11 px-3 rounded-xl text-sm font-semibold flex items-center gap-2', isEditMode ? 'bg-foreground text-background' : 'border border-border text-muted-foreground')}><Edit2 className="h-4 w-4"/>{isEditMode ? 'Done' : 'Edit'}</button>
        </header>
      )}

      {previousDetails.workout && comparison && <section className="py-5 border-b border-border" aria-label={`Comparison with previous ${workout.day_name}`}>
        <div className="flex items-end justify-between gap-3"><div><div className="type-eyebrow">Vs previous {workout.day_name}</div><div className="type-supporting mt-1">{previousDetails.workout.date}</div></div>{comparison.wins > 0 && <div className="text-sm font-semibold">{comparison.wins} {comparison.wins === 1 ? 'exercise improved' : 'exercises improved'}</div>}</div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><div className="type-caption">Duration</div><div className="text-sm font-semibold tabular-nums">{comparison.currentDuration || '—'} min</div>{comparison.currentDuration && comparison.previousDuration ? <div className="type-caption mt-0.5">{deltaLabel(comparison.currentDuration - comparison.previousDuration, 'min')}</div> : null}</div>
          <div><div className="type-caption">Sets</div><div className="text-sm font-semibold tabular-nums">{comparison.currentSets} vs {comparison.previousSets}</div></div>
          <div><div className="type-caption">Volume</div><div className="text-sm font-semibold tabular-nums">{comparison.currentVolume ? comparison.currentVolume.toLocaleString() : '—'}</div>{comparison.volumeChange != null && <div className="type-caption mt-0.5">{comparison.volumeChange > 0 ? '+' : ''}{comparison.volumeChange.toFixed(1)}%</div>}</div>
          <div><div className="type-caption">Progression</div><div className="text-sm font-semibold tabular-nums">{comparison.wins} wins</div></div>
        </div>
      </section>}

      {deletedSet && <div className="mt-4 rounded-xl border border-border bg-muted/35 px-3 py-2.5 flex items-center gap-3" role="status"><span className="text-sm flex-1">Set removed.</span><button onClick={undoDeleteSet} className="min-h-10 px-3 rounded-xl text-sm font-semibold flex items-center gap-1.5"><Undo2 className="h-4 w-4"/>Undo</button></div>}

      <div id="workout-review" className="pt-5 divide-y divide-border">
        {Object.entries(grouped).map(([name, sets]) => {
          const before = previousGrouped[name] || [];
          const maxRows = Math.max(sets.length, before.length);
          const currentBest = bestSet(sets);
          const previousBest = bestSet(before);
          const improved = !!currentBest && !!previousBest && setScore(currentBest) > setScore(previousBest) * 1.002;
          const groupVolumeChange = percentChange(volume(sets), volume(before));
          return <section key={name} className="py-5 first:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {renamingGroup?.baseName === name ? <div className="flex gap-2"><Input autoFocus value={renamingGroup.value} onChange={event => setRenamingGroup(value => value ? { ...value, value: event.target.value } : null)} className="h-11"/><button onClick={handleSaveRename} className="h-11 w-11 rounded-xl bg-foreground text-background flex items-center justify-center"><Check className="h-4 w-4"/></button><button onClick={() => setRenamingGroup(null)} className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center"><X className="h-4 w-4"/></button></div> : <><h2 className="text-lg font-semibold break-words">{name}</h2><p className="type-caption mt-0.5">{sets[0]?.category}{improved ? ' · Improved vs previous' : ''}</p></>}
              </div>
              {isEditMode && !renamingGroup && <div className="flex gap-1"><button onClick={() => setRenamingGroup({ baseName: name, value: name })} className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted flex items-center justify-center" aria-label={`Rename ${name}`}><Edit2 className="h-4 w-4"/></button><button onClick={() => setGroupToDelete(name)} className="h-10 w-10 rounded-xl text-destructive hover:bg-muted flex items-center justify-center" aria-label={`Delete ${name}`}><Trash2 className="h-4 w-4"/></button></div>}
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[360px]">
                <div className="grid grid-cols-[42px_1fr_1fr_42px] gap-2 px-2 pb-2 type-caption"><span>#</span><span>Previous</span><span>Today</span><span></span></div>
                {Array.from({ length: maxRows }).map((_, index) => {
                  const set = sets[index];
                  const oldSet = before[index];
                  const editing = set && editingSet?.id === set.id;
                  return <div key={set?.id || `missing-${index}`} className="grid grid-cols-[42px_1fr_1fr_42px] gap-2 items-center min-h-12 px-2 border-t border-border first:border-t-0">
                    <span className="type-caption tabular-nums">{index + 1}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">{oldSet ? bestLabel(oldSet) : '—'}</span>
                    {set ? editing ? <div className="grid grid-cols-2 gap-1"><Input value={editingSet.weight} onChange={event => setEditingSet(value => value ? { ...value, weight: event.target.value } : null)} inputMode="decimal" aria-label={`Weight set ${index + 1}`} className="h-9 text-sm"/><Input value={editingSet.reps} onChange={event => setEditingSet(value => value ? { ...value, reps: event.target.value } : null)} inputMode="numeric" aria-label={`Reps set ${index + 1}`} className="h-9 text-sm"/></div> : <button onClick={() => handleStartEdit(set)} className="text-left min-h-10 text-sm font-semibold tabular-nums hover:underline underline-offset-4">{bestLabel(set)}</button> : <span>—</span>}
                    <div>{set && editing ? <button onClick={handleSaveSet} aria-label="Save set" className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center"><Check className="h-4 w-4"/></button> : isEditMode && set ? <button onClick={() => handleDeleteSet(set)} aria-label={`Remove set ${index + 1}`} className="h-9 w-9 rounded-xl text-destructive flex items-center justify-center hover:bg-muted"><Trash2 className="h-4 w-4"/></button> : null}</div>
                  </div>;
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 type-caption"><span>Best today: <strong className="text-foreground">{bestLabel(currentBest)}</strong></span>{previousBest && <span>Previous best: <strong className="text-foreground">{bestLabel(previousBest)}</strong></span>}{groupVolumeChange != null && <span>Volume {groupVolumeChange > 0 ? '+' : ''}{groupVolumeChange.toFixed(1)}%</span>}</div>
            {isEditMode && <button onClick={() => handleAddSet(name, sets)} className="mt-3 min-h-11 px-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground flex items-center gap-2"><Plus className="h-4 w-4"/>Add set</button>}
          </section>;
        })}

        {!Object.keys(grouped).length && <div className="py-12 text-center text-sm text-muted-foreground">No exercise sets logged.</div>}
      </div>

      {isEditMode && <button onClick={() => setIsAddSheetOpen(true)} className="mt-4 w-full min-h-12 rounded-xl border border-dashed border-border text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2"><Plus className="h-4 w-4"/>Add exercise</button>}
      {!isEditMode && !completedMode && <button onClick={() => navigate('/app/progress/history')} className="mt-6 min-h-12 w-full rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2">Back to timeline<ChevronRight className="h-4 w-4"/></button>}

      <AddExerciseSheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen} onAdd={handleAddExercise} />
      <AlertDialog open={!!groupToDelete} onOpenChange={open => !open && setGroupToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {groupToDelete}?</AlertDialogTitle><AlertDialogDescription>This removes the exercise and all of its sets from this historical workout.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground">Delete exercise</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  </MainLayout>;
}
