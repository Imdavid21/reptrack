import { useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from 'recharts';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { DataroomDeepDives } from '@/components/dataroom/DataRoomVisuals';
import { DataInspector, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

type RelationshipPoint = { date: string; x: number; y: number };

function RelationshipPlot({ title, xLabel, yLabel, points }: { title: string; xLabel: string; yLabel: string; points: RelationshipPoint[] }) {
  const sorted = useMemo(() => [...points].sort((a, b) => a.x - b.x), [points]);
  const [selected, setSelected] = useState(Math.max(0, sorted.length - 1));
  const wrapRef = useRef<HTMLDivElement>(null);
  const point = sorted[selected];
  const confidence = points.length >= 30 ? 'More evidence' : points.length >= 20 ? 'Low-confidence pattern' : 'Exploratory only';

  if (points.length < 10) return <div className="border-y border-border py-4"><div className="text-sm font-semibold">{title}</div><p className="type-caption mt-1">{points.length} paired observations. RepTrack waits for at least 10 before drawing this relationship so a handful of points do not look more meaningful than they are.</p></div>;

  const xMin = Math.min(...sorted.map(item => item.x));
  const xMax = Math.max(...sorted.map(item => item.x));
  const selectFromPointer = (clientX: number) => {
    const node = wrapRef.current;
    if (!node || !sorted.length) return;
    const rect = node.getBoundingClientRect();
    const leftPlot = 42;
    const rightPlot = 18;
    const usable = Math.max(1, rect.width - leftPlot - rightPlot);
    const normalized = Math.max(0, Math.min(1, (clientX - rect.left - leftPlot) / usable));
    const targetX = xMin + normalized * (xMax - xMin || 1);
    let nearest = 0;
    let distance = Infinity;
    sorted.forEach((candidate, index) => { const next = Math.abs(candidate.x - targetX); if (next < distance) { distance = next; nearest = index; } });
    setSelected(nearest);
  };

  return <div className="space-y-1">
    <div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{title}</div><div className="type-meta">{confidence} · n={points.length}</div></div>
    <DataInspector label={point ? format(parseISO(point.date), 'EEE, d MMM') : undefined} items={[{ label: xLabel, value: point ? Number(point.x.toFixed(1)).toString() : '—' }, { label: yLabel, value: point ? Number(point.y.toFixed(1)).toString() : '—' }]} />
    <div ref={wrapRef} className="touch-pan-y" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); selectFromPointer(event.clientX); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) selectFromPointer(event.clientX); }} role="slider" aria-label={`${title}. Association only.`} aria-valuemin={0} aria-valuemax={Math.max(0, sorted.length - 1)} aria-valuenow={selected} aria-valuetext={point ? `${format(parseISO(point.date), 'd MMM yyyy')}. ${xLabel} ${Number(point.x.toFixed(1))}. ${yLabel} ${Number(point.y.toFixed(1))}.` : undefined} tabIndex={0} onKeyDown={event => { if (event.key === 'ArrowLeft') setSelected(value => Math.max(0, value - 1)); if (event.key === 'ArrowRight') setSelected(value => Math.min(sorted.length - 1, value + 1)); }}>
      <ResponsiveContainer width="100%" height={250}>
        <ScatterChart margin={{ top: 14, right: 18, bottom: 24, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} label={{ value: xLabel, position: 'insideBottom', offset: -16, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['dataMin', 'dataMax']} />
          <YAxis type="number" dataKey="y" name={yLabel} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={42} domain={['dataMin', 'dataMax']} />
          <Scatter data={sorted} fill="hsl(var(--foreground))" isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
    <table className="sr-only"><caption>{title}. Association only.</caption><thead><tr><th>Date</th><th>{xLabel}</th><th>{yLabel}</th></tr></thead><tbody>{sorted.map(item => <tr key={`${item.date}-${item.x}-${item.y}`}><td>{item.date}</td><td>{item.x}</td><td>{item.y}</td></tr>)}</tbody></table>
  </div>;
}

function ExploreContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const [relationship, setRelationship] = useState<'sleep-weight' | 'protein-weight' | 'sleep-duration'>('sleep-weight');
  const weightByDate = useMemo(() => new Map((data.analysis?.weight.points || []).map(point => [point.date, point.trend])), [data.analysis?.weight.points]);
  const sleepWeight = useMemo(() => data.metrics.flatMap(day => { const sleep = Number(day.sleep_hours || 0); const weight = weightByDate.get(day.date); return sleep > 0 && weight != null ? [{ date: day.date, x: sleep, y: weight }] : []; }), [data.metrics, weightByDate]);
  const proteinWeight = useMemo(() => data.meals.flatMap(day => { const weight = weightByDate.get(day.date); return day.protein > 0 && weight != null ? [{ date: day.date, x: day.protein, y: weight }] : []; }), [data.meals, weightByDate]);
  const sleepByDate = useMemo(() => new Map(data.metrics.map(day => [day.date, Number(day.sleep_hours || 0)])), [data.metrics]);
  const sleepDuration = useMemo(() => data.workouts.flatMap(workout => { const sleep = sleepByDate.get(workout.date) || 0; const duration = Number(workout.workout_duration_minutes || 0); return workout.completed_at && sleep > 0 && duration > 0 ? [{ date: workout.date, x: sleep, y: duration }] : []; }), [data.workouts, sleepByDate]);

  if (data.isLoading && !data.analysis) return <div className="space-y-3"><div className="h-32 rounded-xl bg-muted animate-pulse"/><div className="h-32 rounded-xl bg-muted animate-pulse"/></div>;
  if (!data.analysis) return <div className="border-y border-border p-6"><p className="text-sm font-semibold">Deeper analysis is not available yet.</p><p className="type-caption mt-1">The main Data Room remains usable; complete more logs or retry this view later.</p></div>;

  const current = relationship === 'sleep-weight' ? { title: 'Sleep vs weight trend', x: 'Sleep (h)', y: 'Trend weight (kg)', points: sleepWeight } : relationship === 'protein-weight' ? { title: 'Protein vs weight trend', x: 'Protein (g)', y: 'Trend weight (kg)', points: proteinWeight } : { title: 'Sleep vs workout duration', x: 'Sleep (h)', y: 'Workout duration (min)', points: sleepDuration };

  return <div className="space-y-9">
    <section className="border-y border-border py-4"><h2 className="type-section-title">Advanced evidence</h2><p className="type-supporting mt-2">Relationship views expose paired observations without fitting a causal story to a small personal dataset.</p></section>

    <VisualSection title="Relationships" description="Select a relationship, then inspect the underlying observations. No regression line is shown.">
      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{[['sleep-weight', 'Sleep × weight'], ['protein-weight', 'Protein × weight'], ['sleep-duration', 'Sleep × session']].map(([key, label]) => <button key={key} onClick={() => setRelationship(key as typeof relationship)} className={`shrink-0 min-h-11 rounded-xl px-3 text-xs font-semibold border ${relationship === key ? 'bg-foreground text-background border-foreground' : 'bg-background border-border text-foreground'}`}>{label}</button>)}</div>
      <RelationshipPlot title={current.title} xLabel={current.x} yLabel={current.y} points={current.points} />
      <p className="type-caption mt-2">Association only. Same-day alignment can be affected by missing data, water shifts, workout type, and other variables.</p>
    </VisualSection>

    <VisualSection title="Calculations underneath the briefing" description="Training, bodyweight, energy, recovery, and data-quality evidence remain available for deeper inspection.">
      <DataroomDeepDives analysis={data.analysis} meals={data.meals} energy={data.energy.map(day => ({ date: day.date, baseline: day.baseline, workout: day.workoutBurned, activity: day.manualBurned, expenditure: day.expenditure, intake: data.meals.some(meal => meal.date === day.date) ? day.intake : undefined }))} hydration={data.hydration} proteinGoal={data.preferences?.daily_protein_goal || 165} />
    </VisualSection>
  </div>;
}

export default function DataroomExplore() {
  return <DataroomPageShell eyebrow="Dataroom" title="Explore" description="Relationship plots and advanced evidence for questions that need more detail than the default briefing."><ExploreContent /></DataroomPageShell>;
}
