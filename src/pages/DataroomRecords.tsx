import { useMemo } from 'react';
import { ChevronRight, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { useNavigate } from 'react-router-dom';

export default function DataroomRecords() {
  const navigate = useNavigate();
  const { data: records = [], isLoading } = usePersonalRecords();

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(record => {
      const key = record.date?.slice(0, 7);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
  }, [records]);
  const maxMonth = Math.max(1, ...monthly.map(([, count]) => count));
  const recent = useMemo(() => [...records].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6), [records]);

  return <DataroomPageShell eyebrow="Dataroom" title="Records" description="Exercise bests using RepTrack's exact exercise identity and PR-transfer rules.">
    {isLoading ? <div className="h-40 rounded-2xl bg-muted animate-pulse" /> : records.length ? <div className="space-y-9">
      <VisualSection eyebrow="Recent records" title="Latest bests" description="High-signal wins first. Tap one to open the exact exercise progression view.">
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.map(record => {
            const value = record.prType === 'duration' ? record.reps : record.prType === 'reps' ? record.reps : `${Number(record.maxWeight.toFixed(2))} kg${record.reps ? ` × ${parseInt(record.reps) || record.reps}` : ''}`;
            return <button key={`${record.exerciseName}-${record.sourceExerciseId}-hero`} onClick={() => navigate(`/app/dataroom/exercise/${encodeURIComponent(record.exerciseName)}`)} className="w-44 shrink-0 snap-start rounded-2xl border border-border bg-card p-4 text-left active:scale-[.985] transition-transform">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div className="mt-3 type-meta">{record.prType === 'duration' ? 'Timed best' : record.prType === 'reps' ? 'Rep best' : 'Heaviest logged best'}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
              <div className="mt-2 text-sm font-semibold line-clamp-2">{record.exerciseName}</div>
              <div className="type-caption mt-1">{record.date ? format(parseISO(record.date), 'd MMM yyyy') : 'Recorded PR'}</div>
            </button>;
          })}
        </div>
      </VisualSection>

      {monthly.length > 1 && <VisualSection eyebrow="PR activity" title="Records over time" description="Monthly count shows how often new records were logged, not how large each improvement was.">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex h-36 items-end gap-2">{monthly.map(([month, count]) => <div key={month} className="flex flex-1 flex-col items-center justify-end gap-2"><div className="text-xs font-semibold tabular-nums">{count}</div><div className="w-full rounded-t-md bg-foreground" style={{ height: `${Math.max(8, count / maxMonth * 100)}px` }} /><div className="type-meta">{format(parseISO(`${month}-01`), 'MMM')}</div></div>)}</div>
        </div>
      </VisualSection>}

      <VisualSection eyebrow="All records" title="Exact exercise bests" description="Dense raw records remain available after the visual summary.">
        <div className="divide-y divide-border rounded-2xl border border-border bg-card px-3">{records.map(record => {
          const value = record.prType === 'duration' ? record.reps : record.prType === 'reps' ? record.reps : `${Number(record.maxWeight.toFixed(2))} kg${record.reps ? ` × ${parseInt(record.reps) || record.reps}` : ''}`;
          return <button key={`${record.exerciseName}-${record.sourceExerciseId}`} onClick={() => navigate(`/app/dataroom/exercise/${encodeURIComponent(record.exerciseName)}`)} className="w-full py-3 flex items-center gap-3 text-left hover:bg-muted/20"><div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{record.exerciseName}</div><div className="type-caption mt-0.5">{record.date} · {record.prType === 'duration' ? 'Timed best' : record.prType === 'reps' ? 'Rep best' : 'Heaviest logged best'}</div></div><div className="text-sm font-semibold tabular-nums text-right">{value}</div><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>;
        })}</div>
      </VisualSection>
      <p className="type-caption">Different machines and implements keep separate exact records unless RepTrack explicitly marks the loading system as comparable.</p>
    </div> : <div className="rounded-2xl border border-border bg-card py-10 text-center"><p className="text-sm font-semibold">No exercise records yet.</p><p className="type-caption mt-1">Complete training sessions to build exercise history.</p></div>}
  </DataroomPageShell>;
}
