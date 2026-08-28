import { useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Database, Dumbbell, Footprints, Moon, Scale, Settings2, Utensils } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataroomRangeProvider, useDataroomRange } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from '@/components/dataroom/DataroomRangeSelector';
import { WeightTrendChart } from '@/components/progress/WeightTrendChart';
import { ConfidenceMark } from '@/components/dataroom/DataRoomVisuals';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useNavigate } from 'react-router-dom';
import { absoluteDelta, evidenceCoverage, previousComparableRange, summarizeDataroomPeriod } from '@/lib/dataroom/overview';
import { cn } from '@/lib/utils';

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0"><div className="type-caption">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</div>{detail && <div className="mt-0.5 type-caption">{detail}</div>}</div>;
}

function DomainRow({ icon: Icon, title, value, detail, onClick }: { icon: typeof Scale; title: string; value: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30 focus-visible:bg-muted/30 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span><span className="flex-1 min-w-0"><span className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold">{title}</span><span className="text-sm font-semibold tabular-nums text-right">{value}</span></span><span className="block type-caption mt-0.5 line-clamp-1">{detail}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /></button>;
}

function ChangeRow({ label, current, previous, delta, detail }: { label: string; current: string; previous?: string; delta?: string | null; detail?: string }) {
  return <div className="py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center"><div className="min-w-0"><div className="text-sm font-semibold">{label}</div><div className="type-caption mt-0.5">{previous ? `${previous} → ${current}` : current}{detail ? ` · ${detail}` : ''}</div></div>{delta && <div className="text-sm font-semibold tabular-nums">{delta}</div>}</div>;
}

function Finding({ finding }: { finding: NonNullable<ReturnType<typeof useDataroomData>['analysis']>['findings'][number] }) {
  const [open, setOpen] = useState(false);
  return <article className="py-4 first:pt-0 last:pb-0">
    <button onClick={() => setOpen(value => !value)} aria-expanded={open} className="w-full text-left">
      <div className="flex items-start gap-3"><span className={cn('mt-0.5 min-w-[4.5rem] rounded-lg px-2 py-1 text-center type-meta uppercase', finding.actionKind === 'keep' ? 'bg-muted text-foreground' : finding.actionKind === 'change' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{finding.actionKind}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold leading-5">{finding.title}</h3><ConfidenceMark value={finding.confidence} compact /></div><p className="type-caption mt-1">{finding.signal}</p></div><ChevronDown className={cn('h-4 w-4 mt-1 text-muted-foreground transition-transform', open && 'rotate-180')} /></div>
    </button>
    {open && <div className="ml-[5.25rem] mt-3 border-l-2 border-border pl-3 space-y-3"><div><div className="type-meta">Decision</div><p className="text-sm mt-1">{finding.action}</p></div><div><div className="type-meta">Evidence</div><ul className="mt-1 space-y-1">{finding.evidence.map(item => <li key={item} className="type-caption">{item}</li>)}</ul></div><div><div className="type-meta">Interpretation</div><p className="type-caption mt-1">{finding.interpretation}</p></div></div>}
  </article>;
}

function LoadingLine() {
  return <div className="h-20 animate-pulse rounded-xl bg-muted/70" aria-hidden="true" />;
}

function DataroomContent() {
  const navigate = useNavigate();
  const { days, dateRange } = useDataroomRange();
  const current = useDataroomData(dateRange);
  const previousRange = useMemo(() => previousComparableRange(dateRange), [dateRange]);
  const previous = useDataroomData(previousRange);

  const currentSummary = useMemo(() => summarizeDataroomPeriod({
    range: dateRange,
    metrics: current.metrics,
    workouts: current.workouts,
    sets: current.sets,
    meals: current.meals,
    activities: current.activities,
  }), [dateRange, current.metrics, current.workouts, current.sets, current.meals, current.activities]);
  const previousSummary = useMemo(() => summarizeDataroomPeriod({
    range: previousRange,
    metrics: previous.metrics,
    workouts: previous.workouts,
    sets: previous.sets,
    meals: previous.meals,
    activities: previous.activities,
  }), [previousRange, previous.metrics, previous.workouts, previous.sets, previous.meals, previous.activities]);

  const coverage = evidenceCoverage({
    days,
    weightMeasurements: currentSummary.weightMeasurements,
    workouts: currentSummary.workouts,
    nutritionLoggedDays: currentSummary.nutritionLoggedDays,
    sleepNights: currentSummary.sleepNights,
    activitySessions: current.activities.length,
  });

  const workoutDelta = absoluteDelta(currentSummary.workouts, previousSummary.workouts, 0);
  const sleepDelta = absoluteDelta(currentSummary.sleepAverage, previousSummary.sleepAverage, 2);
  const proteinDelta = absoluteDelta(currentSummary.proteinPerLoggedDay, previousSummary.proteinPerLoggedDay, 0);
  const progressing = current.analysis?.exercises.filter(exercise => exercise.state === 'progressing').length ?? 0;
  const stable = current.analysis?.exercises.filter(exercise => exercise.state === 'stable').length ?? 0;
  const topMuscles = (current.analysis?.muscles || []).filter(muscle => muscle.setsPerWeek > 0).sort((a, b) => b.setsPerWeek - a.setsPerWeek).slice(0, 3);
  const latestPhysique = current.physique.at(-1);
  const latestMobility = current.mobility.at(-1);
  const activityKinds = useMemo(() => {
    const map = new Map<string, number>();
    current.activities.forEach(item => map.set(item.activity_type, (map.get(item.activity_type) || 0) + Number(item.duration_minutes || 0)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [current.activities]);

  const weightValue = current.analysis?.weight.trendWeight != null ? `${current.analysis.weight.trendWeight.toFixed(1)} kg` : currentSummary.weightLatest != null ? `${currentSummary.weightLatest} kg` : 'No data';
  const trainingValue = currentSummary.workouts ? `${currentSummary.workouts} workouts` : 'No sessions';
  const nutritionValue = currentSummary.proteinPerLoggedDay != null ? `${currentSummary.proteinPerLoggedDay} g` : 'No logs';
  const recoveryValue = currentSummary.sleepAverage != null ? `${currentSummary.sleepAverage.toFixed(1)} h` : 'No data';
  const activityValue = currentSummary.activityMinutes ? `${currentSummary.activityMinutes} min` : 'No activity';

  return <MainLayout wide>
    <div className="mx-auto w-full max-w-[1000px] pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
        <h1 className="type-page-title">Dataroom</h1>
        <div className="flex items-center gap-2"><DataroomRangeSelector /><button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"><Settings2 className="h-5 w-5" /></button></div>
      </header>

      <section className="border-y border-border py-5 mb-7" aria-labelledby="current-read-title">
        <div className="flex items-start justify-between gap-4"><h2 id="current-read-title" className="text-xl sm:text-2xl font-semibold leading-tight max-w-2xl">{current.analysis?.headline || (current.isLoading ? 'Reading…' : 'Not enough evidence yet.')}</h2>{current.analysis && <ConfidenceMark value={current.analysis.confidence} compact />}</div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-x-5 gap-y-5">
          <Metric label="Bodyweight" value={current.analysis?.weight.trendWeight == null ? 'No data' : `${current.analysis.weight.trendWeight.toFixed(1)} kg`} detail={current.analysis?.weight.percentPerWeek == null ? undefined : `${current.analysis.weight.percentPerWeek > 0 ? '+' : ''}${current.analysis.weight.percentPerWeek}% / week`} />
          <Metric label="Training" value={`${currentSummary.workouts} workouts`} detail={currentSummary.workouts ? `${(currentSummary.workouts / days * 7).toFixed(1)}/wk · ${currentSummary.sets} sets` : undefined} />
          <Metric label="Key lifts" value={current.analysis ? `${progressing} improving` : 'Loading…'} detail={current.analysis ? `${stable} stable` : undefined} />
          <Metric label="Protein" value={currentSummary.proteinPerLoggedDay == null ? 'No data' : `${currentSummary.proteinPerLoggedDay} g`} detail={currentSummary.proteinPerLoggedDay == null ? undefined : 'avg / logged day'} />
          <Metric label="Sleep" value={currentSummary.sleepAverage == null ? 'No data' : `${currentSummary.sleepAverage.toFixed(1)} h`} detail={currentSummary.sleepNights ? `${currentSummary.sleepNights} nights` : undefined} />
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-7 items-start">
        <div className="space-y-8">
          <section aria-labelledby="coverage-title"><div className="mb-3"><h2 id="coverage-title" className="type-section-title">Coverage</h2></div><div className="divide-y divide-border border-y border-border">
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Bodyweight</span><span className="font-semibold tabular-nums">{coverage.weight.count} / {days}D</span></div>
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Training</span><span className="font-semibold tabular-nums">{coverage.training.count} workouts</span></div>
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Nutrition</span><span className="font-semibold tabular-nums">{coverage.nutrition.count} days</span></div>
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Sleep</span><span className="font-semibold tabular-nums">{coverage.sleep.count} nights</span></div>
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Activity</span><span className="font-semibold tabular-nums">{coverage.activity.count} sessions</span></div>
          </div><p className="type-caption mt-2">Food days may be incomplete.</p></section>

          <section aria-labelledby="changed-title"><div className="mb-3"><h2 id="changed-title" className="type-section-title">vs Previous {days} Days</h2></div>{previous.isLoading && current.isLoading ? <LoadingLine /> : <div className="divide-y divide-border border-y border-border">
            <ChangeRow label="Bodyweight" current={currentSummary.weightLatest == null ? 'No data' : `${currentSummary.weightLatest} kg`} previous={previousSummary.weightLatest == null ? undefined : `${previousSummary.weightLatest} kg`} delta={currentSummary.weightChange == null ? null : `${currentSummary.weightChange > 0 ? '+' : ''}${currentSummary.weightChange} kg`} detail={`${currentSummary.weightMeasurements} measurements`} />
            <ChangeRow label="Training" current={`${currentSummary.workouts} workouts`} previous={`${previousSummary.workouts} workouts`} delta={workoutDelta == null || workoutDelta === 0 ? null : `${workoutDelta > 0 ? '+' : ''}${workoutDelta}`} detail={`${currentSummary.sets} sets`} />
            <ChangeRow label="Sleep" current={currentSummary.sleepAverage == null ? 'No data' : `${currentSummary.sleepAverage.toFixed(1)} h`} previous={previousSummary.sleepAverage == null ? undefined : `${previousSummary.sleepAverage.toFixed(1)} h`} delta={sleepDelta == null || Math.abs(sleepDelta) < 0.05 ? null : `${sleepDelta > 0 ? '+' : ''}${sleepDelta.toFixed(1)} h`} detail={`${currentSummary.sleepNights} nights`} />
            <ChangeRow label="Protein" current={currentSummary.proteinPerLoggedDay == null ? 'No data' : `${currentSummary.proteinPerLoggedDay} g`} previous={previousSummary.proteinPerLoggedDay == null ? undefined : `${previousSummary.proteinPerLoggedDay} g`} delta={proteinDelta == null || proteinDelta === 0 ? null : `${proteinDelta > 0 ? '+' : ''}${proteinDelta} g`} detail={`${currentSummary.nutritionLoggedDays} days`} />
          </div>}</section>

          <section aria-labelledby="body-title"><div className="mb-3 flex items-end justify-between gap-3"><h2 id="body-title" className="type-section-title">Bodyweight</h2><button onClick={() => navigate('/app/dataroom/body')} className="type-action text-muted-foreground hover:text-foreground">Open</button></div><WeightTrendChart metrics={current.metrics} target={current.preferences?.weight_goal} />{latestPhysique && <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-border py-3"><Metric label="Waist" value={latestPhysique.waist_cm == null ? '—' : `${latestPhysique.waist_cm} cm`} /><Metric label="Chest" value={latestPhysique.chest_cm == null ? '—' : `${latestPhysique.chest_cm} cm`} /><Metric label="Left arm" value={latestPhysique.upper_arm_left_cm == null ? '—' : `${latestPhysique.upper_arm_left_cm} cm`} /><Metric label="Right arm" value={latestPhysique.upper_arm_right_cm == null ? '—' : `${latestPhysique.upper_arm_right_cm} cm`} /></div>}</section>

          <section aria-labelledby="domains-title"><div className="mb-3"><h2 id="domains-title" className="type-section-title">Sections</h2></div><div className="divide-y divide-border border-y border-border">
            <DomainRow icon={Scale} title="Body & physique" value={weightValue} detail={latestPhysique ? `${current.physique.length} check-in${current.physique.length === 1 ? '' : 's'}` : 'Weight and measurements'} onClick={() => navigate('/app/dataroom/body')} />
            <DomainRow icon={Dumbbell} title="Training" value={trainingValue} detail={topMuscles.length ? topMuscles.map(muscle => muscle.muscle).join(', ') : 'Volume and progression'} onClick={() => navigate('/app/dataroom/training')} />
            <DomainRow icon={Utensils} title="Nutrition" value={nutritionValue} detail={`${currentSummary.nutritionLoggedDays}/${days} logged days`} onClick={() => navigate('/app/dataroom/nutrition')} />
            <DomainRow icon={Moon} title="Recovery" value={recoveryValue} detail={`${current.readiness.length} readiness log${current.readiness.length === 1 ? '' : 's'}`} onClick={() => navigate('/app/dataroom/recovery')} />
            <DomainRow icon={Footprints} title="Activity & movement" value={activityValue} detail={activityKinds.length ? activityKinds.slice(0, 2).map(([kind, mins]) => `${kind} ${Math.round(mins)} min`).join(' · ') : latestMobility ? 'Mobility available' : 'Activity and mobility'} onClick={() => navigate('/app/dataroom/activity')} />
          </div></section>
        </div>

        <div className="space-y-8 lg:sticky lg:top-6">
          <section aria-labelledby="matters-title"><div className="mb-3"><h2 id="matters-title" className="type-section-title">Findings</h2></div>{current.analysis?.findings.length ? <div className="divide-y divide-border border-y border-border">{current.analysis.findings.map(finding => <Finding key={finding.id} finding={finding} />)}</div> : current.isLoading ? <LoadingLine /> : <div className="border-y border-border py-5"><p className="text-sm font-semibold">No supported change yet.</p><p className="type-caption mt-1">Keep logging.</p></div>}</section>

          <section aria-labelledby="progression-title"><div className="mb-3 flex items-end justify-between gap-3"><h2 id="progression-title" className="type-section-title">Exercise Progress</h2><button onClick={() => navigate('/app/dataroom/training')} className="type-action text-muted-foreground hover:text-foreground">All</button></div><div className="divide-y divide-border border-y border-border">{(current.analysis?.exercises || []).slice(0, 5).map(exercise => { const last = exercise.exposures.at(-1); return <button key={exercise.exercise} onClick={() => navigate(`/app/dataroom/exercise/${encodeURIComponent(exercise.exercise)}`)} className="w-full py-3 flex items-center gap-3 text-left hover:bg-muted/20"><span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{exercise.exercise}</span><span className="block type-caption mt-0.5">{last ? (last.weight > 0 ? `${last.weight} × ${last.reps}` : `${last.reps} reps`) : 'No comparable set'}</span></span><span className="text-xs font-semibold capitalize">{exercise.state === 'unclear' ? 'Needs data' : exercise.state}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>; })}{!current.analysis?.exercises.length && <div className="py-5 type-caption">Not enough comparable history.</div>}</div></section>

          <section aria-labelledby="more-title"><div className="mb-3"><h2 id="more-title" className="type-section-title">More</h2></div><div className="divide-y divide-border border-y border-border">
            <DomainRow icon={Activity} title="Timeline" value="History" detail="Chronological log" onClick={() => navigate('/app/dataroom/timeline')} />
            <DomainRow icon={Database} title="Records" value="PRs" detail="Exercise bests" onClick={() => navigate('/app/dataroom/records')} />
            <DomainRow icon={Activity} title="Explore" value="Advanced" detail="Correlations and deeper charts" onClick={() => navigate('/app/dataroom/explore')} />
          </div></section>
        </div>
      </div>
    </div>
  </MainLayout>;
}

export default function Dataroom() {
  return <DataroomRangeProvider><DataroomContent /></DataroomRangeProvider>;
}
