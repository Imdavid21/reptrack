import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, subDays } from 'date-fns';
import { ArrowRight, Beaker, Bot, Dumbbell, Gauge, Layers3, Moon, Scale, Settings2, Target, TriangleAlert } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
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

function Meter({ value }: { value: number }) {
  return <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(3, Math.min(100, value * 100))}%` }} /></div>;
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0"><div className="type-caption">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>{detail && <div className="type-caption mt-0.5">{detail}</div>}</div>;
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[20px] border border-border bg-card overflow-hidden"><div className="min-h-13 px-4 py-3 border-b border-border flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">{title}</h2>{action}</div>{children}</section>;
}

export default function PerformanceLab() {
  const navigate = useNavigate();
  const { settings, save } = useAdvancedMode();
  const lab = useAdvancedLabData(settings.enabled);
  const range = useMemo(() => ({ from: subDays(new Date(), 55), to: new Date() }), []);
  const data = useDataroomData(range);
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

  if (!settings.enabled) return <MainLayout showBack backTo="/app/settings" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><Gauge className="mx-auto h-7 w-7"/><h1 className="type-page-title mt-4">Advanced Mode is off</h1><button onClick={() => save.mutate({ enabled: true })} className="mt-6 min-h-12 rounded-xl bg-foreground text-background px-5 font-semibold">Enable</button></div></MainLayout>;

  const toggleSpecialization = async (muscle: string) => {
    const current = settings.specializationMuscles;
    const next = current.includes(muscle) ? current.filter(item => item !== muscle) : [...current, muscle].slice(-4);
    await save.mutateAsync({ specializationMuscles: next });
  };

  return <MainLayout wide>
    <div className="mx-auto max-w-[1000px] pb-12">
      <header className="mb-5 flex items-center justify-between gap-4"><div><div className="type-eyebrow">Advanced</div><h1 className="type-page-title mt-1">Performance Lab</h1></div><button onClick={() => navigate('/app/settings')} aria-label="Settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center"><Settings2 className="h-5 w-5"/></button></header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[20px] border border-border bg-border mb-5">
        <button onClick={() => navigate('/app/settings/mcp')} className="bg-card p-4 text-left"><Bot className="h-4 w-4"/><div className="mt-4 text-sm font-semibold">ChatGPT</div><div className="type-caption mt-1">MCP evidence</div></button>
        <button onClick={() => navigate('/app/lab/simulator')} className="bg-card p-4 text-left"><Gauge className="h-4 w-4"/><div className="mt-4 text-sm font-semibold">Simulator</div><div className="type-caption mt-1">What if</div></button>
        <button onClick={() => navigate('/app/lab/gyms')} className="bg-card p-4 text-left"><Dumbbell className="h-4 w-4"/><div className="mt-4 text-sm font-semibold">Gyms</div><div className="type-caption mt-1">Bars + plates</div></button>
        <button onClick={() => navigate('/app/settings/data')} className="bg-card p-4 text-left"><ArrowRight className="h-4 w-4"/><div className="mt-4 text-sm font-semibold">Data</div><div className="type-caption mt-1">Export + import</div></button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Progression" action={<button onClick={() => navigate('/app/settings/mcp')} className="type-action">Ask ChatGPT</button>}>
          <div className="divide-y divide-border">{progression.slice(0, 6).map(item => <div key={item.exercise} className="px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div className="min-w-0"><div className="text-sm font-semibold truncate">{item.exercise}</div><div className="type-caption mt-0.5">{item.latestWeight} kg × {item.latestReps} · {item.state}</div></div><div className="text-right"><div className="text-sm font-semibold tabular-nums">{item.nextWeight} kg</div><div className="type-caption">next</div></div></div>)}{!progression.length && <div className="p-4 type-caption">Need repeat sessions.</div>}</div>
        </Section>

        <Section title="Block" action={<button onClick={() => setBlockOpen(true)} className="type-action">{activeBlock ? 'Replace' : 'Start'}</button>}>
          <div className="p-4">{activeBlock ? <><div className="flex items-start justify-between gap-4"><div><div className="text-lg font-semibold">{activeBlock.name}</div><div className="type-caption mt-1">{activeBlock.focus || 'General'} · {activeBlock.startsOn}</div></div>{activeBlock.endsOn && <div className="text-sm font-semibold tabular-nums">{Math.max(0, differenceInCalendarDays(new Date(`${activeBlock.endsOn}T12:00:00`), new Date()))}d</div>}</div>{blockPct != null && <div className="mt-4"><Meter value={blockPct / 100}/></div>}</> : <div className="type-caption">No active block.</div>}</div>
        </Section>

        <Section title="Cut control" action={<button onClick={() => navigate('/app/settings/mcp')} className="type-action">Ask ChatGPT</button>}>
          <div className="p-4 grid grid-cols-3 gap-4"><Stat label="Trend" value={cut.latest == null ? '—' : `${cut.latest} kg`} /><Stat label="Rate" value={cut.weeklyRate == null ? '—' : `${cut.weeklyRate > 0 ? '+' : ''}${cut.weeklyRate}`} detail="kg/wk" /><Stat label="Read" value={cut.band.replace('_',' ')} /></div>
        </Section>

        <Section title="Goal runway" action={<button onClick={() => navigate('/app/lab/simulator')} className="type-action">Simulate</button>}>
          <div className="p-4 grid grid-cols-3 gap-4"><Stat label="Now" value={runway.latest == null ? '—' : `${runway.latest} kg`} /><Stat label="Goal" value={runway.target == null ? '—' : `${runway.target} kg`} /><Stat label="ETA" value={runway.weeks == null ? '—' : `${runway.weeks} wk`} detail={runway.status.replace('_',' ')} /></div>
        </Section>

        <Section title="Weak points" action={<button onClick={() => navigate('/app/settings/mcp')} className="type-action">Ask ChatGPT</button>}>
          <div className="p-4 space-y-3">{weakPoints.slice(0, 8).map(item => <div key={item.bodyPart}><div className="mb-1 flex justify-between gap-3 text-xs"><span className={cn('font-semibold', item.specialized && 'underline underline-offset-4')}>{item.bodyPart}</span><span className="tabular-nums text-muted-foreground">{item.sets}</span></div><Meter value={item.exposure}/></div>)}</div>
        </Section>

        <Section title="Specialization">
          <div className="p-4 flex flex-wrap gap-2">{MUSCLES.map(muscle => <button key={muscle} onClick={() => toggleSpecialization(muscle)} aria-pressed={settings.specializationMuscles.includes(muscle)} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold', settings.specializationMuscles.includes(muscle) ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{muscle}</button>)}</div>
        </Section>

        <Section title="Recovery">
          <div className="p-4 grid grid-cols-3 gap-4"><Stat label="7D sleep" value={recovery.current == null ? '—' : `${recovery.current} h`} /><Stat label="Δ" value={recovery.delta == null ? '—' : `${recovery.delta > 0 ? '+' : ''}${recovery.delta} h`} /><Stat label="Deload" value={deload.suggested ? 'Review' : 'No signal'} detail={`${deload.evidence}/4 flags`} /></div>{deload.suggested && <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-xs font-semibold"><TriangleAlert className="h-4 w-4"/>Deload evidence is elevated.</div>}
        </Section>

        <Section title="Experiments" action={<button onClick={() => setExperimentOpen(true)} className="type-action">New</button>}>
          <div className="divide-y divide-border">{lab.experiments.filter(item => item.status === 'active').slice(0,4).map(item => <div key={item.id} className="px-4 py-3 flex justify-between gap-3"><div><div className="text-sm font-semibold">{item.name}</div><div className="type-caption mt-0.5">{item.metric}</div></div><div className="text-sm font-semibold tabular-nums">{item.target ?? '—'}</div></div>)}{!lab.experiments.some(item => item.status === 'active') && <div className="p-4 type-caption">No active experiment.</div>}</div>
        </Section>

        <Section title="Coach review" action={<button onClick={() => navigate('/app/settings/mcp')} className="type-action">ChatGPT</button>}>
          <div className="p-4 grid grid-cols-3 gap-4"><Stat label="Workouts" value={`${data.workouts.filter(item => item.completed_at && !(item as typeof item & { is_skipped?: boolean }).is_skipped).length}`} /><Stat label="Lifts" value={`${progression.filter(item => item.state === 'progressing').length} ↑`} /><Stat label="Recovery" value={recovery.current == null ? '—' : `${recovery.current} h`} /></div>
        </Section>
      </div>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}><DialogContent><DialogHeader><DialogTitle>Start block</DialogTitle></DialogHeader><div className="space-y-3"><Input value={blockName} onChange={event => setBlockName(event.target.value)} placeholder="Block name"/><Input value={blockFocus} onChange={event => setBlockFocus(event.target.value)} placeholder="Focus"/><button disabled={!blockName.trim() || lab.saveBlock.isPending} onClick={async () => { try { await lab.saveBlock.mutateAsync({ name: blockName, focus: blockFocus || null, startsOn: localDateKey(), endsOn: localDateKey(addDays(new Date(), 41)), status: 'active' }); setBlockName(''); setBlockFocus(''); setBlockOpen(false); } catch { toast.error('Block was not saved.'); } }} className="w-full min-h-12 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">Start 6 weeks</button></div></DialogContent></Dialog>

      <Dialog open={experimentOpen} onOpenChange={setExperimentOpen}><DialogContent><DialogHeader><DialogTitle>New experiment</DialogTitle></DialogHeader><div className="space-y-3"><Input value={experiment.name} onChange={event => setExperiment(value => ({ ...value, name: event.target.value }))} placeholder="Name"/><Input value={experiment.metric} onChange={event => setExperiment(value => ({ ...value, metric: event.target.value }))} placeholder="Metric"/><Input type="number" inputMode="decimal" value={experiment.target} onChange={event => setExperiment(value => ({ ...value, target: event.target.value }))} placeholder="Target"/><button disabled={!experiment.name.trim() || !experiment.metric.trim() || lab.saveExperiment.isPending} onClick={async () => { try { await lab.saveExperiment.mutateAsync({ name: experiment.name, metric: experiment.metric, target: experiment.target ? Number(experiment.target) : null, status: 'active' }); setExperiment({ name: '', metric: '', target: '' }); setExperimentOpen(false); } catch { toast.error('Experiment was not saved.'); } }} className="w-full min-h-12 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50">Start</button></div></DialogContent></Dialog>
    </div>
  </MainLayout>;
}
