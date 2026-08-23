import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { ConfidenceMark } from '@/components/dataroom/DataRoomVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function RecoveryContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const recovery = data.analysis?.recovery;
  const latestReadiness = data.readiness.at(-1);
  const jointRows = data.postWorkout.filter(row => Number(row.joint_discomfort || 0) > 0);
  const painSets = data.sets.filter(set => Number(set.pain_score || 0) > 0);

  return <div className="space-y-8">
    <section className="border-y border-border py-5"><div className="flex items-start justify-between gap-4"><div><div className="type-eyebrow">Current recovery read</div><h2 className="type-section-title mt-1 capitalize">{recovery?.state === 'insufficient' || !recovery ? 'Not enough evidence' : recovery.state}</h2><p className="type-supporting mt-2 max-w-2xl">{recovery?.reason || 'Log sleep and training context to build a useful recovery read.'}</p></div>{recovery && <ConfidenceMark value={recovery.confidence} compact />}</div></section>

    <section className="grid grid-cols-2 md:grid-cols-4 gap-5 border-y border-border py-5">
      <div><div className="type-caption">Sleep</div><div className="mt-1 text-xl font-semibold tabular-nums">{recovery?.averageSleep == null ? 'Not enough data' : `${recovery.averageSleep} h`}</div><div className="type-caption mt-0.5">{recovery ? `${recovery.sleepNights}/${recovery.windowDays} recent nights` : undefined}</div></div>
      <div><div className="type-caption">Training days</div><div className="mt-1 text-xl font-semibold tabular-nums">{recovery?.recentTrainingDays ?? 0}</div><div className="type-caption mt-0.5">in recovery window</div></div>
      <div><div className="type-caption">Consecutive days</div><div className="mt-1 text-xl font-semibold tabular-nums">{recovery?.consecutiveTrainingDays ?? 0}</div></div>
      <div><div className="type-caption">Readiness check-ins</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.readiness.length}</div></div>
    </section>

    <section><div className="mb-3"><div className="type-eyebrow">Readiness</div><h2 className="type-section-title mt-1">Recorded subjective context</h2></div>{latestReadiness ? <div className="divide-y divide-border border-y border-border">
      {[['Date', latestReadiness.checkin_date], ['Fatigue', latestReadiness.fatigue], ['Soreness', latestReadiness.soreness], ['Motivation', latestReadiness.motivation], ['Joint discomfort', latestReadiness.joint_discomfort], ['Resting HR', latestReadiness.resting_hr == null ? null : `${latestReadiness.resting_hr} bpm`]].map(([label, value]) => <div key={String(label)} className="py-3 flex items-center justify-between gap-3 text-sm"><span>{label}</span><span className="font-semibold tabular-nums">{value == null ? 'Not recorded' : String(value)}</span></div>)}
      {latestReadiness.sharp_pain && <div className="py-3"><div className="text-sm font-semibold">Sharp pain was reported in this check-in.</div><p className="type-caption mt-1">RepTrack treats this as context, not a diagnosis.</p></div>}
    </div> : <div className="border-y border-border py-5 type-caption">No readiness check-ins in this range.</div>}</section>

    <section><div className="mb-3"><div className="type-eyebrow">Discomfort context</div><h2 className="type-section-title mt-1">What was actually recorded</h2></div><div className="divide-y divide-border border-y border-border"><div className="py-3 flex justify-between gap-3 text-sm"><span>Sets with pain recorded</span><span className="font-semibold tabular-nums">{painSets.length}</span></div><div className="py-3 flex justify-between gap-3 text-sm"><span>Post-workout joint-discomfort entries</span><span className="font-semibold tabular-nums">{jointRows.length}</span></div></div><p className="type-caption mt-2">Repeated discomfort may change a training decision. It is never converted into an injury probability or diagnosis.</p></section>
  </div>;
}

export default function DataroomRecovery() {
  return <DataroomPageShell eyebrow="Dataroom" title="Recovery" description="Sleep, readiness, workload, and discomfort interpreted together instead of as a single magic score."><RecoveryContent /></DataroomPageShell>;
}
