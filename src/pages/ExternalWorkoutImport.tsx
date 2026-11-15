import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, FileUp, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useWorkouts, type WorkoutExercise } from '@/hooks/useWorkouts';
import { parseExternalWorkoutCSV, type ExternalWorkoutSession } from '@/lib/importers/externalWorkout';
import { importRecordId } from '@/hooks/useDataExport';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/lib/toast';

function toDate(date: string, minutes = 0) {
  const value = new Date(`${date}T12:00:00`);
  value.setMinutes(value.getMinutes() + minutes);
  return value;
}

export default function ExternalWorkoutImport() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const { settings } = useAdvancedMode();
  const { workouts, createWorkout, isCreating } = useWorkouts();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [sessions, setSessions] = useState<ExternalWorkoutSession[]>([]);
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);
  const [progress, setProgress] = useState(0);

  const existingKeys = useMemo(() => new Set(workouts.map(workout => `${workout.date}|${workout.day_name.trim().toLowerCase()}`)), [workouts]);
  const importable = useMemo(() => sessions.filter(session => !existingKeys.has(`${session.date}|${session.workoutName.trim().toLowerCase()}`)), [sessions, existingKeys]);
  const duplicates = sessions.length - importable.length;

  if (!settings.enabled) return <MainLayout showBack backTo="/app/settings/data" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><h1 className="type-page-title">Advanced Mode is off</h1></div></MainLayout>;

  const readFile = async (file: File) => {
    try {
      const parsed = parseExternalWorkoutCSV(await file.text());
      setFileName(file.name);
      setSessions(parsed);
      setDone(null);
      setProgress(0);
      if (!parsed.length) toast.error('No Strong or Hevy workout rows found.');
    } catch { toast.error('File could not be read.'); }
  };

  const importSessions = async () => {
    if (!user || isImporting) return;
    setIsImporting(true);
    let imported = 0;
    let skipped = duplicates;
    setProgress(0);
    for (let index = 0; index < importable.length; index++) {
      const session = importable[index];
      try {
        const exercises: WorkoutExercise[] = session.exercises.map((exercise, exerciseIndex) => ({
          name: exercise.name,
          category: 'accessory',
          sort_order: exerciseIndex,
          exerciseType: exercise.sets.some(set => set.durationSeconds) ? 'timed' : 'weighted',
          sets: exercise.sets.map((set, setIndex) => ({
            setNumber: setIndex + 1,
            targetWeight: String(set.weight),
            targetReps: set.durationSeconds ? `${set.durationSeconds}s` : String(set.reps),
            actualWeight: String(set.weight),
            actualReps: set.durationSeconds ? `${set.durationSeconds}s` : String(set.reps),
            targetTime: set.durationSeconds,
            actualTime: set.durationSeconds,
            completed: true,
            setKind: set.setType === 'warmup' ? 'warmup' : set.setType === 'dropset' ? 'backoff' : 'working',
          })),
        }));
        const duration = session.durationMinutes;
        const startedAt = session.startedAt ? new Date(session.startedAt) : toDate(session.date);
        await createWorkout({
          day: 'imported',
          day_name: session.workoutName,
          week_number: 1,
          date: toDate(session.date),
          exercises,
          clientId: await importRecordId(user.id, `external:${session.source}:${session.sessionKey}`),
          durationMinutes: duration ?? undefined,
          startedAt,
          completedAt: duration ? new Date(startedAt.getTime() + duration * 60000) : undefined,
        });
        imported++;
      } catch (error) {
        console.error('[ExternalWorkoutImport] session failed', error);
        skipped++;
      }
      setProgress(index + 1);
    }
    setDone({ imported, skipped });
    setIsImporting(false);
  };

  return <MainLayout showBack backTo="/app/settings/data" hideNav>
    <div className="mx-auto max-w-[720px] pb-12">
      <header className="mb-5"><div className="type-eyebrow">Import</div><h1 className="type-page-title mt-1">Strong / Hevy</h1></header>

      <input ref={inputRef} id="external-csv-input" disabled={isImporting} className="sr-only" tabIndex={-1} type="file" accept=".csv,text/csv" onChange={event => { const file = event.target.files?.[0]; if (file) void readFile(file); event.target.value = ''; }} />
      <label htmlFor="external-csv-input" role="button" aria-disabled={isImporting} className="cursor-pointer aria-disabled:pointer-events-none aria-disabled:opacity-50 w-full min-h-28 rounded-[20px] border border-dashed border-border bg-card flex flex-col items-center justify-center gap-2"><FileUp className="h-5 w-5"/><span className="text-sm font-semibold">Choose CSV</span>{fileName && <span className="type-caption">{fileName}</span>}</label>

      {!!sessions.length && <>
        <section className="mt-5 rounded-[20px] border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-3 gap-px bg-border"><div className="bg-card p-4"><div className="type-caption">Source</div><div className="mt-1 text-lg font-semibold capitalize">{sessions[0].source}</div></div><div className="bg-card p-4"><div className="type-caption">Sessions</div><div className="mt-1 text-lg font-semibold tabular-nums">{sessions.length}</div></div><div className="bg-card p-4"><div className="type-caption">New</div><div className="mt-1 text-lg font-semibold tabular-nums">{importable.length}</div></div></div>
          <div className="divide-y divide-border max-h-[42dvh] overflow-y-auto">{sessions.slice().reverse().slice(0, 40).map(session => { const duplicate = existingKeys.has(`${session.date}|${session.workoutName.trim().toLowerCase()}`); return <div key={session.sessionKey} className="px-4 py-3 flex items-center justify-between gap-4"><div className="min-w-0"><div className="text-sm font-semibold truncate">{session.workoutName}</div><div className="type-caption mt-0.5">{session.date} · {session.exercises.length} exercises</div></div><span className="type-caption shrink-0">{duplicate ? 'exists' : session.durationMinutes ? `${session.durationMinutes} min` : 'new'}</span></div>; })}</div>
        </section>

        <Button disabled={!importable.length || isCreating || isImporting} onClick={() => void importSessions()} className="mt-5 w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{progress > 0 && !done ? <Loader2 className="h-4 w-4 animate-spin"/> : done ? <Check className="h-4 w-4"/> : null}{done ? `${done.imported} imported` : progress > 0 ? `${progress} / ${importable.length}` : `Import ${importable.length}`}</Button>
        {duplicates > 0 && !done && <div className="type-caption text-center mt-2">{duplicates} existing session{duplicates === 1 ? '' : 's'} skipped.</div>}
        {done && <div className="type-caption text-center mt-2">{done.skipped} skipped.</div>}
      </>}
    </div>
  </MainLayout>;
}
