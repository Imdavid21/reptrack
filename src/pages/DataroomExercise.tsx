import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useParams } from 'react-router-dom';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { BulletRows, TrendLineChart, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { resolveCanonicalName } from '@/lib/exerciseMatching';

function ExerciseContent({ exerciseName }: { exerciseName: string }) {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const records = usePersonalRecords();
  const trend = data.analysis?.exercises.find(row => resolveCanonicalName(row.exercise) === resolveCanonicalName(exerciseName));
  const exactRecord = records.getPRForExercise(exerciseName);
  const familyRecord = records.getFamilyPRForExercise(exerciseName);

  const chart = useMemo(() => (trend?.exposures || []).map(exposure => ({
    date: exposure.date,
    label: format(parseISO(exposure.date), 'd MMM'),
    strength: exposure.e1rm,
    load: exposure.weight,
    reps: exposure.reps,
    rir: exposure.rir,
  })), [trend?.exposures]);

  const repLadder = useMemo(() => {
    const best = new Map<number, number>();
    (trend?.exposures || []).forEach(exposure => {
      const reps = Math.round(exposure.reps);
      if (reps <= 0 || exposure.weight <= 0) return;
      best.set(reps, Math.max(best.get(reps) || 0, exposure.weight));
    });
    return [...best.entries()].sort((a, b) => a[0] - b[0]).slice(0, 10).map(([reps, weight]) => ({ label: `${reps} rep${reps === 1 ? '' : 's'}`, value: weight, detail: `${weight} kg` }));
  }, [trend?.exposures]);

  return <div className="space-y-9">
    <section className="rounded-3xl border border-border bg-card p-4">
      <div className="type-eyebrow">Latest comparable exposure</div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div><div className="text-3xl font-semibold tabular-nums">{trend?.exposures.at(-1) ? (trend.exposures.at(-1)!.weight > 0 ? `${trend.exposures.at(-1)!.weight} kg × ${trend.exposures.at(-1)!.reps}` : `${trend.exposures.at(-1)!.reps} reps`) : 'Need data'}</div><div className="type-caption mt-1 capitalize">{trend?.state === 'unclear' || !trend ? 'Needs more comparable history' : `${trend.state} · ${trend.progressionType?.replace('-', ' ') || 'progression'}`}</div></div>
        <div className="text-right"><div className="type-meta">Exact PR</div><div className="text-lg font-semibold tabular-nums">{exactRecord ? exactRecord.prType === 'weight' ? `${exactRecord.maxWeight} kg` : exactRecord.reps : '—'}</div></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div><div className="type-caption">Comparable exposures</div><div className="mt-1 text-xl font-semibold tabular-nums">{trend?.exposures.length ?? 0}</div></div><div><div className="type-caption">Strength change</div><div className="mt-1 text-xl font-semibold tabular-nums">{trend?.deltaPercent == null ? 'Unclear' : `${trend.deltaPercent > 0 ? '+' : ''}${trend.deltaPercent}%`}</div></div></div>
    </section>

    <VisualSection eyebrow="Performance" title="Estimated strength over time" description="Drag across the chart to inspect comparable exposures. RepTrack keeps exact exercise identity and comparison rules intact.">
      <TrendLineChart data={chart} lines={[{ key: 'strength', label: 'Estimated strength' }]} />
    </VisualSection>

    {chart.length > 0 && <VisualSection eyebrow="Load" title="Working load over time" description="A separate view avoids mixing load and estimated strength on two y-axes.">
      <TrendLineChart data={chart} lines={[{ key: 'load', label: 'Load' }]} height={210} />
    </VisualSection>}

    {repLadder.length > 0 && <VisualSection eyebrow="Recorded bests" title="Rep ladder" description="Best recorded load at each rep count in the selected range. These are observed performances, not inferred rep maxes.">
      <BulletRows rows={repLadder} />
    </VisualSection>}

    <VisualSection eyebrow="Exposure history" title="Recent comparable performances" description="Raw rows remain available underneath the visual trend for exact inspection.">
      {trend?.exposures.length ? <div className="divide-y divide-border rounded-2xl border border-border bg-card px-3">{[...trend.exposures].reverse().map(exposure => <div key={`${exposure.date}-${exposure.weight}-${exposure.reps}`} className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold tabular-nums">{format(parseISO(exposure.date), 'd MMM')}</div><div className="type-caption mt-0.5">{exposure.rir == null ? 'RIR not recorded' : `${exposure.rir} RIR`} · e1RM {Number(exposure.e1rm.toFixed(1))}</div></div><div className="text-sm font-semibold tabular-nums">{exposure.weight > 0 ? `${exposure.weight} kg × ${exposure.reps}` : `${exposure.reps} reps`}</div></div>)}</div> : <div className="rounded-2xl border border-border bg-card py-8 text-center type-caption">Not enough comparable exposures in this range.</div>}
    </VisualSection>

    <VisualSection eyebrow="Record semantics" title="Exact lift vs transferable context" description="Machines and free-weight alternatives do not inherit raw PRs merely because they train the same muscle.">
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Exact exercise record</div><div className="type-caption mt-0.5">Only true identity aliases share this record.</div></div><div className="text-sm font-semibold tabular-nums text-right">{exactRecord ? exactRecord.prType === 'weight' ? `${exactRecord.maxWeight} kg × ${parseInt(exactRecord.reps) || exactRecord.reps}` : exactRecord.reps : '—'}</div></div>
        {familyRecord && <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Comparable variation</div><div className="type-caption mt-0.5">{familyRecord.exerciseName} · {familyRecord.familyLabel}</div></div><div className="text-sm font-semibold tabular-nums text-right">{familyRecord.maxWeight} kg × {parseInt(familyRecord.reps) || familyRecord.reps}</div></div>}
      </div>
    </VisualSection>
  </div>;
}

export default function DataroomExercise() {
  const { exercise = '' } = useParams();
  const name = decodeURIComponent(exercise);
  return <DataroomPageShell eyebrow="Dataroom · Exercise" title={name || 'Exercise'} description="Movement-specific progression using exercise-appropriate and PR-safe comparisons."><ExerciseContent exerciseName={name} /></DataroomPageShell>;
}
