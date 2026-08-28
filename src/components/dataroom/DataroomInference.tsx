import { useMemo } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { TrainingExperiment } from '@/hooks/useAdvancedMode';

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const fmt = (value: number) => nf.format(Math.round((value + Number.EPSILON) * 100) / 100);
const dateKey = (date: string, offset = 0) => format(addDays(parseISO(date), offset), 'yyyy-MM-dd');
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function pearson(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return null;
  const mx = mean(points.map(point => point.x));
  const my = mean(points.map(point => point.y));
  let numerator = 0;
  let sx = 0;
  let sy = 0;
  for (const point of points) {
    const dx = point.x - mx;
    const dy = point.y - my;
    numerator += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  const denominator = Math.sqrt(sx * sy);
  return denominator > 0 ? numerator / denominator : null;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function effect(points: Array<{ x: number; y: number }>) {
  const cut = median(points.map(point => point.x));
  const low = points.filter(point => point.x <= cut).map(point => point.y);
  const high = points.filter(point => point.x > cut).map(point => point.y);
  return low.length && high.length ? mean(high) - mean(low) : null;
}

type Pair = { x: number; y: number; date: string };
type Relation = {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  yUnit?: string;
  kind: 'association' | 'temporal';
  lag: string;
  pairs: Pair[];
  r: number;
  effect: number | null;
  score: number;
};

function relation(input: Omit<Relation, 'r' | 'effect' | 'score'>): Relation | null {
  const clean = input.pairs.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (clean.length < 4) return null;
  const r = pearson(clean);
  if (r == null) return null;
  return {
    ...input,
    pairs: clean,
    r,
    effect: effect(clean),
    score: Math.abs(r) * Math.min(1.6, Math.sqrt(clean.length / 5)),
  };
}

function strength(r: number) {
  const value = Math.abs(r);
  if (value >= 0.7) return 'strong';
  if (value >= 0.5) return 'moderate';
  if (value >= 0.3) return 'weak';
  return 'very weak';
}

function ScatterMini({ points }: { points: Pair[] }) {
  if (points.length < 3) return <div className="h-20 border-b border-dashed border-border" />;
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const spanX = maxX - minX || 1;
  const minY = Math.min(...ys); const maxY = Math.max(...ys); const spanY = maxY - minY || 1;
  const normalized = points.map(point => ({
    x: 8 + (point.x - minX) / spanX * 144,
    y: 70 - (point.y - minY) / spanY * 58,
  }));
  const mx = mean(xs); const my = mean(ys);
  const covariance = points.reduce((sum, point) => sum + (point.x - mx) * (point.y - my), 0);
  const variance = points.reduce((sum, point) => sum + (point.x - mx) ** 2, 0);
  const slope = variance > 0 ? covariance / variance : 0;
  const intercept = my - slope * mx;
  const lineY = (x: number) => 70 - ((slope * x + intercept) - minY) / spanY * 58;
  return <svg viewBox="0 0 160 78" preserveAspectRatio="none" className="h-20 w-full" aria-hidden>
    <line x1="8" y1="70" x2="152" y2="70" stroke="currentColor" opacity=".12" />
    <line x1="8" y1="12" x2="8" y2="70" stroke="currentColor" opacity=".12" />
    <line x1="8" y1={lineY(minX)} x2="152" y2={lineY(maxX)} stroke="currentColor" strokeWidth="2" opacity=".45" />
    {normalized.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3.2" fill="currentColor" opacity=".78" />)}
  </svg>;
}

function RelationCard({ item }: { item: Relation }) {
  const positive = item.r >= 0;
  const conclusion = `${positive ? 'Higher' : 'Higher'} ${item.xLabel.toLowerCase()} ${item.kind === 'temporal' ? 'was followed by' : 'tracked with'} ${positive ? 'higher' : 'lower'} ${item.yLabel.toLowerCase()}.`;
  return <article className="rounded-[18px] border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="text-sm font-semibold">{item.title}</h3><p className="type-caption mt-0.5">{item.lag}</p></div>
      <span className="rounded-md bg-muted px-2 py-1 type-meta">{item.kind === 'temporal' ? 'Temporal' : 'Association'}</span>
    </div>
    <div className="mt-3"><ScatterMini points={item.pairs} /></div>
    <div className="mt-3 grid grid-cols-3 gap-3 border-y border-border py-3">
      <div><div className="type-caption">r</div><div className="text-base font-semibold tabular-nums">{fmt(item.r)}</div></div>
      <div><div className="type-caption">Strength</div><div className="text-sm font-semibold capitalize">{strength(item.r)}</div></div>
      <div><div className="type-caption">Pairs</div><div className="text-base font-semibold tabular-nums">{item.pairs.length}</div></div>
    </div>
    <p className="mt-3 text-sm font-medium leading-5">{conclusion}</p>
    {item.effect != null && <p className="type-caption mt-1">High-vs-low split: {item.effect > 0 ? '+' : ''}{fmt(item.effect)}{item.yUnit ? ` ${item.yUnit}` : ''}.</p>}
    <p className="type-caption mt-2">{item.kind === 'temporal' ? 'Timing makes this a stronger causal candidate, but passive logs cannot prove cause.' : 'Same-period association only.'}</p>
  </article>;
}

type Props = {
  metrics: Array<{ date: string; sleep_hours: number | null; bodyweight: number | null }>;
  sets: Array<{ workout_date?: string | null; actual_weight?: number | null; actual_reps?: number | null }>;
  meals: Array<{ date: string; calories: number; protein: number }>;
  readiness: Array<{ checkin_date: string; readiness: number | null; fatigue: number | null }>;
  activities: Array<{ date: string; duration_minutes?: number | null }>;
  energy: Array<{ date: string; intake?: number; expenditure?: number }>;
  weightPoints: Array<{ date: string; trend: number }>;
  hydration?: { dailyData: Array<{ date: string; total: number }> };
  experiments?: TrainingExperiment[];
};

function currentMetric(metric: string, props: Props): { value: number; unit: string } | null {
  const key = metric.toLowerCase();
  const sleep = props.metrics.filter(row => Number(row.sleep_hours) > 0).map(row => Number(row.sleep_hours));
  const readiness = props.readiness.filter(row => row.readiness != null).map(row => Number(row.readiness));
  const latestWeight = [...props.metrics].filter(row => Number(row.bodyweight) > 0).sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.bodyweight;
  const volume = props.sets.reduce((sum, row) => sum + Number(row.actual_weight || 0) * Number(row.actual_reps || 0), 0);
  const activity = props.activities.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
  if (/bodyweight|weight/.test(key) && latestWeight != null) return { value: Number(latestWeight), unit: 'kg' };
  if (/sleep/.test(key) && sleep.length) return { value: mean(sleep), unit: 'h' };
  if (/readiness/.test(key) && readiness.length) return { value: mean(readiness), unit: '/10' };
  if (/protein/.test(key) && props.meals.length) return { value: mean(props.meals.map(row => row.protein)), unit: 'g/day' };
  if (/calorie|intake/.test(key) && props.meals.length) return { value: mean(props.meals.map(row => row.calories)), unit: 'kcal/day' };
  if (/workout|session/.test(key)) return { value: new Set(props.sets.map(row => row.workout_date).filter(Boolean)).size, unit: 'sessions' };
  if (/volume|tonnage/.test(key)) return { value: volume, unit: 'kg·reps' };
  if (/activity|minutes|cardio/.test(key)) return { value: activity, unit: 'min' };
  return null;
}

export function DataroomInference(props: Props) {
  const relations = useMemo(() => {
    const sleep = new Map(props.metrics.filter(row => Number(row.sleep_hours) > 0).map(row => [row.date, Number(row.sleep_hours)]));
    const readiness = new Map(props.readiness.filter(row => row.readiness != null).map(row => [row.checkin_date, Number(row.readiness)]));
    const meals = new Map(props.meals.map(row => [row.date, row]));
    const energy = new Map(props.energy.filter(row => row.intake != null && row.expenditure != null).map(row => [row.date, Number(row.intake) - Number(row.expenditure)]));
    const trend = new Map(props.weightPoints.map(row => [row.date, row.trend]));
    const activity = new Map<string, number>();
    for (const row of props.activities) activity.set(row.date, (activity.get(row.date) || 0) + Number(row.duration_minutes || 0));
    const training = new Map<string, number>();
    for (const row of props.sets) {
      const date = row.workout_date || '';
      if (!date) continue;
      training.set(date, (training.get(date) || 0) + Number(row.actual_weight || 0) * Number(row.actual_reps || 0));
    }
    const hydration = new Map((props.hydration?.dailyData || []).map(row => [row.date, Number(row.total)]));
    const result: Relation[] = [];
    const push = (value: Relation | null) => { if (value) result.push(value); };

    push(relation({
      id: 'sleep-readiness', title: 'Sleep vs readiness', xLabel: 'Sleep', yLabel: 'Readiness', yUnit: '/10', kind: 'association', lag: 'Same day',
      pairs: [...sleep.entries()].filter(([date]) => readiness.has(date)).map(([date, x]) => ({ date, x, y: readiness.get(date)! })),
    }));
    push(relation({
      id: 'sleep-next-training', title: 'Sleep → next-day training volume', xLabel: 'Sleep', yLabel: 'Training volume', yUnit: 'kg·reps', kind: 'temporal', lag: '1-day lag',
      pairs: [...sleep.entries()].filter(([date]) => training.has(dateKey(date, 1))).map(([date, x]) => ({ date, x, y: training.get(dateKey(date, 1))! })),
    }));
    push(relation({
      id: 'protein-next-training', title: 'Protein → next-day training volume', xLabel: 'Protein', yLabel: 'Training volume', yUnit: 'kg·reps', kind: 'temporal', lag: '1-day lag',
      pairs: [...meals.entries()].filter(([date]) => training.has(dateKey(date, 1))).map(([date, meal]) => ({ date, x: meal.protein, y: training.get(dateKey(date, 1))! })),
    }));
    push(relation({
      id: 'energy-next-weight', title: 'Energy balance → weight-trend change', xLabel: 'Energy balance', yLabel: 'Weight trend change', yUnit: 'kg', kind: 'temporal', lag: '1-day lag',
      pairs: [...energy.entries()].filter(([date]) => trend.has(date) && trend.has(dateKey(date, 1))).map(([date, x]) => ({ date, x, y: trend.get(dateKey(date, 1))! - trend.get(date)! })),
    }));
    push(relation({
      id: 'activity-next-sleep', title: 'Activity → next-night sleep', xLabel: 'Activity minutes', yLabel: 'Sleep', yUnit: 'h', kind: 'temporal', lag: '1-day lag',
      pairs: [...activity.entries()].filter(([date]) => sleep.has(dateKey(date, 1))).map(([date, x]) => ({ date, x, y: sleep.get(dateKey(date, 1))! })),
    }));
    push(relation({
      id: 'load-readiness', title: 'Recent training load → readiness', xLabel: '3-day training load', yLabel: 'Readiness', yUnit: '/10', kind: 'temporal', lag: 'Previous 3 days',
      pairs: [...readiness.entries()].map(([date, y]) => ({
        date,
        y,
        x: [1, 2, 3].reduce((sum, offset) => sum + (training.get(dateKey(date, -offset)) || 0), 0),
      })).filter(point => point.x > 0),
    }));
    push(relation({
      id: 'hydration-next-weight', title: 'Hydration → next-day scale change', xLabel: 'Water', yLabel: 'Scale change', yUnit: 'kg', kind: 'temporal', lag: '1-day lag',
      pairs: [...hydration.entries()].filter(([date]) => trend.has(date) && trend.has(dateKey(date, 1))).map(([date, x]) => ({ date, x, y: trend.get(dateKey(date, 1))! - trend.get(date)! })),
    }));
    return result.sort((a, b) => b.score - a.score);
  }, [props]);

  const useful = relations.filter(item => Math.abs(item.r) >= 0.25).slice(0, 6);
  const shown = useful.length ? useful : relations.slice(0, 3);
  const experiments = (props.experiments || []).filter(item => item.status === 'active' || item.status === 'completed').slice(0, 5);

  return <div className="space-y-8">
    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="type-section-title">Conclusions</h2><p className="type-caption mt-1">Ranked from your matched cross-domain data.</p></div><span className="type-meta">{relations.length} testable relationships</span></div>
      {shown.length ? <div className="grid gap-3 md:grid-cols-2">{shown.map(item => <RelationCard key={item.id} item={item} />)}</div> : <div className="border-y border-border py-6 type-caption">More overlapping days are needed to test relationships.</div>}
    </section>

    <section>
      <div className="mb-3"><h2 className="type-section-title">Causal evidence</h2><p className="type-caption mt-1">Passive logs stay associations. Explicit Lab experiments can move closer to causal evidence.</p></div>
      {experiments.length ? <div className="divide-y divide-border border-y border-border">{experiments.map(item => {
        const current = currentMetric(item.metric, props);
        const age = Math.max(0, differenceInCalendarDays(new Date(), parseISO(item.startsOn)));
        const delta = current && item.baseline != null ? current.value - item.baseline : null;
        return <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4"><div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{item.name}</span><span className="rounded-md bg-muted px-2 py-1 type-meta">Experiment</span></div><div className="type-caption mt-1">{item.metric} · day {age + 1}</div><p className="type-caption mt-2">{item.baseline == null ? 'Add a baseline to evaluate change.' : current ? `Baseline ${fmt(item.baseline)} → live ${fmt(current.value)} ${current.unit}${delta == null ? '' : ` (${delta > 0 ? '+' : ''}${fmt(delta)})`}.` : 'Metric is not yet mapped to a live RepTrack signal.'}</p></div><div className="text-right"><div className="type-caption">Target</div><div className="text-sm font-semibold tabular-nums">{item.target == null ? '—' : fmt(item.target)}</div></div></div>;
      })}</div> : <div className="border-y border-border py-6 type-caption">Start an experiment in Performance Lab to create intervention-based evidence.</div>}
      <p className="type-caption mt-3">RepTrack should only call a result causal after a defined intervention, baseline, repeated observations, and a stable comparison window. These cards do not overstate passive correlations.</p>
    </section>
  </div>;
}
