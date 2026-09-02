import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronRight, Database, Dumbbell, Footprints, Gauge, Moon, Scale, Settings2, Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataroomRangeProvider, useDataroomRange } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from '@/components/dataroom/DataroomRangeSelector';
import { WorkoutConsistencyMap } from '@/components/dataroom/WorkoutConsistencyMap';
import { WeightTrendChart } from '@/components/progress/WeightTrendChart';
import { ConfidenceMark } from '@/components/dataroom/DataRoomVisuals';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useNavigate } from 'react-router-dom';
import { absoluteDelta, evidenceCoverage, previousComparableRange, summarizeDataroomPeriod } from '@/lib/dataroom/overview';
import type { DataroomFinding } from '@/lib/dataroom/types';

function MiniTrend({ values }: { values: number[] }) {
  const clean = values.filter(value => Number.isFinite(value));
  if (clean.length < 2) return <div className="h-14 border-b border-dashed border-border" />;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const points = clean.map((value, index) => ({
    x: 4 + index / Math.max(1, clean.length - 1) * 152,
    y: 44 - (value - min) / span * 36,
  }));
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const last = points.at(-1)!;
  return <svg viewBox="0 0 160 48" preserveAspectRatio="none" className="h-14 w-full" aria-hidden>
    <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={last.x} cy={last.y} r="3.5" fill="currentColor" />
  </svg>;
}

function MetricCard({ label, value, detail, values, onClick }: { label: string; value: string; detail?: string; values: number[]; onClick: () => void }) {
  return <button onClick={onClick} className="min-w-0 rounded-[18px] border border-border bg-card p-4 text-left hover:bg-muted/20 transition-colors">
    <div className="flex items-start justify-between gap-3"><span className="type-caption">{label}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
    <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</div>
    {detail && <div className="type-caption mt-0.5">{detail}</div>}
    <div className="mt-3 text-muted-foreground"><MiniTrend values={values} /></div>
  </button>;
}

function DomainRow({ icon: Icon, title, value, detail, onClick }: { icon: typeof Scale; title: string; value: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30 focus-visible:bg-muted/30 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span><span className="flex-1 min-w-0"><span className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold">{title}</span><span className="text-sm font-semibold tabular-nums text-right">{value}</span></span><span className="block type-caption mt-0.5 line-clamp-1">{detail}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /></button>;
}

function ChangeRow({ label, current, previous, delta, detail }: { label: string; current: string; previous?: string; delta?: string | null; detail?: string }) {
  return <div className="py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center"><div className="min-w-0"><div className="text-sm font-semibold">{label}</div><div className="type-caption mt-0.5">{previous ? `${previous} → ${current}` : current}{detail ? ` · ${detail}` : ''}</div></div>{delta && <div className="text-sm font-semibold tabular-nums">{delta}</div>}</div>;
}

function findingPath(domain: DataroomFinding['domain']) {
  if (domain === 'bodyweight') return '/app/dataroom/body';
  if (domain === 'training') return '/app/dataroom/training';
  if (domain === 'nutrition') return '/app/dataroom/nutrition';
  if (domain === 'recovery') return '/app/dataroom/recovery';
  return '/app/dataroom/explore';
}

function GoalProgressBar({ start, current, target }: { start: number; current: number; target: number }) {
  const total = Math.abs(target - start);
  if (!Number.isFinite(total) || total < 0.05) return null;
  const done = Math.min(1, Math.max(0, Math.abs(current - start) / total));
  const remaining = Math.abs(target - current);
  const reached = target > start ? current >= target : current <= target;
  const percent = Math.round(done * 100);
  return <div className="mt-3 rounded-xl bg-muted/40 p-3" onClick={event => event.stopPropagation()}>
    <div className="flex items-baseline justify-between gap-2">
      <span className="type-meta uppercase text-muted-foreground">Target {target} kg</span>
      <span className="text-sm font-semibold tabular-nums">{reached ? 'Target reached' : `${percent}% there`}</span>
    </div>
    <div className="relative mt-2 h-2 rounded-full bg-muted overflow-hidden">
      <div className="absolute inset-y-0 left-0 rounded-full bg-foreground transition-all" style={{ width: `${percent}%` }} />
    </div>
    <div className="mt-1.5 flex items-baseline justify-between gap-2 type-caption">
      <span>Start {start.toFixed(1)} kg</span>
      <span>{reached ? 'Holding at goal' : `${remaining.toFixed(1)} kg to go`}</span>
    </div>
  </div>;
}

function AttentionCard({ finding, values, onClick, goalProgress }: { finding: DataroomFinding; values: number[]; onClick: () => void; goalProgress?: { start: number; current: number; target: number } | null }) {
  const action = finding.actionKind === 'keep' ? 'On track' : finding.actionKind;
  return <button onClick={onClick} className="rounded-[20px] border border-border bg-card p-4 text-left hover:bg-muted/20 transition-colors">
    <div className="flex items-center justify-between gap-3"><span className="rounded-md bg-muted px-2 py-1 type-meta uppercase">{action}</span><ConfidenceMark value={finding.confidence} compact /></div>
    <h3 className="mt-3 text-base font-semibold leading-5">{finding.title}</h3>
    <p className="mt-1 type-caption line-clamp-2">{finding.signal}</p>
    <div className="mt-4 text-foreground"><MiniTrend values={values} /></div>
    {goalProgress && <GoalProgressBar {...goalProgress} />}
    <div className="mt-3 flex items-start justify-between gap-3 border-t border-border pt-3"><p className="text-sm font-medium leading-5 line-clamp-2">{finding.action}</p><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /></div>
  </button>;
}

function LoadingLine() {
  return <div className="h-24 animate-pulse rounded-xl bg-muted/70" aria-hidden="true" />;
}

function DataroomContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { days, dateRange } = useDataroomRange();
  const current = useDataroomData(dateRange);
  const firstWeight = useQuery({
    queryKey: ['dataroom-first-weight', user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<number | null> => {
      if (!user) return null;
      const { data } = await supabase.from('daily_metrics').select('bodyweight').eq('user_id', user.id).gt('bodyweight', 0).order('date', { ascending: true }).limit(1).maybeSingle();
      return data?.bodyweight != null ? Number(data.bodyweight) : null;
    },
  });
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

  const actionFindings = (current.analysis?.findings || []).filter(finding => finding.actionKind !== 'keep');
  const attentionFindings = (actionFindings.length ? actionFindings : current.analysis?.findings || []).slice(0, 3);
  const primaryTrainingTrend = (current.analysis?.exercises || []).find(exercise => exercise.state === 'declining')
    || (current.analysis?.exercises || []).find(exercise => exercise.state === 'progressing')
    || current.analysis?.exercises[0];

  const weightSeries = current.analysis?.weight.points.map(point => point.trend) || [];
  const proteinSeries = [...current.meals].sort((a, b) => a.date.localeCompare(b.date)).map(day => day.protein);
  const sleepSeries = current.metrics.filter(metric => Number(metric.sleep_hours) > 0).sort((a, b) => a.date.localeCompare(b.date)).map(metric => Number(metric.sleep_hours));
  const trainingSeries = primaryTrainingTrend?.exposures.map(exposure => exposure.e1rm || exposure.weight || exposure.reps) || [];
  const coverageSeries = [coverage.weight.count / Math.max(days, 1), coverage.training.count / Math.max(days / 7, 1), coverage.nutrition.count / Math.max(days, 1), coverage.sleep.count / Math.max(days, 1), coverage.activity.count / Math.max(days / 7, 1)];
  const seriesFor = (finding: DataroomFinding) => finding.domain === 'bodyweight' ? weightSeries : finding.domain === 'training' ? trainingSeries : finding.domain === 'nutrition' ? proteinSeries : finding.domain === 'recovery' ? sleepSeries : coverageSeries;

  const weightGoalTarget = current.preferences?.weight_goal;
  const currentWeight = current.analysis?.weight.trendWeight ?? currentSummary.weightLatest;
  const goalProgress = weightGoalTarget && currentWeight != null && firstWeight.data != null && current.preferences?.weight_goal_type !== 'maintain'
    ? { start: firstWeight.data, current: currentWeight, target: Number(weightGoalTarget) }
    : null;
  const goalProgressFor = (finding: DataroomFinding) => finding.domain === 'bodyweight' ? goalProgress : null;

  const weightValue = current.analysis?.weight.trendWeight != null ? `${current.analysis.weight.trendWeight.toFixed(1)} kg` : currentSummary.weightLatest != null ? `${currentSummary.weightLatest} kg` : 'No data';
  const trainingValue = currentSummary.workouts ? `${currentSummary.workouts} workouts` : 'No sessions';
  const nutritionValue = currentSummary.proteinPerLoggedDay != null ? `${currentSummary.proteinPerLoggedDay} g` : 'No logs';
  const recoveryValue = currentSummary.sleepAverage != null ? `${currentSummary.sleepAverage.toFixed(1)} h` : 'No data';
  const activityValue = currentSummary.activityMinutes ? `${currentSummary.activityMinutes} min` : 'No activity';

  return <MainLayout wide>
    <div className="mx-auto w-full max-w-[1100px] pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <h1 className="type-page-title">Dataroom</h1>
        <div className="flex items-center gap-2"><DataroomRangeSelector /><button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"><Settings2 className="h-5 w-5" /></button></div>
      </header>

      <section className="mb-8" aria-labelledby="attention-title">
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="attention-title" className="type-section-title">{actionFindings.length ? 'Needs Attention' : 'Current Read'}</h2>{current.analysis?.headline && <p className="type-caption mt-1 line-clamp-1">{current.analysis.headline}</p>}</div>{current.analysis && <ConfidenceMark value={current.analysis.confidence} compact />}</div>
        {current.isLoading && !current.analysis ? <LoadingLine /> : attentionFindings.length ? <div className="grid gap-3 md:grid-cols-3">{attentionFindings.map(finding => <AttentionCard key={finding.id} finding={finding} values={seriesFor(finding)} goalProgress={goalProgressFor(finding)} onClick={() => navigate(findingPath(finding.domain))} />)}</div> : <div className="border-y border-border py-5 text-sm font-semibold">Not enough evidence yet.</div>}
      </section>

      <section className="mb-8" aria-labelledby="pulse-title">
        <div className="mb-3"><h2 id="pulse-title" className="type-section-title">Pulse</h2></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Bodyweight" value={weightValue} detail={current.analysis?.weight.percentPerWeek == null ? undefined : `${current.analysis.weight.percentPerWeek > 0 ? '+' : ''}${current.analysis.weight.percentPerWeek}% / week`} values={weightSeries} onClick={() => navigate('/app/dataroom/body')} />
          <MetricCard label="Training" value={`${progressing} improving`} detail={`${stable} stable · ${currentSummary.workouts} workouts`} values={trainingSeries} onClick={() => navigate('/app/dataroom/training')} />
          <MetricCard label="Protein" value={nutritionValue} detail={current.preferences?.daily_protein_goal ? `${current.preferences.daily_protein_goal} g target` : `${currentSummary.nutritionLoggedDays} logged days`} values={proteinSeries} onClick={() => navigate('/app/dataroom/nutrition')} />
          <MetricCard label="Sleep" value={recoveryValue} detail={`${currentSummary.sleepNights} nights`} values={sleepSeries} onClick={() => navigate('/app/dataroom/recovery')} />
        </div>
      </section>

      <div className="mb-8"><WorkoutConsistencyMap /></div>

      <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-8 items-start">
        <div className="space-y-8">
          <section aria-labelledby="body-title"><div className="mb-3 flex items-end justify-between gap-3"><h2 id="body-title" className="type-section-title">Bodyweight</h2><button onClick={() => navigate('/app/dataroom/body')} className="type-action text-muted-foreground hover:text-foreground">Open</button></div><WeightTrendChart metrics={current.metrics} target={current.preferences?.weight_goal} />{latestPhysique && <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-border py-3"><div><div className="type-caption">Waist</div><div className="mt-1 text-lg font-semibold tabular-nums">{latestPhysique.waist_cm == null ? '—' : `${latestPhysique.waist_cm} cm`}</div></div><div><div className="type-caption">Chest</div><div className="mt-1 text-lg font-semibold tabular-nums">{latestPhysique.chest_cm == null ? '—' : `${latestPhysique.chest_cm} cm`}</div></div><div><div className="type-caption">Left arm</div><div className="mt-1 text-lg font-semibold tabular-nums">{latestPhysique.upper_arm_left_cm == null ? '—' : `${latestPhysique.upper_arm_left_cm} cm`}</div></div><div><div className="type-caption">Right arm</div><div className="mt-1 text-lg font-semibold tabular-nums">{latestPhysique.upper_arm_right_cm == null ? '—' : `${latestPhysique.upper_arm_right_cm} cm`}</div></div></div>}</section>

          <section aria-labelledby="changed-title"><div className="mb-3"><h2 id="changed-title" className="type-section-title">vs Previous {days} Days</h2></div>{previous.isLoading && current.isLoading ? <LoadingLine /> : <div className="divide-y divide-border border-y border-border">
            <ChangeRow label="Bodyweight" current={currentSummary.weightLatest == null ? 'No data' : `${currentSummary.weightLatest} kg`} previous={previousSummary.weightLatest == null ? undefined : `${previousSummary.weightLatest} kg`} delta={currentSummary.weightChange == null ? null : `${currentSummary.weightChange > 0 ? '+' : ''}${currentSummary.weightChange} kg`} detail={`${currentSummary.weightMeasurements} measurements`} />
            <ChangeRow label="Training" current={`${currentSummary.workouts} workouts`} previous={`${previousSummary.workouts} workouts`} delta={workoutDelta == null || workoutDelta === 0 ? null : `${workoutDelta > 0 ? '+' : ''}${workoutDelta}`} detail={`${currentSummary.sets} sets`} />
            <ChangeRow label="Sleep" current={currentSummary.sleepAverage == null ? 'No data' : `${currentSummary.sleepAverage.toFixed(1)} h`} previous={previousSummary.sleepAverage == null ? undefined : `${previousSummary.sleepAverage.toFixed(1)} h`} delta={sleepDelta == null || Math.abs(sleepDelta) < 0.05 ? null : `${sleepDelta > 0 ? '+' : ''}${sleepDelta.toFixed(1)} h`} detail={`${currentSummary.sleepNights} nights`} />
            <ChangeRow label="Protein" current={currentSummary.proteinPerLoggedDay == null ? 'No data' : `${currentSummary.proteinPerLoggedDay} g`} previous={previousSummary.proteinPerLoggedDay == null ? undefined : `${previousSummary.proteinPerLoggedDay} g`} delta={proteinDelta == null || proteinDelta === 0 ? null : `${proteinDelta > 0 ? '+' : ''}${proteinDelta} g`} detail={`${currentSummary.nutritionLoggedDays} days`} />
          </div>}</section>

          <section aria-labelledby="progression-title"><div className="mb-3 flex items-end justify-between gap-3"><h2 id="progression-title" className="type-section-title">Exercise Progress</h2><button onClick={() => navigate('/app/dataroom/training')} className="type-action text-muted-foreground hover:text-foreground">All</button></div><div className="divide-y divide-border border-y border-border">{(current.analysis?.exercises || []).slice(0, 5).map(exercise => { const last = exercise.exposures.at(-1); return <button key={exercise.exercise} onClick={() => navigate(`/app/dataroom/exercise/${encodeURIComponent(exercise.exercise)}`)} className="w-full py-3 flex items-center gap-3 text-left hover:bg-muted/20"><span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{exercise.exercise}</span><span className="block type-caption mt-0.5">{last ? (last.weight > 0 ? `${last.weight} × ${last.reps}` : `${last.reps} reps`) : 'No comparable set'}</span></span><span className="text-xs font-semibold capitalize">{exercise.state === 'unclear' ? 'Needs data' : exercise.state}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>; })}{!current.analysis?.exercises.length && <div className="py-5 type-caption">Not enough comparable history.</div>}</div></section>
        </div>

        <div className="space-y-8 lg:sticky lg:top-6">
          <section aria-labelledby="domains-title"><div className="mb-3"><h2 id="domains-title" className="type-section-title">Sections</h2></div><div className="divide-y divide-border border-y border-border">
            <DomainRow icon={Scale} title="Body & physique" value={weightValue} detail={latestPhysique ? `${current.physique.length} check-in${current.physique.length === 1 ? '' : 's'}` : 'Weight and measurements'} onClick={() => navigate('/app/dataroom/body')} />
            <DomainRow icon={Dumbbell} title="Training" value={trainingValue} detail={topMuscles.length ? topMuscles.map(muscle => muscle.muscle).join(', ') : 'Volume and progression'} onClick={() => navigate('/app/dataroom/training')} />
            <DomainRow icon={Utensils} title="Nutrition" value={nutritionValue} detail={`${currentSummary.nutritionLoggedDays}/${days} logged days`} onClick={() => navigate('/app/dataroom/nutrition')} />
            <DomainRow icon={Moon} title="Recovery" value={recoveryValue} detail={`${current.readiness.length} readiness log${current.readiness.length === 1 ? '' : 's'}`} onClick={() => navigate('/app/dataroom/recovery')} />
            <DomainRow icon={Footprints} title="Activity & movement" value={activityValue} detail={activityKinds.length ? activityKinds.slice(0, 2).map(([kind, mins]) => `${kind} ${Math.round(mins)} min`).join(' · ') : latestMobility ? 'Mobility available' : 'Activity and mobility'} onClick={() => navigate('/app/dataroom/activity')} />
          </div></section>

          <section aria-labelledby="coverage-title"><div className="mb-3"><h2 id="coverage-title" className="type-section-title">Coverage</h2></div><div className="divide-y divide-border border-y border-border">
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Bodyweight</span><span className="font-semibold tabular-nums">{coverage.weight.count}</span></div>
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Training</span><span className="font-semibold tabular-nums">{coverage.training.count}</span></div>
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Nutrition</span><span className="font-semibold tabular-nums">{coverage.nutrition.count} days</span></div>
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Sleep</span><span className="font-semibold tabular-nums">{coverage.sleep.count} nights</span></div>
            <div className="py-3 flex justify-between gap-3 text-sm"><span>Activity</span><span className="font-semibold tabular-nums">{coverage.activity.count}</span></div>
          </div></section>

          <section aria-labelledby="more-title"><div className="mb-3"><h2 id="more-title" className="type-section-title">More</h2></div><div className="divide-y divide-border border-y border-border">
            <DomainRow icon={Activity} title="History" value="Log" detail="Chronological log" onClick={() => navigate('/app/dataroom/history')} />
            <DomainRow icon={Database} title="Records" value="PRs" detail="Exercise bests" onClick={() => navigate('/app/dataroom/records')} />
            <DomainRow icon={Gauge} title="Performance Lab" value="Advanced" detail="Blocks, experiments, simulator, and tools" onClick={() => navigate('/app/dataroom/lab')} />
            <DomainRow icon={Activity} title="Explore" value="Analysis" detail="Correlations and deeper charts" onClick={() => navigate('/app/dataroom/explore')} />
          </div></section>
        </div>
      </div>
    </div>
  </MainLayout>;
}

export default function Dataroom() {
  return <DataroomRangeProvider><DataroomContent /></DataroomRangeProvider>;
}