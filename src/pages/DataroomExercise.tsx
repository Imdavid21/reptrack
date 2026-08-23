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

  const chart = useMemo(() => (trend?.exposures || []).map(exposure => ({ date: exposure.date, label: format(parseISO(exposure.date), 'd MMM'), strength: exposure.e1rm, load: exposure.weight, reps: exposure.reps, rir: exposure.rir })), [trend?.exposures]);
  const repLadder = useMemo(() => {
    const best = new Map<number, number>();
    (trend?.exposures || []).forEach(exposure => { const reps = Math.round(exposure.reps); if (reps <= 0 || exposure.weight <= 0) return; best.set(reps, Math.max(best.get(reps) || 0, exposure.weight)); });
    return [...best.entries()].sort((a, b) => a[0] - b[0]).slice(0, 10).map(([reps, weight]) => ({ label: `${reps} rep${reps === 1 ? '' : 's'}`, value: weight, detail: `${weight} kg` }));
  }, [trend?.exposures]);
  const setMatrix = useMemo(() => {
    const matching = data.sets.filter(set => resolveCanonicalName(set.exercise_name) === resolveCanonicalName(exerciseName) && set.workout_date);
    const byDate = new Map<string, typeof matching>();
    matching.forEach(set => { const rows = byDate.get(set.workout_date || '') || []; rows.push(set); byDate.set(set.workout_date || '', rows); });
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8).map(([date, sets]) => ({ date, sets }));
  }, [data.sets, exerciseName]);
  const maxSets = Math.max(0, ...setMatrix.map(session => session.sets.length));

  return <div className="space-y-9">
    <section className="border-y border-border py-4">
      <div className="type-eyebrow">Latest comparable exposure</div>
      <div className="mt-2 flex items-end justify-between gap-4"><div><div className="text-3xl font-semibold tabular-nums text-energy-ink">{trend?.exposures.at(-1) ? (trend.exposures.at(-1)!.weight > 0 ? `${trend.exposures.at(-1)!.weight} kg × ${trend.exposures.at(-1)!.reps}` : `${trend.exposures.at(-1)!.reps} reps`) : 'Need data'}</div><div className="type-caption mt-1 capitalize">{trend?.state === 'unclear' || !trend ? 'Needs more comparable history' : `${trend.state} · ${trend.progressionType?.replace('-', ' ') || 'progression'}`}</div></div><div className="text-right"><div className="type-meta">Exact PR</div><div className="text-lg font-semibold tabular-nums">{exactRecord ? exactRecord.prType === 'weight' ? `${exactRecord.maxWeight} kg` : exactRecord.reps : '—'}</div></div></div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div><div className="type-caption">Comparable exposures</div><div className="mt-1 text-xl font-semibold tabular-nums">{trend?.exposures.length ?? 0}</div></div><div><div className="type-caption">Strength change</div><div className="mt-1 text-xl font-semibold tabular-nums">{trend?.deltaPercent == null ? 'Unclear' : `${trend.deltaPercent > 0 ? '+' : ''}${trend.deltaPercent}%`}</div></div></div>
    </section>

    <VisualSection title="Estimated strength" description="Select a point to inspect the exact comparable exposure.">
      <TrendLineChart data={chart} lines={[{ key: 'strength', label: 'Estimated strength', suffix: ' kg', tone: 'training' }]} summary={`Estimated strength for ${exerciseName} across comparable exposures.`} />
    </VisualSection>

    {chart.length > 0 && <VisualSection title="Working load" description="Load stays separate from estimated strength so there is no dual-axis ambiguity.">
      <TrendLineChart data={chart} lines={[{ key: 'load', label: 'Load', suffix: ' kg', tone: 'training' }]} height={210} summary={`Working load for ${exerciseName} across comparable exposures.`} />
    </VisualSection>}

    {setMatrix.length > 0 && <VisualSection title="Session sets" description="The last eight raw sessions keep back-off sets and within-session drop-off visible.">
      <div className="overflow-x-auto border-y border-border"><div className="min-w-max py-3"><div className="grid gap-2" style={{ gridTemplateColumns: `76px repeat(${Math.max(1, maxSets)}, 72px)` }}><div className="type-meta">Date</div>{Array.from({ length: maxSets }, (_, index) => <div key={`head-${index}`} className="type-meta text-center">S{index + 1}</div>)}{setMatrix.map(session => <div key={session.date} className="contents"><div className="self-center text-xs font-semibold tabular-nums">{format(parseISO(session.date), 'd MMM')}</div>{Array.from({ length: maxSets }, (_, index) => { const set = session.sets[index]; const weight = Number(set?.actual_weight || 0); const reps = Number(set?.actual_reps || 0); return <div key={`${session.date}-${index}`} className="rounded-lg border border-border bg-energy-soft/30 px-2 py-2 text-center"><div className="text-xs font-semibold tabular-nums">{set ? (weight > 0 ? `${Number(weight.toFixed(2))}×${Number(reps.toFixed(0))}` : `${Number(reps.toFixed(0))} reps`) : '—'}</div>{set?.actual_rir != null && <div className="type-meta mt-0.5">{set.actual_rir} RIR</div>}</div>; })}</div>)}</div></div></div>
    </VisualSection>}

    {repLadder.length > 0 && <VisualSection title="Recorded rep bests" description="Best observed load at each rep count in this range. These are not inferred rep maxes."><BulletRows rows={repLadder} tone="training" /></VisualSection>}

    <VisualSection title="Comparable performances" description="Exact rows remain available underneath the trend.">
      {trend?.exposures.length ? <div className="divide-y divide-border border-y border-border">{[...trend.exposures].reverse().map(exposure => <div key={`${exposure.date}-${exposure.weight}-${exposure.reps}`} className="flex items-center justify-between gap-3 py-3"><div><div className="text-sm font-semibold tabular-nums">{format(parseISO(exposure.date), 'd MMM')}</div><div className="type-caption mt-0.5">{exposure.rir == null ? 'RIR not recorded' : `${exposure.rir} RIR`} · e1RM {Number(exposure.e1rm.toFixed(1))} kg</div></div><div className="text-sm font-semibold tabular-nums">{exposure.weight > 0 ? `${exposure.weight} kg × ${exposure.reps}` : `${exposure.reps} reps`}</div></div>)}</div> : <div className="border-y border-border py-8 text-center type-caption">Not enough comparable exposures in this range.</div>}
    </VisualSection>

    <VisualSection title="Record semantics" description="Machines and free-weight alternatives do not inherit raw PRs merely because they train the same muscle.">
      <div><div className="flex min-h-16 items-center justify-between gap-3 border-t border-border py-3"><div><div className="text-sm font-semibold">Exact exercise record</div><div className="type-caption mt-0.5">Only true identity aliases share this record.</div></div><div className="text-sm font-semibold tabular-nums text-right">{exactRecord ? exactRecord.prType === 'weight' ? `${exactRecord.maxWeight} kg × ${parseInt(exactRecord.reps) || exactRecord.reps}` : exactRecord.reps : '—'}</div></div>{familyRecord && <div className="flex min-h-16 items-center justify-between gap-3 border-t border-border py-3"><div><div className="text-sm font-semibold">Comparable variation</div><div className="type-caption mt-0.5">{familyRecord.exerciseName} · {familyRecord.familyLabel}</div></div><div className="text-sm font-semibold tabular-nums text-right">{familyRecord.maxWeight} kg × {parseInt(familyRecord.reps) || familyRecord.reps}</div></div>}</div>
    </VisualSection>
  </div>;
}

export default function DataroomExercise() {
  const { exercise = '' } = useParams();
  const name = decodeURIComponent(exercise);
  return <DataroomPageShell eyebrow="Dataroom · Exercise" title={name || 'Exercise'} description="Movement-specific progression using exercise-appropriate and PR-safe comparisons."><ExerciseContent exerciseName={name} /></DataroomPageShell>;
}
