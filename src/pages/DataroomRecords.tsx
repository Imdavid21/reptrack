import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function DataroomRecords() {
  const navigate = useNavigate();
  const { data: records = [], isLoading } = usePersonalRecords();
  return <DataroomPageShell eyebrow="Dataroom" title="Records" description="Exercise bests using RepTrack's exact exercise identity and PR-transfer rules.">
    {isLoading ? <div className="h-40 rounded-xl bg-muted animate-pulse" /> : records.length ? <div className="divide-y divide-border border-y border-border">{records.map(record => {
      const value = record.prType === 'duration' ? record.reps : record.prType === 'reps' ? record.reps : `${Number(record.maxWeight.toFixed(2))} kg${record.reps ? ` × ${parseInt(record.reps) || record.reps}` : ''}`;
      return <button key={`${record.exerciseName}-${record.sourceExerciseId}`} onClick={() => navigate(`/app/dataroom/exercise/${encodeURIComponent(record.exerciseName)}`)} className="w-full py-3 flex items-center gap-3 text-left hover:bg-muted/20"><div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{record.exerciseName}</div><div className="type-caption mt-0.5">{record.date} · {record.prType === 'duration' ? 'Timed best' : record.prType === 'reps' ? 'Rep best' : 'Heaviest logged best'}</div></div><div className="text-sm font-semibold tabular-nums text-right">{value}</div><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>;
    })}</div> : <div className="border-y border-border py-8 text-center"><p className="text-sm font-semibold">No exercise records yet.</p><p className="type-caption mt-1">Complete training sessions to build exercise history.</p></div>}
    <p className="type-caption mt-3">Different machines and implements keep separate exact records unless RepTrack explicitly marks the loading system as comparable.</p>
  </DataroomPageShell>;
}
