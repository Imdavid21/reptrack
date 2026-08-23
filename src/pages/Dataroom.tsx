import { useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Database, Dumbbell, Footprints, Moon, Scale, Settings2, Utensils } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataroomRangeProvider, useDataroomRange } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from '@/components/dataroom/DataroomRangeSelector';
import { ConfidenceMark } from '@/components/dataroom/DataRoomVisuals';
import { TrendLineChart } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useNavigate } from 'react-router-dom';
import { evidenceCoverage, summarizeDataroomPeriod } from '@/lib/dataroom/overview';
import { cn } from '@/lib/utils';

type DomainTone = 'neutral' | 'training' | 'nutrition' | 'recovery';

const toneClasses: Record<DomainTone, string> = {
  neutral: 'bg-muted text-foreground',
  training: 'bg-energy-soft text-energy-ink',
  nutrition: 'bg-fuel-soft text-fuel-ink',
  recovery: 'bg-recover-soft text-recover-ink',
};

function SignalRow({ icon: Icon, label, value, detail, tone = 'neutral', onClick }: { icon: typeof Scale; label: string; value: string; detail: string; tone?: DomainTone; onClick: () => void }) {
  return <button onClick={onClick} className="flex min-h-16 w-full items-center gap-3 border-t border-border py-3 text-left">
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneClasses[tone])}><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold">{label}</span><span className="text-sm font-semibold tabular-nums">{value}</span></span><span className="mt-0.5 block type-caption">{detail}</span></span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
  </button>;
}

function Finding({ finding }: { finding: NonNullable<ReturnType<typeof useDataroomData>['analysis']>['findings'][number] }) {
  const [open, setOpen] = useState(false);
  return <article className="border-t border-border py-3">
    <button onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex min-h-11 w-full items-start gap-3 text-left">
      <span className={cn('mt-0.5 rounded-md px-2 py-1 type-meta uppercase', finding.actionKind === 'change' ? 'bg-foreground text-background' : 'bg-muted text-foreground')}>{finding.actionKind}</span>
      <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="text-sm font-semibold leading-5">{finding.title}</span><ConfidenceMark value={finding.confidence} compact /></span><span className="mt-0.5 block type-caption">{finding.signal}</span></span>
      <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
    </button>
    {open && <div className="ml-[5.6rem] mt-2 space-y-2"><div><div className="type-meta">Evidence</div><ul className="mt-1 space-y-1">{finding.evidence.map(item => <li key={item} className="type-caption">{item}</li>)}</ul></div><div><div className="type-meta">Decision</div><p className="mt-1 text-sm font-semibold">{finding.action}</p></div><p className="type-caption">{finding.interpretation}</p></div>}
  </article>;
}

function DataroomContent() {
  const navigate = useNavigate();
  const { range, days, dateRange } = useDataroomRange();
  const current = useDataroomData(dateRange);
  const summary = useMemo(() => summarizeDataroomPeriod({ range: dateRange, metrics: current.metrics, workouts: current.workouts, sets: current.sets, meals: current.meals, activities: current.activities }), [dateRange, current.metrics, current.workouts, current.sets, current.meals, current.activities]);
  const coverage = evidenceCoverage({ days, weightMeasurements: summary.weightMeasurements, workouts: summary.workouts, nutritionLoggedDays: summary.nutritionLoggedDays, sleepNights: summary.sleepNights, activitySessions: current.activities.length });
  const [showWhy, setShowWhy] = useState(false);

  const weightChart = useMemo(() => (current.analysis?.weight.points || []).map(point => ({ date: point.date, label: format(parseISO(point.date), 'd MMM'), trend: point.trend, raw: point.raw })), [current.analysis?.weight.points]);
  const progressing = current.analysis?.exercises.filter(exercise => exercise.state === 'progressing').length ?? 0;
  const stable = current.analysis?.exercises.filter(exercise => exercise.state === 'stable').length ?? 0;
  const weightValue = current.analysis?.weight.trendWeight != null ? `${current.analysis.weight.trendWeight.toFixed(1)} kg` : summary.weightLatest != null ? `${summary.weightLatest} kg` : 'Needs data';
  const trainingValue = summary.workouts ? `${(summary.workouts / days * 7).toFixed(1)}/wk` : 'No sessions';
  const proteinValue = summary.proteinPerLoggedDay != null ? `${summary.proteinPerLoggedDay} g` : 'No logs';
  const sleepValue = summary.sleepAverage != null ? `${summary.sleepAverage.toFixed(1)} h` : 'Needs data';
  const weightRate = current.analysis?.weight.percentPerWeek;
  const headline = current.analysis?.headline || (current.isLoading ? 'Reading your evidence…' : 'Keep logging to build a reliable read.');

  return <MainLayout wide>
    <div className="mx-auto w-full max-w-[760px] pb-12">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0"><h1 className="type-page-title">Dataroom</h1></div>
        <button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><Settings2 className="h-5 w-5" /></button>
      </header>
      <div className="mb-6"><DataroomRangeSelector /></div>

      <section aria-labelledby="current-read-title" className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><div className="type-eyebrow">Current read · {range}</div><h2 id="current-read-title" className="mt-2 text-2xl font-semibold leading-[1.2] sm:text-3xl">{headline}</h2></div>
          {current.analysis && <ConfidenceMark value={current.analysis.confidence} compact />}
        </div>

        <div className="mt-5 flex items-end justify-between gap-4 border-b border-border pb-3">
          <div><div className="type-caption">Trend weight</div><div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{weightValue}</div></div>
          <div className="text-right"><div className="type-caption">Rate</div><div className="mt-1 text-base font-semibold tabular-nums">{weightRate == null ? 'Need data' : `${weightRate > 0 ? '+' : ''}${weightRate.toFixed(2)}% / week`}</div></div>
        </div>

        {weightChart.length > 1 ? <div className="mt-2"><TrendLineChart data={weightChart} lines={[{ key: 'trend', label: 'Trend', suffix: ' kg' }, { key: 'raw', label: 'Scale', suffix: ' kg', dashed: true }]} height={220} summary={`Bodyweight trend for the selected ${range} range. Recorded weigh-ins remain separate from the trend.`} /></div> : <div className="mt-4 border-y border-border py-8 text-center type-caption">More weigh-ins are needed before the bodyweight trajectory becomes useful.</div>}
      </section>

      <section className="mb-8" aria-labelledby="supporting-signals-title">
        <h2 id="supporting-signals-title" className="type-section-title">The signals behind the read</h2>
        <div className="mt-2">
          <SignalRow icon={Dumbbell} label="Training" value={trainingValue} detail={`${summary.sets} working sets · ${progressing} lifts improving · ${stable} stable`} tone="training" onClick={() => navigate('/app/dataroom/training')} />
          <SignalRow icon={Utensils} label="Protein" value={proteinValue} detail={`${summary.nutritionLoggedDays}/${days} days contain logs · completeness unknown`} tone="nutrition" onClick={() => navigate('/app/dataroom/nutrition')} />
          <SignalRow icon={Moon} label="Sleep" value={sleepValue} detail={`${coverage.sleep.count}/${days} nights recorded`} tone="recovery" onClick={() => navigate('/app/dataroom/recovery')} />
        </div>
      </section>

      <section className="mb-8 border-y border-border py-1">
        <button className="flex min-h-14 w-full items-center justify-between gap-3 text-left" onClick={() => setShowWhy(value => !value)} aria-expanded={showWhy}>
          <span><span className="text-sm font-semibold">Why RepTrack thinks this</span><span className="mt-0.5 block type-caption">{coverage.weight.count} weigh-ins · {coverage.training.count} workouts · {coverage.nutrition.count} food-log days · {coverage.sleep.count} sleep nights</span></span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showWhy && 'rotate-180')} />
        </button>
        {showWhy && <div className="pb-3">
          {current.analysis?.findings.length ? current.analysis.findings.map(finding => <Finding key={finding.id} finding={finding} />) : <div className="border-t border-border py-3"><p className="text-sm font-semibold">No decision change is justified yet.</p><p className="mt-1 type-caption">RepTrack will surface one only when the available evidence can support it.</p></div>}
          <button className="min-h-11 w-full border-t border-border text-left text-sm font-semibold" onClick={() => navigate('/app/dataroom/timeline')}>Inspect the timeline</button>
        </div>}
      </section>

      <section aria-labelledby="domains-title">
        <h2 id="domains-title" className="type-section-title">Explore your data</h2>
        <div className="mt-2">
          <SignalRow icon={Scale} label="Body & physique" value={weightValue} detail="Weight trend, recorded measurements, and physique check-ins" onClick={() => navigate('/app/dataroom/body')} />
          <SignalRow icon={Dumbbell} label="Training" value={`${summary.workouts} workouts`} detail="Muscle exposure, exercise progression, and training context" tone="training" onClick={() => navigate('/app/dataroom/training')} />
          <SignalRow icon={Utensils} label="Nutrition" value={proteinValue} detail="Protein consistency, logged energy, and macro evidence" tone="nutrition" onClick={() => navigate('/app/dataroom/nutrition')} />
          <SignalRow icon={Moon} label="Recovery" value={sleepValue} detail="Sleep, readiness, workload, and discomfort context" tone="recovery" onClick={() => navigate('/app/dataroom/recovery')} />
          <SignalRow icon={Footprints} label="Activity & movement" value={summary.activityMinutes ? `${summary.activityMinutes} min` : 'No activity'} detail="Recorded activity and mobility comparisons" onClick={() => navigate('/app/dataroom/activity')} />
          <SignalRow icon={Activity} label="Timeline" value="History" detail="Inspect evidence by exact day" onClick={() => navigate('/app/dataroom/timeline')} />
          <SignalRow icon={Database} label="Records" value="PRs" detail="Exact exercise records and progression history" onClick={() => navigate('/app/dataroom/records')} />
          <SignalRow icon={Activity} label="Explore" value="Advanced" detail="Evidence-gated relationships and deeper analysis" onClick={() => navigate('/app/dataroom/explore')} />
        </div>
      </section>
    </div>
  </MainLayout>;
}

export default function Dataroom() {
  return <DataroomRangeProvider><DataroomContent /></DataroomRangeProvider>;
}
