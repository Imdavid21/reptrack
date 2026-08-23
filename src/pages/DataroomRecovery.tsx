import { useMemo } from 'react';
import { eachDayOfInterval, format } from 'date-fns';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { ConfidenceMark } from '@/components/dataroom/DataRoomVisuals';
import { DumbbellMetric, TimelineTracks, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function RecoveryContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const recovery = data.analysis?.recovery;
  const latestReadiness = data.readiness.at(-1);
  const jointRows = data.postWorkout.filter(row => Number(row.joint_discomfort || 0) > 0);
  const painSets = data.sets.filter(set => Number(set.pain_score || 0) > 0);

  const dates = useMemo(() => eachDayOfInterval(dateRange).map(day => format(day, 'yyyy-MM-dd')), [dateRange]);
  const metricsByDate = useMemo(() => new Map(data.metrics.map(day => [day.date, day])), [data.metrics]);
  const readinessByDate = useMemo(() => new Map(data.readiness.map(day => [day.checkin_date, day])), [data.readiness]);
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, number>();
    data.workouts.forEach(workout => { if (workout.completed_at) map.set(workout.date, (map.get(workout.date) || 0) + 1); });
    return map;
  }, [data.workouts]);

  const tracks = useMemo(() => [
    { label: 'Sleep', values: dates.map(date => ({ date, value: Number(metricsByDate.get(date)?.sleep_hours || 0) || null })) },
    { label: 'Fatigue', values: dates.map(date => ({ date, value: readinessByDate.get(date)?.fatigue ?? null })) },
    { label: 'Soreness', values: dates.map(date => ({ date, value: readinessByDate.get(date)?.soreness ?? null })) },
    { label: 'Motivation', values: dates.map(date => ({ date, value: readinessByDate.get(date)?.motivation ?? null })) },
    { label: 'Training', values: dates.map(date => ({ date, value: workoutsByDate.get(date) || null })) },
  ], [dates, metricsByDate, readinessByDate, workoutsByDate]);

  const firstReadiness = data.readiness.at(0);

  return <div className="space-y-9">
    <section className="rounded-3xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4"><div><div className="type-eyebrow">Current recovery read</div><h2 className="type-section-title mt-1 capitalize">{recovery?.state === 'insufficient' || !recovery ? 'Not enough evidence' : recovery.state}</h2><p className="type-supporting mt-2">{recovery?.reason || 'Log sleep and training context to build a useful recovery read.'}</p></div>{recovery && <ConfidenceMark value={recovery.confidence} compact />}</div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div><div className="type-caption">Sleep</div><div className="mt-1 text-xl font-semibold tabular-nums">{recovery?.averageSleep == null ? 'Need data' : `${recovery.averageSleep} h`}</div><div className="type-caption mt-0.5">{recovery ? `${recovery.sleepNights}/${recovery.windowDays} nights` : undefined}</div></div>
        <div><div className="type-caption">Training days</div><div className="mt-1 text-xl font-semibold tabular-nums">{recovery?.recentTrainingDays ?? 0}</div><div className="type-caption mt-0.5">recovery window</div></div>
        <div><div className="type-caption">Consecutive days</div><div className="mt-1 text-xl font-semibold tabular-nums">{recovery?.consecutiveTrainingDays ?? 0}</div></div>
        <div><div className="type-caption">Readiness check-ins</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.readiness.length}</div></div>
      </div>
    </section>

    <VisualSection eyebrow="Signals" title="Recovery context on the same dates" description="Drag horizontally to inspect sleep, subjective readiness, and training together. RepTrack keeps the signals separate instead of inventing a magic score.">
      <TimelineTracks tracks={tracks} />
    </VisualSection>

    {firstReadiness && latestReadiness && data.readiness.length > 1 && <VisualSection eyebrow="Readiness" title="First vs latest check-in" description="Two-point comparisons show direction without pretending these subjective scales are continuous physiology.">
      <div className="grid grid-cols-2 gap-3">
        <DumbbellMetric label="Fatigue" previous={firstReadiness.fatigue} current={latestReadiness.fatigue} formatValue={value => Number(value.toFixed(1)).toString()} />
        <DumbbellMetric label="Soreness" previous={firstReadiness.soreness} current={latestReadiness.soreness} formatValue={value => Number(value.toFixed(1)).toString()} />
        <DumbbellMetric label="Motivation" previous={firstReadiness.motivation} current={latestReadiness.motivation} formatValue={value => Number(value.toFixed(1)).toString()} />
        <DumbbellMetric label="Joint discomfort" previous={firstReadiness.joint_discomfort} current={latestReadiness.joint_discomfort} formatValue={value => Number(value.toFixed(1)).toString()} />
      </div>
    </VisualSection>}

    <VisualSection eyebrow="Latest subjective context" title="What was actually recorded">
      {latestReadiness ? <div className="grid grid-cols-2 gap-3">
        {[['Fatigue', latestReadiness.fatigue], ['Soreness', latestReadiness.soreness], ['Motivation', latestReadiness.motivation], ['Joint discomfort', latestReadiness.joint_discomfort], ['Resting HR', latestReadiness.resting_hr == null ? null : `${latestReadiness.resting_hr} bpm`], ['Sleep entry', latestReadiness.sleep_hours == null ? null : `${latestReadiness.sleep_hours} h`]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums">{value == null ? '—' : String(value)}</div></div>)}
        {latestReadiness.sharp_pain && <div className="col-span-2 rounded-2xl border border-border bg-card p-3"><div className="text-sm font-semibold">Sharp pain was reported in this check-in.</div><p className="type-caption mt-1">RepTrack treats this as context, not a diagnosis.</p></div>}
      </div> : <div className="rounded-2xl border border-border bg-card py-8 text-center type-caption">No readiness check-ins in this range.</div>}
    </VisualSection>

    <VisualSection eyebrow="Discomfort context" title="Recorded flags" description="Repeated discomfort can inform a training decision. It is never converted into injury probability.">
      <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">Pain-recorded sets</div><div className="mt-1 text-xl font-semibold tabular-nums">{painSets.length}</div></div><div className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">Joint-discomfort check-ins</div><div className="mt-1 text-xl font-semibold tabular-nums">{jointRows.length}</div></div></div>
    </VisualSection>
  </div>;
}

export default function DataroomRecovery() {
  return <DataroomPageShell eyebrow="Dataroom" title="Recovery" description="Sleep, readiness, workload, and discomfort interpreted together without compressing them into a fake recovery score."><RecoveryContent /></DataroomPageShell>;
}
