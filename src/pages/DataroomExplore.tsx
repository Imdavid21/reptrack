import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from 'recharts';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { DataroomDeepDives } from '@/components/dataroom/DataRoomVisuals';
import { DataInspector, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

type RelationshipPoint = { date: string; x: number; y: number };

function RelationshipPlot({ title, xLabel, yLabel, points }: { title: string; xLabel: string; yLabel: string; points: RelationshipPoint[] }) {
  const [selected, setSelected] = useState(Math.max(0, points.length - 1));
  const point = points[selected];
  if (points.length < 10) return <div className="rounded-2xl border border-border bg-card p-4"><div className="text-sm font-semibold">{title}</div><p className="type-caption mt-1">{points.length} paired observations. At least 10 are required before RepTrack renders this exploratory relationship.</p></div>;
  return <div className="space-y-2">
    <DataInspector label={point ? format(parseISO(point.date), 'EEE, d MMM') : undefined} items={[{ label: xLabel, value: point ? Number(point.x.toFixed(1)).toString() : '—' }, { label: yLabel, value: point ? Number(point.y.toFixed(1)).toString() : '—' }]} />
    <div className="rounded-2xl border border-border bg-card pt-3" onPointerMove={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      setSelected(Math.round((x / Math.max(rect.width, 1)) * (points.length - 1)));
    }}>
      <div className="px-3 text-sm font-semibold">{title}</div>
      <ResponsiveContainer width="100%" height={230}>
        <ScatterChart margin={{ top: 14, right: 18, bottom: 22, left: -8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} />
          <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} label={{ value: xLabel, position: 'insideBottom', offset: -14, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis type="number" dataKey="y" name={yLabel} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
          <Scatter data={points} fill="hsl(var(--foreground))" isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  </div>;
}

function ExploreContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const [relationship, setRelationship] = useState<'sleep-weight' | 'protein-weight' | 'sleep-duration'>('sleep-weight');

  const weightByDate = useMemo(() => new Map((data.analysis?.weight.points || []).map(point => [point.date, point.trend])), [data.analysis?.weight.points]);
  const sleepWeight = useMemo(() => data.metrics.flatMap(day => {
    const sleep = Number(day.sleep_hours || 0);
    const weight = weightByDate.get(day.date);
    return sleep > 0 && weight != null ? [{ date: day.date, x: sleep, y: weight }] : [];
  }), [data.metrics, weightByDate]);
  const proteinWeight = useMemo(() => data.meals.flatMap(day => {
    const weight = weightByDate.get(day.date);
    return day.protein > 0 && weight != null ? [{ date: day.date, x: day.protein, y: weight }] : [];
  }), [data.meals, weightByDate]);
  const sleepByDate = useMemo(() => new Map(data.metrics.map(day => [day.date, Number(day.sleep_hours || 0)])), [data.metrics]);
  const sleepDuration = useMemo(() => data.workouts.flatMap(workout => {
    const sleep = sleepByDate.get(workout.date) || 0;
    const duration = Number(workout.workout_duration_minutes || 0);
    return workout.completed_at && sleep > 0 && duration > 0 ? [{ date: workout.date, x: sleep, y: duration }] : [];
  }), [data.workouts, sleepByDate]);

  if (data.isLoading && !data.analysis) return <div className="space-y-3"><div className="h-32 rounded-xl bg-muted animate-pulse"/><div className="h-32 rounded-xl bg-muted animate-pulse"/></div>;
  if (!data.analysis) return <div className="rounded-2xl border border-border bg-card p-6"><p className="text-sm font-semibold">Deeper analysis is not available yet.</p><p className="type-caption mt-1">The main Data Room remains usable; complete more logs or retry this view later.</p></div>;

  const current = relationship === 'sleep-weight' ? { title: 'Sleep vs weight trend', x: 'Sleep (h)', y: 'Trend weight (kg)', points: sleepWeight } : relationship === 'protein-weight' ? { title: 'Protein vs weight trend', x: 'Protein (g)', y: 'Trend weight (kg)', points: proteinWeight } : { title: 'Sleep vs workout duration', x: 'Sleep (h)', y: 'Workout duration (min)', points: sleepDuration };

  return <div className="space-y-9">
    <section className="rounded-3xl border border-border bg-card p-4"><div className="type-eyebrow">Explore</div><h2 className="type-section-title mt-1">Advanced evidence, not another dashboard</h2><p className="type-supporting mt-2">These views expose calculations beneath the Data Room. Population bands remain references, nutrition remains limited to logged evidence, and relationships are never treated as causation.</p></section>

    <VisualSection eyebrow="Relationships" title="Inspect paired observations" description="Scatterplots are exploratory. RepTrack does not fit a trend line or claim causation from a small personal dataset.">
      <div className="mb-3 -mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          ['sleep-weight', 'Sleep × weight'],
          ['protein-weight', 'Protein × weight'],
          ['sleep-duration', 'Sleep × session'],
        ].map(([key, label]) => <button key={key} onClick={() => setRelationship(key as typeof relationship)} className={`shrink-0 min-h-10 rounded-xl px-3 text-xs font-semibold border ${relationship === key ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-foreground'}`}>{label}</button>)}
      </div>
      <RelationshipPlot title={current.title} xLabel={current.x} yLabel={current.y} points={current.points} />
      <p className="type-caption mt-2">Association only. Same-day alignment can be influenced by missing data, water shifts, workout type, and other variables.</p>
    </VisualSection>

    <VisualSection eyebrow="Deep dives" title="Calculations underneath the briefing" description="Open each section for training, bodyweight, energy, recovery, and data-quality evidence.">
      <DataroomDeepDives
        analysis={data.analysis}
        meals={data.meals}
        energy={data.energy.map(day => ({
          date: day.date,
          baseline: day.baseline,
          workout: day.workoutBurned,
          activity: day.manualBurned,
          expenditure: day.expenditure,
          intake: data.meals.some(meal => meal.date === day.date) ? day.intake : undefined,
        }))}
        hydration={data.hydration}
        proteinGoal={data.preferences?.daily_protein_goal || 165}
      />
    </VisualSection>
  </div>;
}

export default function DataroomExplore() {
  return <DataroomPageShell eyebrow="Dataroom" title="Explore" description="Relationship plots and advanced evidence for questions that need more detail than the default briefing."><ExploreContent /></DataroomPageShell>;
}
