import { ReactNode, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CircleHelp, Scale, Dumbbell, Moon, Utensils, Database, Activity, Droplets } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { ActionKind, Confidence, DataroomAnalysis, DataroomFinding, EnergyDay, MealDay } from '@/lib/dataroom/types';
import { confidenceDots } from '@/lib/dataroom/analysis';
import { cn } from '@/lib/utils';

const confidenceLabel: Record<Confidence, string> = { high: 'High', moderate: 'Moderate', low: 'Low', insufficient: 'Insufficient' };

export function ConfidenceMark({ value, compact = false }: { value: Confidence; compact?: boolean }) {
  const filled = confidenceDots(value);
  return (
    <span className="inline-flex items-center gap-2" aria-label={`${confidenceLabel[value]} confidence`}>
      {!compact && <span className="type-meta">{confidenceLabel[value]}</span>}
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map(index => <span key={index} className={cn('h-1.5 w-1.5 rounded-full', index < filled ? 'bg-foreground' : 'bg-muted-foreground/25')} />)}
      </span>
    </span>
  );
}

function Sparkline({ values, tone = 'energy' }: { values: number[]; tone?: 'energy' | 'fuel' | 'recover' | 'neutral' }) {
  if (values.length < 2) return <div className="h-8 w-full border-b border-dashed border-border" />;
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const points = values.map((value, index) => `${index / (values.length - 1) * 100},${28 - (value - min) / span * 24}`).join(' ');
  const stroke = tone === 'neutral' ? 'hsl(var(--foreground))' : `hsl(var(--${tone}))`;
  return <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full" role="img" aria-label="Recent trend"><polyline points={points} fill="none" stroke={stroke} strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>;
}

export function TrajectoryConsole({ analysis, proteinGoal }: { analysis: DataroomAnalysis; proteinGoal: number }) {
  const progressing = analysis.exercises.filter(item => item.state === 'progressing').length;
  const weightValues = analysis.weight.points.map(point => point.trend);
  const domains = [
    { label: 'Bodyweight', icon: Scale, value: analysis.weight.direction, detail: analysis.weight.trendWeight ? `${analysis.weight.trendWeight.toFixed(1)} kg trend` : 'No trend yet', confidence: analysis.weight.confidence, values: weightValues, tone: 'neutral' as const },
    { label: 'Training', icon: Dumbbell, value: progressing ? 'Progressing' : analysis.exercises.length ? 'Stable' : 'Unclear', detail: `${progressing}/${Math.min(analysis.exercises.length, 6)} key lifts advancing`, confidence: analysis.exercises[0]?.confidence ?? 'insufficient', values: analysis.exercises.slice(0, 6).map(item => item.deltaPercent ?? 0), tone: 'energy' as const },
    { label: 'Recovery', icon: Moon, value: analysis.recovery.state, detail: analysis.recovery.averageSleep ? `${analysis.recovery.averageSleep}h average sleep` : 'Sleep evidence limited', confidence: analysis.recovery.confidence, values: [analysis.recovery.recentTrainingDays, analysis.recovery.sleepNights], tone: 'recover' as const },
    { label: 'Nutrition', icon: Utensils, value: analysis.nutrition.confidence === 'insufficient' ? 'Insufficient data' : analysis.nutrition.modelDisagreesWithWeight ? 'Needs review' : 'Observed', detail: analysis.nutrition.averageProtein == null ? 'No protein data' : `${analysis.nutrition.averageProtein}/${proteinGoal}g protein`, confidence: analysis.nutrition.confidence, values: [analysis.nutrition.coverage, 100], tone: 'fuel' as const },
  ];
  return (
    <section className="overflow-hidden border-y border-border bg-card" aria-labelledby="trajectory-title">
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4"><div><p className="type-eyebrow">Summary</p><h1 id="trajectory-title" className="mt-1 type-page-title max-w-lg">{analysis.headline}</h1></div><ConfidenceMark value={analysis.confidence} compact /></div>
      </div>
      <div className="grid grid-cols-2 border-t border-border md:grid-cols-4">
        {domains.map((domain, index) => <div key={domain.label} className={cn('min-w-0 px-4 py-4', index % 2 === 1 && 'border-l border-border', index >= 2 && 'border-t border-border md:border-t-0', index === 2 && 'md:border-l')}>
          <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 type-meta"><domain.icon className="h-3.5 w-3.5" />{domain.label}</span><ConfidenceMark value={domain.confidence} compact /></div>
          <div className="mt-2 type-card-title capitalize">{domain.value}</div><div className="mt-0.5 type-supporting truncate">{domain.detail}</div><div className="mt-2"><Sparkline values={domain.values} tone={domain.tone} /></div>
        </div>)}
      </div>
    </section>
  );
}

function EvidenceDisclosure({ finding }: { finding: DataroomFinding }) {
  const [open, setOpen] = useState(false);
  return <div className="border-t border-border/70 pt-3"><button onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex w-full items-center justify-between text-left type-action"><span className="flex items-center gap-2"><CircleHelp className="h-4 w-4" />Evidence</span><ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} /></button>{open && <div className="mt-3 grid gap-3 border-l-2 border-border pl-3"><div><p className="type-meta">Signal</p><p className="type-supporting mt-1 text-foreground">{finding.signal}</p></div><div><p className="type-meta">Observed and derived evidence</p><ul className="mt-1 space-y-1">{finding.evidence.map(item => <li key={item} className="type-supporting">{item}</li>)}</ul></div><div><p className="type-meta">Interpretation</p><p className="type-supporting mt-1">{finding.interpretation}</p></div></div>}</div>;
}

export function ArachnidRead({ findings }: { findings: DataroomFinding[] }) {
  return <section aria-labelledby="arachnid-title"><div className="mb-3 flex items-end justify-between"><div><p className="type-eyebrow">Findings</p><h2 id="arachnid-title" className="type-section-title">Key Findings</h2></div><span className="type-meta">{findings.length} findings</span></div><div className="divide-y divide-border border-y border-border">{findings.map((finding, index) => <article key={finding.id} className="py-5"><div className="grid grid-cols-[2.5rem_1fr] gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full border border-border type-meta tabular-nums">0{index + 1}</div><div><div className="flex items-start justify-between gap-3"><h3 className="type-component-title">{finding.title}</h3><ConfidenceMark value={finding.confidence} compact /></div><div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-border"><div className="p-3"><p className="type-meta">Signal</p><p className="mt-1 type-supporting text-foreground">{finding.signal}</p></div><div className="border-l border-border p-3"><p className="type-meta">Decision</p><p className="mt-1 type-supporting text-foreground">{finding.action}</p></div></div><div className="mt-3"><EvidenceDisclosure finding={finding} /></div></div></div></article>)}</div></section>;
}

const actionStyle: Record<ActionKind, string> = { keep: 'bg-energy-soft text-energy-ink', change: 'bg-recover-soft text-recover-ink', watch: 'bg-muted text-foreground', log: 'bg-fuel-soft text-fuel-ink' };
export function ChangesNext({ findings }: { findings: DataroomFinding[] }) {
  return <section><p className="type-eyebrow">Actions</p><div className="mt-2 divide-y divide-border border-y border-border">{findings.map(finding => <div key={`action-${finding.id}`} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-4"><span className={cn('rounded-md px-2 py-1 text-center type-meta', actionStyle[finding.actionKind])}>{finding.actionKind}</span><div className="min-w-0"><p className="type-action text-foreground">{finding.action}</p><p className="mt-0.5 type-supporting truncate">{finding.signal}</p></div><ConfidenceMark value={finding.confidence} compact /></div>)}</div></section>;
}

function DeepDive({ title, meta, icon, defaultOpen = false, children }: { title: string; meta: string; icon: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="border-b border-border"><button onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex w-full items-center gap-3 py-4 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60">{icon}</span><span className="min-w-0 flex-1"><span className="block type-component-title">{title}</span><span className="block type-supporting">{meta}</span></span><ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', open && 'rotate-180')} /></button>{open && <div className="pb-6">{children}</div>}</section>;
}

function KeyLiftRows({ analysis }: { analysis: DataroomAnalysis }) {
  const lifts = analysis.exercises.slice(0, 6);
  if (!lifts.length) return <p className="py-6 type-supporting">More comparable sessions are needed to judge progression.</p>;
  return <div><p className="mb-2 type-meta">Recent comparable exposures</p><div className="divide-y divide-border border-y border-border">{lifts.map(lift => { const last = lift.exposures.at(-1); return <details key={lift.exercise} className="group"><summary className="flex cursor-pointer list-none items-center gap-3 py-3"><span className="min-w-0 flex-1"><span className="block truncate type-action text-foreground">{lift.exercise}</span><span className="block type-supporting">{last ? `${last.weight} kg × ${last.reps}` : 'No comparable set'}</span></span><span className="type-supporting capitalize">{lift.state}</span><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" /></summary><div className="pb-4"><div className="flex items-end gap-2 overflow-x-auto pb-1">{lift.exposures.map((exposure, index) => <div key={`${lift.exercise}-${exposure.date}`} className="min-w-20 border-l border-border pl-2"><div className="h-8 bg-energy-soft" style={{ height: `${Math.max(12, exposure.e1rm / Math.max(...lift.exposures.map(e => e.e1rm), 1) * 40)}px` }} /><p className="mt-1 text-xs font-semibold tabular-nums">{exposure.weight}×{exposure.reps}</p><p className="type-meta">{format(parseISO(exposure.date), 'd MMM')}</p></div>)}</div><p className="mt-2 type-supporting">Estimated-strength change {lift.deltaPercent == null ? 'unclear' : `${lift.deltaPercent > 0 ? '+' : ''}${lift.deltaPercent}%`} · {lift.exposures.length} exposures</p></div></details>; })}</div></div>;
}

function MuscleMatrix({ analysis }: { analysis: DataroomAnalysis }) {
  const shown = analysis.muscles.filter(item => item.setsPerWeek > 0).sort((a, b) => b.setsPerWeek - a.setsPerWeek);
  return <div className="mt-6"><div className="mb-2 flex items-end justify-between"><p className="type-meta">Muscle-region exposure</p><p className="type-meta">direct sets / week</p></div><div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">{shown.map(item => { const position = Math.min(100, item.setsPerWeek / Math.max(item.reference.high, 1) * 100); return <div key={item.muscle} className="bg-card p-3"><div className="flex items-baseline justify-between gap-2"><span className="truncate type-action text-foreground">{item.muscle}</span><span className="text-sm font-bold tabular-nums">{item.setsPerWeek}</span></div><div className="relative mt-3 h-2 rounded-full bg-muted"><span className="absolute inset-y-0 rounded-full bg-muted-foreground/20" style={{ left: `${item.reference.low / item.reference.high * 100}%`, right: 0 }} /><span className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-foreground" style={{ left: `calc(${position}% - 2px)` }} /></div><div className="mt-2 flex justify-between type-meta"><span>{item.referenceState.replace('-', ' ')}</span><span className="capitalize">{item.progression}</span></div></div>; })}</div><p className="mt-2 type-supporting">The shaded band is a population reference, not your measured optimum. Activity is not converted into resistance sets.</p></div>;
}

function WeightChart({ analysis }: { analysis: DataroomAnalysis }) {
  const data = analysis.weight.points.map(point => ({ ...point, label: format(parseISO(point.date), 'd MMM') }));
  if (data.length < 2) return <p className="py-6 type-supporting">Log more bodyweight measurements to establish a smoothed trend.</p>;
  return <div><div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border"><div className="bg-card p-3"><p className="type-meta">Latest scale</p><p className="mt-1 type-card-title">{analysis.weight.latest?.toFixed(1)} kg</p></div><div className="bg-card p-3"><p className="type-meta">7-day trend</p><p className="mt-1 type-card-title">{analysis.weight.trendWeight?.toFixed(1)} kg</p></div><div className="bg-card p-3"><p className="type-meta">Rate</p><p className="mt-1 type-card-title">{analysis.weight.percentPerWeek == null ? '—' : `${analysis.weight.percentPerWeek > 0 ? '+' : ''}${analysis.weight.percentPerWeek}%`}</p><p className="type-meta">per week</p></div></div><div className="mt-4 h-52"><ResponsiveContainer><ComposedChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={28} /><YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} /><Line dataKey="raw" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.35} strokeWidth={1} dot={{ r: 3, fill: 'hsl(var(--muted-foreground))' }} name="Scale" /><Line dataKey="trend" stroke="hsl(var(--foreground))" strokeWidth={3} dot={false} name="7-day trend" /></ComposedChart></ResponsiveContainer></div></div>;
}

function EnergyAndNutrition({ analysis, meals, energy, proteinGoal }: { analysis: DataroomAnalysis; meals: MealDay[]; energy: EnergyDay[]; proteinGoal: number }) {
  const logged = new Set(meals.map(day => day.date));
  const chart = energy.map(day => ({ date: format(parseISO(day.date), 'd'), expenditure: -day.expenditure, intake: logged.has(day.date) ? day.intake : null }));
  const averages = useMemo(() => { const avg = (key: keyof MealDay) => meals.length ? Math.round(meals.reduce((sum, day) => sum + Number(day[key] || 0), 0) / meals.length) : null; return { protein: avg('protein'), fiber: avg('fiber'), carbs: avg('carbs'), fat: avg('fat'), sugar: avg('sugar'), sodium: avg('sodium'), potassium: avg('potassium') }; }, [meals]);
  return <div><div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border"><div className="bg-card p-3"><p className="type-meta">Estimated balance</p><p className="mt-1 type-card-title">{analysis.nutrition.energyBalance == null ? 'Unavailable' : `${analysis.nutrition.energyBalance.toLocaleString()} kcal`}</p><p className="type-supporting">logged days only</p></div><div className="bg-card p-3"><p className="type-meta">Meal-log coverage</p><p className="mt-1 type-card-title">{analysis.nutrition.loggedDays}/{analysis.nutrition.windowDays}</p><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-fuel" style={{ width: `${analysis.nutrition.coverage}%` }} /></div></div></div><div className="mt-4 h-44"><ResponsiveContainer><BarChart data={chart} margin={{ left: -24, right: 4 }}><XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} /><ReferenceLine y={0} stroke="hsl(var(--border))" /><Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} /><Bar dataKey="intake" fill="hsl(var(--fuel))" radius={[3, 3, 0, 0]} name="Logged intake" /><Bar dataKey="expenditure" fill="hsl(var(--muted-foreground) / .45)" radius={[0, 0, 3, 3]} name="Estimated expenditure" /></BarChart></ResponsiveContainer></div><div className="mt-5 divide-y divide-border border-y border-border"><div className="flex items-center justify-between py-3"><span><span className="block type-action text-foreground">Protein</span><span className="type-supporting">Average on logged days</span></span><span className="text-right"><span className="block type-card-title">{averages.protein ?? '—'}g</span><span className="type-meta">target {proteinGoal}g</span></span></div><div className="flex items-center justify-between py-3"><span><span className="block type-action text-foreground">Fiber</span><span className="type-supporting">Diet-quality context</span></span><span className="type-card-title">{averages.fiber ?? '—'}g</span></div><details className="group"><summary className="flex cursor-pointer list-none items-center justify-between py-3 type-action"><span>Nutrition details</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border mb-3">{Object.entries(averages).filter(([key]) => !['protein', 'fiber'].includes(key)).map(([key, value]) => <div key={key} className="bg-card p-3"><p className="type-meta capitalize">{key === 'sugar' ? 'Total sugar' : key}</p><p className="mt-1 type-card-title">{value ?? '—'}{['sodium', 'potassium'].includes(key) ? 'mg' : 'g'}</p></div>)}</div></details></div></div>;
}

function RecoveryView({ analysis, hydration }: { analysis: DataroomAnalysis; hydration?: { dailyData: Array<{ date: string; total: number }> } }) {
  const water = hydration?.dailyData ?? [];
  return <div><div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border"><div className="bg-card p-3"><p className="type-meta">Context</p><p className="mt-1 type-card-title capitalize">{analysis.recovery.state}</p></div><div className="bg-card p-3"><p className="type-meta">Sleep</p><p className="mt-1 type-card-title">{analysis.recovery.averageSleep ?? '—'}h</p><p className="type-supporting">{analysis.recovery.sleepNights}/14 nights</p></div><div className="bg-card p-3"><p className="type-meta">Training</p><p className="mt-1 type-card-title">{analysis.recovery.recentTrainingDays}</p><p className="type-supporting">days / 14</p></div></div><p className="mt-3 type-supporting">{analysis.recovery.reason}</p>{water.length > 0 && <div className="mt-5"><div className="mb-2 flex items-center gap-2 type-meta"><Droplets className="h-3.5 w-3.5" />Hydration context</div><div className="flex h-20 items-end gap-1">{water.map(day => <div key={day.date} className="flex-1 rounded-t bg-water/60" style={{ height: `${Math.max(4, Math.min(100, day.total / 3 * 100))}%` }} title={`${day.total.toFixed(1)}L`} />)}</div></div>}</div>;
}

export function DataroomDeepDives({ analysis, meals, energy, hydration, proteinGoal }: { analysis: DataroomAnalysis; meals: MealDay[]; energy: EnergyDay[]; hydration?: { dailyData: Array<{ date: string; total: number }> }; proteinGoal: number }) {
  return <div className="border-t border-border"><DeepDive title="Training" meta={`${analysis.exercises.length} exercises · ${analysis.muscles.filter(m => m.setsPerWeek > 0).length} muscle regions`} icon={<Dumbbell className="h-4 w-4" />} defaultOpen><KeyLiftRows analysis={analysis} /><MuscleMatrix analysis={analysis} /></DeepDive><DeepDive title="Body Composition & Nutrition" meta={`${analysis.weight.observations} weigh-ins · ${analysis.nutrition.loggedDays}/${analysis.nutrition.windowDays} intake days`} icon={<Scale className="h-4 w-4" />}><WeightChart analysis={analysis} /><div className="mt-8"><EnergyAndNutrition analysis={analysis} meals={meals} energy={energy} proteinGoal={proteinGoal} /></div></DeepDive><DeepDive title="Recovery" meta={`${analysis.recovery.sleepNights} sleep logs · ${analysis.recovery.recentTrainingDays} training days`} icon={<Activity className="h-4 w-4" />}><RecoveryView analysis={analysis} hydration={hydration} /></DeepDive><DeepDive title="Data Quality" meta={`${confidenceLabel[analysis.confidence]} decision confidence`} icon={<Database className="h-4 w-4" />}><div className="divide-y divide-border border-y border-border">{[
    ['Bodyweight', analysis.weight.confidence, `${analysis.weight.observations} measurements across ${analysis.weight.spanDays} days`],
    ['Training', analysis.exercises[0]?.confidence ?? 'insufficient', `${analysis.exercises.length} exercises with recent history`],
    ['Nutrition', analysis.nutrition.confidence, `${analysis.nutrition.loggedDays}/${analysis.nutrition.windowDays} days contain intake logs; completeness is unknown`],
    ['Recovery', analysis.recovery.confidence, `${analysis.recovery.sleepNights}/14 nights contain sleep data`],
  ].map(([label, confidence, reason]) => <div key={String(label)} className="grid grid-cols-[1fr_auto] gap-3 py-3"><span><span className="block type-action text-foreground">{label}</span><span className="block type-supporting">{reason}</span></span><ConfidenceMark value={confidence as Confidence} /></div>)}</div><p className="mt-3 type-supporting">Direct logs are separated from derived trends and population reference bands. Missing data remains missing; it is never converted to zero.</p></DeepDive></div>;
}

