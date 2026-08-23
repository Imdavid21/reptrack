import { useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Database, Dumbbell, Footprints, Moon, Scale, Settings2, Utensils } from 'lucide-react';
import { eachDayOfInterval, format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataroomRangeProvider, useDataroomRange } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from '@/components/dataroom/DataroomRangeSelector';
import { ConfidenceMark } from '@/components/dataroom/DataRoomVisuals';
import { DumbbellMetric, EvidenceMatrix, TimelineTracks, TrajectoryRail, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useNavigate } from 'react-router-dom';
import { absoluteDelta, evidenceCoverage, previousComparableRange, summarizeDataroomPeriod } from '@/lib/dataroom/overview';
import { cn } from '@/lib/utils';

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0"><div className="type-caption">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</div>{detail && <div className="mt-0.5 type-caption">{detail}</div>}</div>;
}

function DomainRow({ icon: Icon, title, value, detail, onClick }: { icon: typeof Scale; title: string; value: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full min-h-16 px-3 py-3 flex items-center gap-3 text-left rounded-xl hover:bg-muted/30 focus-visible:bg-muted/30 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span><span className="flex-1 min-w-0"><span className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold">{title}</span><span className="text-sm font-semibold tabular-nums text-right">{value}</span></span><span className="block type-caption mt-0.5 line-clamp-2">{detail}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /></button>;
}

function Finding({ finding }: { finding: NonNullable<ReturnType<typeof useDataroomData>['analysis']>['findings'][number] }) {
  const [open, setOpen] = useState(false);
  return <article className="rounded-2xl border border-border bg-card p-4">
    <button onClick={() => setOpen(value => !value)} aria-expanded={open} className="w-full text-left">
      <div className="flex items-start gap-3"><span className={cn('mt-0.5 min-w-[4.5rem] rounded-lg px-2 py-1 text-center type-meta uppercase', finding.actionKind === 'keep' ? 'bg-muted text-foreground' : finding.actionKind === 'change' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{finding.actionKind}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold leading-5">{finding.title}</h3><ConfidenceMark value={finding.confidence} compact /></div><p className="type-caption mt-1">{finding.signal}</p></div><ChevronDown className={cn('h-4 w-4 mt-1 text-muted-foreground transition-transform', open && 'rotate-180')} /></div>
    </button>
    {open && <div className="mt-4 grid gap-3 border-t border-border pt-4"><div className="grid grid-cols-[88px_1fr] gap-3"><div className="type-meta">Signal</div><p className="text-sm">{finding.signal}</p></div><div className="grid grid-cols-[88px_1fr] gap-3"><div className="type-meta">Evidence</div><ul className="space-y-1">{finding.evidence.map(item => <li key={item} className="type-caption">{item}</li>)}</ul></div><div className="grid grid-cols-[88px_1fr] gap-3"><div className="type-meta">Decision</div><p className="text-sm font-semibold">{finding.action}</p></div><div className="grid grid-cols-[88px_1fr] gap-3"><div className="type-meta">Interpretation</div><p className="type-caption">{finding.interpretation}</p></div></div>}
  </article>;
}

function LoadingLine() {
  return <div className="h-24 animate-pulse rounded-2xl bg-muted/70" aria-hidden="true" />;
}

function DataroomContent() {
  const navigate = useNavigate();
  const { range, days, dateRange } = useDataroomRange();
  const current = useDataroomData(dateRange);
  const previousRange = useMemo(() => previousComparableRange(dateRange), [dateRange]);
  const previous = useDataroomData(previousRange);

  const currentSummary = useMemo(() => summarizeDataroomPeriod({ range: dateRange, metrics: current.metrics, workouts: current.workouts, sets: current.sets, meals: current.meals, activities: current.activities }), [dateRange, current.metrics, current.workouts, current.sets, current.meals, current.activities]);
  const previousSummary = useMemo(() => summarizeDataroomPeriod({ range: previousRange, metrics: previous.metrics, workouts: previous.workouts, sets: previous.sets, meals: previous.meals, activities: previous.activities }), [previousRange, previous.metrics, previous.workouts, previous.sets, previous.meals, previous.activities]);

  const coverage = evidenceCoverage({ days, weightMeasurements: currentSummary.weightMeasurements, workouts: currentSummary.workouts, nutritionLoggedDays: currentSummary.nutritionLoggedDays, sleepNights: currentSummary.sleepNights, activitySessions: current.activities.length });
  const progressing = current.analysis?.exercises.filter(exercise => exercise.state === 'progressing').length ?? 0;
  const stable = current.analysis?.exercises.filter(exercise => exercise.state === 'stable').length ?? 0;
  const topMuscles = (current.analysis?.muscles || []).filter(muscle => muscle.setsPerWeek > 0).sort((a, b) => b.setsPerWeek - a.setsPerWeek).slice(0, 3);
  const activityKinds = useMemo(() => {
    const map = new Map<string, number>();
    current.activities.forEach(item => map.set(item.activity_type, (map.get(item.activity_type) || 0) + Number(item.duration_minutes || 0)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [current.activities]);

  const dates = useMemo(() => eachDayOfInterval(dateRange).map(day => format(day, 'yyyy-MM-dd')), [dateRange]);
  const observed = useMemo(() => ({
    weight: new Set(current.metrics.filter(day => Number(day.bodyweight || 0) > 0).map(day => day.date)),
    training: new Set(current.workouts.filter(workout => Boolean(workout.completed_at)).map(workout => workout.date)),
    nutrition: new Set(current.meals.map(day => day.date)),
    sleep: new Set(current.metrics.filter(day => Number(day.sleep_hours || 0) > 0).map(day => day.date)),
    activity: new Set(current.activities.map(item => item.date)),
  }), [current.metrics, current.workouts, current.meals, current.activities]);

  const workoutByDate = useMemo(() => {
    const map = new Map<string, number>();
    current.workouts.forEach(workout => { if (workout.completed_at) map.set(workout.date, (map.get(workout.date) || 0) + 1); });
    return map;
  }, [current.workouts]);
  const proteinByDate = useMemo(() => new Map(current.meals.map(day => [day.date, day.protein])), [current.meals]);
  const activityByDate = useMemo(() => {
    const map = new Map<string, number>();
    current.activities.forEach(item => map.set(item.date, (map.get(item.date) || 0) + Number(item.duration_minutes || 0)));
    return map;
  }, [current.activities]);
  const metricByDate = useMemo(() => new Map(current.metrics.map(day => [day.date, day])), [current.metrics]);

  const timelineTracks = useMemo(() => [
    { label: 'Weight', values: dates.map(date => ({ date, value: Number(metricByDate.get(date)?.bodyweight || 0) || null })) },
    { label: 'Train', values: dates.map(date => ({ date, value: workoutByDate.get(date) || null })) },
    { label: 'Protein', values: dates.map(date => ({ date, value: proteinByDate.get(date) || null })) },
    { label: 'Sleep', values: dates.map(date => ({ date, value: Number(metricByDate.get(date)?.sleep_hours || 0) || null })) },
    { label: 'Activity', values: dates.map(date => ({ date, value: activityByDate.get(date) || null })) },
  ], [dates, metricByDate, workoutByDate, proteinByDate, activityByDate]);

  const weightSpark = current.analysis?.weight.points.map(point => point.trend) || [];
  const trainingSpark = dates.map(date => workoutByDate.get(date) || 0);
  const proteinSpark = dates.map(date => proteinByDate.get(date) || 0);
  const sleepSpark = dates.map(date => Number(metricByDate.get(date)?.sleep_hours || 0));
  const activitySpark = dates.map(date => activityByDate.get(date) || 0);

  const weightValue = current.analysis?.weight.trendWeight != null ? `${current.analysis.weight.trendWeight.toFixed(1)} kg` : currentSummary.weightLatest != null ? `${currentSummary.weightLatest} kg` : 'Needs data';
  const trainingValue = currentSummary.workouts ? `${(currentSummary.workouts / days * 7).toFixed(1)}/wk` : 'No sessions';
  const nutritionValue = currentSummary.proteinPerLoggedDay != null ? `${currentSummary.proteinPerLoggedDay} g` : 'No logs';
  const recoveryValue = currentSummary.sleepAverage != null ? `${currentSummary.sleepAverage.toFixed(1)} h` : 'Needs data';
  const activityValue = currentSummary.activityMinutes ? `${currentSummary.activityMinutes} min` : 'No activity';

  return <MainLayout wide>
    <div className="mx-auto w-full max-w-[1000px] pb-12">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0"><h1 className="type-page-title">Dataroom</h1><p className="type-supporting mt-1">Your body, training, nutrition, recovery, and evidence in one timeline.</p></div>
        <button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"><Settings2 className="h-5 w-5" /></button>
      </header>
      <div className="mb-5"><DataroomRangeSelector /></div>

      <section className="rounded-3xl border border-border bg-card p-4 mb-6" aria-labelledby="current-read-title">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="type-eyebrow">Current read · {range}</div><h2 id="current-read-title" className="mt-2 text-xl sm:text-2xl font-semibold leading-tight">{current.analysis?.headline || (current.isLoading ? 'Reading the available evidence…' : 'Not enough comparable evidence for a strong read yet.')}</h2></div>{current.analysis && <ConfidenceMark value={current.analysis.confidence} compact />}</div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Metric label="Bodyweight" value={weightValue} detail={current.analysis?.weight.percentPerWeek == null ? undefined : `${current.analysis.weight.percentPerWeek > 0 ? '+' : ''}${current.analysis.weight.percentPerWeek}% / week`} />
          <Metric label="Training" value={trainingValue} detail={`${currentSummary.sets} working sets`} />
          <Metric label="Key lifts" value={current.analysis ? `${progressing} improving` : 'Loading…'} detail={current.analysis ? `${stable} stable` : undefined} />
          <Metric label="Protein" value={nutritionValue} detail={currentSummary.nutritionLoggedDays ? `${currentSummary.nutritionLoggedDays} logged days` : undefined} />
        </div>
      </section>

      <div className="space-y-8">
        <VisualSection eyebrow="Trajectory" title="Scan each domain" description="Compact trends first. Tap a domain for its full evidence.">
          <TrajectoryRail cards={[
            { label: 'Body', value: weightValue, detail: current.analysis?.weight.direction || 'Trend', values: weightSpark, onClick: () => navigate('/app/dataroom/body') },
            { label: 'Training', value: trainingValue, detail: progressing ? `${progressing} lifts improving` : 'Recent frequency', values: trainingSpark, onClick: () => navigate('/app/dataroom/training') },
            { label: 'Nutrition', value: nutritionValue, detail: 'Protein / logged day', values: proteinSpark, onClick: () => navigate('/app/dataroom/nutrition') },
            { label: 'Recovery', value: recoveryValue, detail: 'Average sleep', values: sleepSpark, onClick: () => navigate('/app/dataroom/recovery') },
            { label: 'Activity', value: activityValue, detail: 'Recorded movement', values: activitySpark, onClick: () => navigate('/app/dataroom/activity') },
          ]} />
        </VisualSection>

        <VisualSection eyebrow="Timeline" title="See the signals on the same dates" description="Drag horizontally to inspect one day across every track.">
          <TimelineTracks tracks={timelineTracks} onDateOpen={() => navigate('/app/dataroom/timeline')} />
        </VisualSection>

        <VisualSection eyebrow="Evidence" title="What RepTrack actually knows" description="Filled cells are observations. Missing evidence stays missing.">
          <EvidenceMatrix dates={dates} rows={[
            { label: 'Weight', observed: observed.weight },
            { label: 'Training', observed: observed.training },
            { label: 'Food', observed: observed.nutrition },
            { label: 'Sleep', observed: observed.sleep },
            { label: 'Activity', observed: observed.activity },
          ]} />
          <p className="type-caption mt-2">Coverage: {coverage.weight.count} weigh-ins · {coverage.training.count} workouts · {coverage.nutrition.count} nutrition days · {coverage.sleep.count} sleep nights.</p>
        </VisualSection>

        <VisualSection eyebrow="What changed" title={`This period vs the previous ${days} days`}>
          <div className="grid grid-cols-2 gap-3">
            <DumbbellMetric label="Bodyweight" previous={previousSummary.weightLatest} current={currentSummary.weightLatest} formatValue={value => `${Number(value.toFixed(1))} kg`} />
            <DumbbellMetric label="Workouts" previous={previousSummary.workouts} current={currentSummary.workouts} formatValue={value => `${Number(value.toFixed(0))}`} />
            <DumbbellMetric label="Sleep" previous={previousSummary.sleepAverage} current={currentSummary.sleepAverage} formatValue={value => `${Number(value.toFixed(1))} h`} />
            <DumbbellMetric label="Protein" previous={previousSummary.proteinPerLoggedDay} current={currentSummary.proteinPerLoggedDay} formatValue={value => `${Number(value.toFixed(0))} g`} />
          </div>
        </VisualSection>

        <VisualSection eyebrow="What matters" title="Decision-relevant findings" description="RepTrack separates the signal, supporting evidence, and the action it justifies.">
          {current.analysis?.findings.length ? <div className="space-y-3">{current.analysis.findings.map(finding => <Finding key={finding.id} finding={finding} />)}</div> : current.isLoading ? <LoadingLine /> : <div className="rounded-2xl border border-border bg-card p-4"><p className="text-sm font-semibold">No change is justified yet.</p><p className="type-caption mt-1">Keep logging. RepTrack will surface a finding only when the available evidence can support one.</p></div>}
        </VisualSection>

        <VisualSection eyebrow="Explore" title="Go deeper by domain">
          <div className="grid gap-2 rounded-2xl border border-border bg-card p-1">
            <DomainRow icon={Scale} title="Body & physique" value={weightValue} detail="Weight trend, measurements, and physique check-ins" onClick={() => navigate('/app/dataroom/body')} />
            <DomainRow icon={Dumbbell} title="Training" value={`${currentSummary.workouts} workouts`} detail={topMuscles.length ? `Highest exposure: ${topMuscles.map(muscle => muscle.muscle).join(', ')}` : 'Frequency, muscle exposure, and progression'} onClick={() => navigate('/app/dataroom/training')} />
            <DomainRow icon={Utensils} title="Nutrition" value={nutritionValue} detail={`${currentSummary.nutritionLoggedDays}/${days} days contain logs · completeness unknown`} onClick={() => navigate('/app/dataroom/nutrition')} />
            <DomainRow icon={Moon} title="Recovery" value={recoveryValue} detail={`${current.readiness.length} readiness check-in${current.readiness.length === 1 ? '' : 's'} · sleep and training context`} onClick={() => navigate('/app/dataroom/recovery')} />
            <DomainRow icon={Footprints} title="Activity & movement" value={activityValue} detail={activityKinds.length ? activityKinds.slice(0, 2).map(([kind, mins]) => `${kind} ${Math.round(mins)} min`).join(' · ') : 'Recorded movement and mobility'} onClick={() => navigate('/app/dataroom/activity')} />
            <DomainRow icon={Activity} title="Timeline" value="History" detail="Inspect workouts, weight, sleep, food, and activity by day" onClick={() => navigate('/app/dataroom/timeline')} />
            <DomainRow icon={Database} title="Records" value="PRs" detail="Exact exercise records and progression history" onClick={() => navigate('/app/dataroom/records')} />
            <DomainRow icon={Activity} title="Explore" value="Advanced" detail="Deeper charts, energy evidence, and relationships" onClick={() => navigate('/app/dataroom/explore')} />
          </div>
        </VisualSection>
      </div>
    </div>
  </MainLayout>;
}

export default function Dataroom() {
  return <DataroomRangeProvider><DataroomContent /></DataroomRangeProvider>;
}
