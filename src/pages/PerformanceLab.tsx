import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, subDays } from 'date-fns';
import { ArrowRight, Bot, Calculator, Dumbbell, Gauge, History, Settings2, TriangleAlert, Utensils } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataroomRangeProvider, useDataroomRange } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from '@/components/dataroom/DataroomRangeSelector';
import { useAdvancedLabData, useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useDataroomData } from '@/hooks/useDataroomData';
import { cutControl, deloadSignal, goalRunway, progressionAutopilot, recoveryPattern, weakPointRadar } from '@/lib/advanced/engine';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { localDateKey } from '@/lib/dateKey';

const MUSCLES = ['Chest','Back','Shoulders','Biceps','Triceps','Forearms','Quads','Hamstrings','Glutes','Calves'];
const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const fmt = (value: number) => nf.format(Math.round((value + Number.EPSILON) * 100) / 100);
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function Meter({ value }: { value: number }) {
  return <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(3, Math.min(100, value * 100))}%` }} /></div>;
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0"><div className="type-caption">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>{detail && <div className="type-caption mt-0.5">{detail}</div>}</div>;
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[20px] border border-border bg-card overflow-hidden"><div className="min-h-13 px-4 py-3 border-b border-border flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">{title}</h2>{action}</div>{children}</section>;
}

function PerformanceLabContent() {
  const navigate = useNavigate();
  const { dateRange, range } = useDataroomRange();
  const { settings, save } = useAdvancedMode();
  const lab = useAdvancedLabData(settings.enabled);
  const data = useDataroomData(dateRange);
  const [blockOpen, setBlockOpen] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockFocus, setBlockFocus] = useState('');
  const [experiment, setExperiment] = useState({ name: '', metric: '', target: '' });

  const sets = useMemo(() => data.sets.map(set => ({ exercise: set.exercise_name, date: set.workout_date || '', weight: Number(set.actual_weight || 0), reps: Number(set.actual_reps || 0), rir: set.actual_rir, pain: set.pain_score })), [data.sets]);
  const progression = useMemo(() => progressionAutopilot(sets), [sets]);
  const weakPoints = useMemo(() => weakPointRadar(sets, settings.specializationMuscles), [sets, settings.specializationMuscles]);
  const runway = useMemo(() => goalRunway(data.metrics.map(point => ({ date: point.date, bodyweight: point.bodyweight })), data.preferences?.weight_goal), [data.metrics, data.preferences?.weight_goal]);
  const cut = useMemo(() => cutControl(data.metrics.map(point => ({ date: point.date, bodyweight: point.bodyweight })), data.preferences?.weight_goal), [data.metrics, data.preferences?.weight_goal]);
  const recovery = useMemo(() => recoveryPattern(data.metrics.map(point => ({ date: point.date, sleep: point.sleep_hours }))), [data.metrics]);
  const deload = useMemo(() => deloadSignal({ sleep: data.metrics.map(point => Number(point.sleep_hours || 0)), readiness: data.readiness.map(row => row.readiness), progression, workouts14d: data.workouts.filter(workout => workout.date >= localDateKey(subDays(new Date(), 13)) && workout.completed_at && !(workout as typeof workout & { is_skipped?: boolean }).is_skipped).length }), [data.metrics, data.readiness, data.workouts, progression]);
  const activeBlock = lab.blocks.find(block => block.status === 'active');
  const blockPct = activeBlock?.endsOn ? Math.max(0, Math.min(100, differenceInCalendarDays(new Date(), new Date(`${activeBlock.startsOn}T12:00:00`)) / Math.max(1, differenceInCalendarDays(new Date(`${activeBlock.endsOn}T12:00:00`), new Date(`${activeBlock.startsOn}T12:00:00`))) * 100)) : null;

  const liveMetric = (metric: string): { value: number; unit: string } | null => {
    const key = metric.toLowerCase();
    const sleep = data.metrics.filter(row => Number(row.sleep_hours) > 0).map(row => Number(row.sleep_hours));
    const readiness = data.readiness.filter(row => row.readiness != null).map(row => Number(row.readiness));
    const latestWeight = [...data.metrics].filter(row => Number(row.bodyweight) > 0).sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.bodyweight;
    const volume = data.sets.reduce((sum, row) => sum + Number(row.actual_weight || 0) * Number(row.actual_reps || 0), 0);
    const activity = data.activities.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
    if (/bodyweight|weight/.test(key) && latestWeight != null) return { value: Number(latestWeight), unit: 'kg' };
    if (/sleep/.test(key) && sleep.length) return { value: mean(sleep), unit: 'h' };
    if (/readiness/.test(key) && readiness.length) return { value: mean(readiness), unit: '/10' };
    if (/protein/.test(key) && data.meals.length) return { value: mean(data.meals.map(row => row.protein)), unit: 'g/day' };
    if (/calorie|intake/.test(key) && data.meals.length) return { value: mean(data.meals.map(row => row.calories)), unit: 'kcal/day' };
    if (/workout|session/.test(key)) return { value: data.workouts.filter(row => row.completed_at).length, unit: 'sessions' };
    if (/volume|tonnage/.test(key)) return { value: volume, unit: 'kg·reps' };
    if (/activity|minutes|cardio/.test(key)) return { value: activity, unit: 'min' };
    return null;
  };

  if (!settings.enabled) return <MainLayout showBack backTo="/app/dataroom"><div className="mx-auto max-w-[680px] py-16 text-center"><Gauge className="mx-auto h-7 w-7"/><h1 className="type-page-title mt-4">Performance Lab is off</h1><button onClick={() => save.mutate({ enabled: true })} className="mt-6 min-h-12 rounded-xl bg-foreground text-background px-5 font-semibold">Enable</button></div></MainLayout>;

  const toggleSpecialization = async (muscle: string) => {
    const current = settings.specializationMuscles;
    const next = current.includes(muscle) ? current.filter(item => item !== muscle) : [...current, muscle].slice(-4);
    await save.mutateAsync({ specializationMuscles: next });
  };

  const tools = [
    { label: 'ChatGPT', detail: 'MCP', icon: Bot, route: '/app/settings/mcp' },
    { label: 'What if', detail: 'Simulator', icon: Gauge, route: '/app/dataroom/lab/simulator' },
    { label: 'Food', detail: 'Autopilot', icon: Utensils, route: '/app/dataroom/lab/food' },
    { label: 'Plates', detail: 'Calculator', icon: Calculator, route: '/app/dataroom/lab/plates' },
    { label: 'Gyms', detail: 'Bars + plates', icon: Dumbbell, route: '/app/dataroom/lab/gyms' },
    { label: 'Recorder', detail: 'Sessions', icon: History, route: '/app/dataroom/lab/recorder' },
    { label: 'Coach report', detail: 'Export', icon: ArrowRight, route: '/app/settings/data/coach-report' },
    { label: 'Data', detail: 'Export + import', icon: ArrowRight, route: '/app/settings/data' },
  ];

  return <MainLayout wide showBack backTo="/app/dataroom">
    <div className="mx-auto max-w-[1000px] pb-12">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="type-page-title">Performance Lab</h1><p className="type-caption mt-1">Live from the selected Dataroom range.</p></div><div className="flex items-center gap-2"><DataroomRangeSelector/><button onClick={() => navigate('/app/settings')} aria-label="Settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center"><Settings2 className="h-5 w-5"/></button></div></header>

      <section className="rounded-[20px] border border-border bg-card p-4 mb-5">
        <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Live inputs</div><div className="type-caption mt-0.5">{range} data · changes recalculate the Lab immediately</div></div><span className="h-2.5 w-2.5 rounded-full bg-energy" aria-label="Live"/></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><div className="type-caption mb-2">Session volume plan</div><div className="grid grid-cols-3 gap-2">{[{label:'-10%',value:.9},{label:'Base',value:1},{label:'+10%',value:1.1}].map(option => <button key={option.label} disabled={save.isPending} onClick={() => save.mutate({ sessionVolumeModifier: option.value })} aria-pressed={Math.abs(settings.sessionVolumeModifier-option.value)<.01} className={cn('min-h-10 rounded-xl text-xs font-semibold', Math.abs(settings.sessionVolumeModifier-option.value)<.01 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{option.label}</button>)}</div></div>
          <div><div className="type-caption mb-2">Specialization</div><div className="flex gap-2 overflow-x-auto pb-1">{MUSCLES.map(muscle => <button key={muscle} onClick={() => toggleSpecialization(muscle)} aria-pressed={settings.specializationMuscles.includes(muscle)} className={cn('min-h-10 shrink-0 rounded-xl px-3 text-xs font-semibold', settings.specializationMuscles.includes(muscle) ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{muscle}</button>)}</div></div>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[20px] border border-border bg-border mb-5">
        {tools.map(tool => { const Icon = tool.icon; return <button key={tool.route} onClick={() => navigate(tool.route)} className="bg-card p-4 text-left min-h-[108px] hover:bg-muted/20"><Icon className="h-4 w-4"/><div className="mt-4 text-sm font-semibold">{tool.label}</div><div className="type-caption mt-1">{tool.detail}</div></button>; })}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Progression" action={<button onClick={() => navigate('/app/dataroom/training')} className="type-action">Training</button>}>
          <div className="divide-y divide-border">{progression.slice(0, 6).map(item => <button key={item.exercise} onClick={() => navigate(`/app/dataroom/exercise/${encodeURIComponent(item.exercise)}`)} className="w-full px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-left hover:bg-muted/20"><div className="min-w-0"><div className="text-sm font-semibold truncate">{item.exercise}</div><div className="type-caption mt-0.5">{fmt(item.latestWeight)} kg × {fmt(item.latestReps)} · {item.state}</div></div><div className="text-right"><div className="text-sm font-semibold tabular-nums">{fmt(item.nextWeight)} kg</div><div className="type-caption">next</div></div></button>)}{!progression.length && <div className="p-4 type-caption">Need repeat sessions.</div>}</div>
        </Section>

        <Section title="Block" action={<button onClick={() => setBlockOpen(true)} className="type-action">{activeBlock ? 'Replace' : 'Start'}</button>}>
          <div className="p-4">{activeBlock ? <><div className="flex items-start justify-between gap-4"><div><div className="text-lg font-semibold">{activeBlock.name}</div><div className="type-caption mt-1">{activeBlock.focus || 'General'} · {activeBlock.startsOn}</div></div>{activeBlock.endsOn && <div className="text-sm font-semibold tabular-nums">{Math.max(0, differenceInCalendarDays(new Date(`${activeBlock.endsOn}T12:00:00`), new Date()))}d</div>}</div>{blockPct != null && <div className="mt-4"><Meter value={blockPct / 100}/></div>}</> : <div className="type-caption">No active block.</div>}</div>
        </Section>

        <Section title="Cut control" action={<button onClick={() => navigate('/app/dataroom/body')} className="type-action">Body</button>}>
          <div className="p-4 grid grid-cols-3 gap-4"><Stat label="Trend" value={cut.latest == null ? '—' : `${fmt(cut.latest)} kg`} /><Stat label="Rate" value={cut.weeklyRate == null ? '—' : `${cut.weeklyRate > 0 ? '+' : ''}${fmt(cut.weeklyRate)}`} detail="kg/wk" /><Stat label="Read" value={cut.band.replace('_',' ')} /></div>
        </Section>

        <Section title="Goal runway" action={<button onClick={() => navigate('/app/dataroom/lab/simulator')} className="type-action">Simulate</button>}>
          <div className="p-4 grid grid-cols-3 gap-4"><Stat label="Now" value={runway.latest == null ? '—' : `${fmt(runway.latest)} kg`} /><Stat label="Goal" value={runway.target == null ? '—' : `${fmt(runway.target)} kg`} /><Stat label="ETA" value={runway.weeks == null ? '—' : `${fmt(runway.weeks)} wk`} detail={runway.status.replace('_',' ')} /></div>
        </Section>

        <Section title="Weak points" action={<button onClick={() => navigate('/app/dataroom/training')} className="type-action">Training</button>}>
          <div className="p-4 space-y-3">{weakPoints.slice(0, 8).map(item => <div key={item.bodyPart}><div className="mb-1 flex justify-between gap-3 text-xs"><span className={cn('font-semibold', item.specialized && 'underline underline-offset-4')}>{item.bodyPart}</span><span className="tabular-nums text-muted-foreground">{fmt(item.sets)}</span></div><Meter value={item.exposure}/></div>)}</div>
        </Section>

        <Section title="Recovery" action={<button onClick={() => navigate('/app/dataroom/recovery')} className="type-action">Recovery</button>}>
          <div className="p-4 grid grid-cols-3 gap-4"><Stat label="7D sleep" value={recovery.current == null ? '—' : `${fmt(recovery.current)} h`} /><Stat label="Δ" value={recovery.delta == null ? '—' : `${recovery.delta > 0 ? '+' : ''}${fmt(recovery.delta)} h`} /><Stat label="Deload" value={deload.suggested ? 'Review' : 'No signal'} detail={`${deload.evidence}/4 flags`} /></div>{deload.suggested && <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-xs font-semibold"><TriangleAlert className="h-4 w-4"/>Deload evidence elevated.</div>}
        </Section>

        <Section title="Experiments" action={<button onClick={() => setExperimentOpen(true)} className="type-action">New</button>}>
          <div className="divide-y divide-border">{lab.experiments.filter(item => item.status === 'active').slice(0,4).map(item => { const live = liveMetric(item.metric); const delta = live && item.baseline != null ? live.value - item.baseline : null; return <div key={item.id} className="px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div><div className="text-sm font-semibold">{item.name}</div><div className="type-caption mt-0.5">{item.metric}{item.baseline != null ? ` · baseline ${fmt(item.baseline)}` : ''}</div></div><div className="text-right"><div className="text-sm font-semibold tabular-nums">{live ? `${fmt(live.value)} ${live.unit}` : '—'}</div><div className="type-caption">{delta == null ? 'live' : `${delta > 0 ? '+' : ''}${fmt(delta)} vs baseline`}</div></div></div>; })}{!lab.experiments.some(item => item.status === 'active') && <div className="p-4 type-caption">No active experiment.</div>}</div>
        </Section>

        <Section title="Coach review" action={<button onClick={() => navigate('/app/dataroom/explore')} className="type-action">Explore</button>}>
          <div className="p-4 grid grid-cols-3 gap-4"><Stat label="Workouts" value={`${data.workouts.filter(item => item.completed_at && !(item as typeof item & { is_skipped?: boolean }).is_skipped).length}`} /><Stat label="Lifts" value={`${progression.filter(item => item.state === 'progressing').length} ↑`} /><Stat label="Recovery" value={recovery.current == null ? '—' : `${fmt(recovery.current)} h`} /></div>
        </Section>
      </div>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}><DialogContent><DialogHeader><DialogTitle>Start block</DialogTitle></DialogHeader><div className="space-y-3"><Input value={blockName} onChange={event => setBlockName(event.target.value)} placeholder="Block name"/><Input value={blockFocus} onChange={event => setBlockFocus(event.target.value)} placeholder="Focus"/><button disabled={!blockName.trim() || lab.saveBlock.isPending} onClick={async () => { try { await lab.saveBlock.mutateAsync({ name: blockName, focus: blockFocus || null, startsOn: localDateKey(), endsOn: localDateKey(addDays(new Date(), 41)), status: 'active' }); setBlockName(''); setBlockFocus(''); setBlockOpen(false); } catch { toast.error('Block was not saved.'); } }} className="w-full min-h-12 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">Start 6 weeks</button></div></DialogContent></Dialog>

      <Dialog open={experimentOpen} onOpenChange={setExperimentOpen}><DialogContent><DialogHeader><DialogTitle>New experiment</DialogTitle></DialogHeader><div className="space-y-3"><Input value={experiment.name} onChange={event => setExperiment(value => ({ ...value, name: event.target.value }))} placeholder="Name"/><Input value={experiment.metric} onChange={event => setExperiment(value => ({ ...value, metric: event.target.value }))} placeholder="Metric: sleep, protein, weight, readiness…"/><Input type="number" inputMode="decimal" value={experiment.target} onChange={event => setExperiment(value => ({ ...value, target: event.target.value }))} placeholder="Target"/>{experiment.metric && <div className="rounded-xl bg-muted p-3 type-caption">Live baseline: {(() => { const live = liveMetric(experiment.metric); return live ? `${fmt(live.value)} ${live.unit}` : 'metric not mapped yet'; })()}</div>}<button disabled={!experiment.name.trim() || !experiment.metric.trim() || lab.saveExperiment.isPending} onClick={async () => { try { const live = liveMetric(experiment.metric); await lab.saveExperiment.mutateAsync({ name: experiment.name, metric: experiment.metric, baseline: live?.value ?? null, target: experiment.target ? Number(experiment.target) : null, status: 'active' }); setExperiment({ name: '', metric: '', target: '' }); setExperimentOpen(false); } catch { toast.error('Experiment was not saved.'); } }} className="w-full min-h-12 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">Start with live baseline</button></div></DialogContent></Dialog>
    </div>
  </MainLayout>;
}

export default function PerformanceLab() {
  return <DataroomRangeProvider><PerformanceLabContent /></DataroomRangeProvider>;
}
