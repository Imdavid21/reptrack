import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Trophy } from 'lucide-react';
import { usePersonalRecords, type PersonalRecord } from '@/hooks/usePersonalRecords';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';

function recordValue(record: PersonalRecord) {
  if (record.prType === 'duration') return record.reps;
  if (record.prType === 'reps') return record.reps;
  return `${record.maxWeight} kg × ${record.reps || '-'}`;
}

function sourceLabel(record: PersonalRecord) {
  const timestamp = new Date(record.sourceTimestamp);
  return Number.isNaN(timestamp.getTime())
    ? record.date
    : format(timestamp, 'd MMM yyyy · h:mm a');
}

export function PersonalRecordsCard() {
  const { data: records = [], isLoading, updateRecord, isUpdatingRecord } = usePersonalRecords();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalRecord | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  useEffect(() => {
    if (!editing) return;
    setWeight(editing.prType === 'weight' ? String(editing.maxWeight) : '');
    setReps(String(parseFloat(editing.reps) || editing.maxWeight || ''));
  }, [editing]);

  const save = async () => {
    if (!editing) return;
    const parsedReps = Number(reps);
    const parsedWeight = editing.prType === 'weight' ? Number(weight) : undefined;
    if (!Number.isFinite(parsedReps) || parsedReps <= 0 || (editing.prType === 'weight' && (!Number.isFinite(parsedWeight) || Number(parsedWeight) <= 0))) {
      toast.error('Enter a valid PR value.');
      return;
    }
    try {
      await updateRecord({ record: editing, weight: parsedWeight, reps: parsedReps });
      toast.success('PR and original workout updated.');
      setEditing(null);
    } catch {
      toast.error('PR was not updated. Try again.');
    }
  };

  if (isLoading) return <div className="h-28 animate-pulse rounded-2xl bg-muted" />;

  return (
    <>
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <h3 className="text-sm font-semibold">Personal records</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{records.length} exercise{records.length === 1 ? '' : 's'}</p>
          </div>
          {records.length > 0 && <button onClick={() => setOpen(true)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">View all</button>}
        </div>
        {records.length > 0 ? (
          <div className="divide-y divide-border border-t border-border">
            {records.slice(0, 4).map(record => (
              <button key={record.sourceExerciseId} onClick={() => { setOpen(true); setEditing(record); }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30">
                <Trophy className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{record.exerciseName}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{recordValue(record)}</span>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : <p className="border-t border-border px-4 py-5 text-sm text-muted-foreground">Complete a working set to establish your first PR.</p>}
      </section>

      <Drawer open={open} onOpenChange={next => { setOpen(next); if (!next) setEditing(null); }}>
        <DrawerContent className="max-h-[88dvh] rounded-t-[28px]">
          <DrawerHeader className="px-5 text-left"><DrawerTitle>Personal records</DrawerTitle></DrawerHeader>
          <div className="overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {editing && (
              <div className="mb-4 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><h4 className="font-semibold">{editing.exerciseName}</h4><p className="mt-1 text-xs text-muted-foreground">Logged {sourceLabel(editing)}</p></div>
                  <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground">Cancel</button>
                </div>
                <div className={`mt-4 grid gap-3 ${editing.prType === 'weight' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {editing.prType === 'weight' && <label className="text-xs text-muted-foreground">Weight (kg)<Input className="mt-1 h-12" type="number" inputMode="decimal" min="0" step="0.5" value={weight} onChange={event => setWeight(event.target.value)} /></label>}
                  <label className="text-xs text-muted-foreground">{editing.prType === 'duration' ? 'Seconds' : 'Reps'}<Input className="mt-1 h-12" type="number" inputMode="decimal" min="0" step="1" value={reps} onChange={event => setReps(event.target.value)} /></label>
                </div>
                <button onClick={save} disabled={isUpdatingRecord} className="mt-4 h-12 w-full rounded-xl bg-foreground font-semibold text-background disabled:opacity-50">{isUpdatingRecord ? 'Saving…' : 'Save PR'}</button>
              </div>
            )}

            <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
              {records.map(record => (
                <button key={record.sourceExerciseId} onClick={() => setEditing(record)} className="flex w-full items-center gap-3 bg-card px-4 py-3 text-left hover:bg-muted/30">
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{record.exerciseName}</span><span className="mt-0.5 block text-xs text-muted-foreground">{sourceLabel(record)}</span></span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{recordValue(record)}</span>
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
