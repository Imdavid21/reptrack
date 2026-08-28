import { useMemo } from 'react';
import { format, parseISO, startOfWeek } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMuscleSubRegions } from '@/lib/exerciseClassification';

const grid = { stroke: 'hsl(var(--border))', strokeOpacity: 0.45 };
const axis = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const tooltip = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  fontSize: 12,
};

const chartNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const formatChartNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? chartNumber.format(number) : String(value ?? '');
};
const roundChartNumber = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const tooltipFormatter = (value: number | string, name: string) => [formatChartNumber(value), name];

function Empty({ children }: { children: string }) {
  return <div className="border-y border-border py-6 type-caption">{children}</div>;
}

export function ExerciseProgressChart({ exposures }: { exposures: Array<{ date: string; weight: number; reps: number; e1rm: number; volume: number }> }) {
  const data = exposures.map(row => ({
    ...row,
    weight: roundChartNumber(row.weight),
    reps: roundChartNumber(row.reps),
    e1rm: roundChartNumber(row.e1rm),
    volume: roundChartNumber(row.volume),
    label: format(parseISO(row.date), 'd MMM'),
  }));
  if (data.length < 2) return <Empty>At least two comparable exposures are needed for a progression chart.</Empty>;
  const hasE1rm = data.some(row => row.e1rm > 0);
  return <div className="h-64 rounded-[18px] border border-border bg-card p-3">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ left: -14, right: 8, top: 10, bottom: 0 }}>
        <CartesianGrid vertical={false} {...grid} />
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={22} />
        <YAxis tick={axis} tickFormatter={formatChartNumber} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={tooltip}
          formatter={(value: number | string, name: string) => [formatChartNumber(value), name === 'e1rm' ? 'Est. 1RM (kg)' : name]}
        />
        <Line
          type="monotone"
          dataKey={hasE1rm ? 'e1rm' : 'weight'}
          stroke="hsl(var(--foreground))"
          strokeWidth={3}
          dot={{ r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--foreground))', strokeWidth: 2 }}
          activeDot={{ r: 5 }}
          name={hasE1rm ? 'e1rm' : 'load'}
        />
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}

export function NutritionTrendCharts({ meals, calorieTarget, proteinTarget }: { meals: Array<{ date: string; calories: number; protein: number }>; calorieTarget?: number | null; proteinTarget?: number | null }) {
  const data = [...meals]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(row => ({
      ...row,
      calories: roundChartNumber(row.calories),
      protein: roundChartNumber(row.protein),
      label: format(parseISO(row.date), 'd MMM'),
    }));
  if (data.length < 2) return <Empty>At least two logged nutrition days are needed to show intake trends.</Empty>;
  return <div className="grid gap-4 md:grid-cols-2">
    <div className="rounded-[18px] border border-border bg-card p-3">
      <div className="mb-2 text-sm font-semibold">Calories</div>
      <div className="h-48"><ResponsiveContainer><LineChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} {...grid} />
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={axis} tickFormatter={formatChartNumber} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltip} formatter={tooltipFormatter} />
        {calorieTarget ? <ReferenceLine y={calorieTarget} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" /> : null}
        <Line type="monotone" dataKey="calories" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart></ResponsiveContainer></div>
    </div>
    <div className="rounded-[18px] border border-border bg-card p-3">
      <div className="mb-2 text-sm font-semibold">Protein</div>
      <div className="h-48"><ResponsiveContainer><LineChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} {...grid} />
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={axis} tickFormatter={formatChartNumber} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltip} formatter={tooltipFormatter} />
        {proteinTarget ? <ReferenceLine y={proteinTarget} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" /> : null}
        <Line type="monotone" dataKey="protein" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart></ResponsiveContainer></div>
    </div>
  </div>;
}

export function MuscleVolumeTimeline({ sets }: { sets: Array<{ workout_date?: string | null; exercise_name: string; completed?: boolean | null }> }) {
  const { data, keys } = useMemo(() => {
    const weeks = new Map<string, Record<string, number>>();
    const totals = new Map<string, number>();
    for (const set of sets) {
      const date = set.workout_date || '';
      if (!date || set.completed === false) continue;
      const week = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'd MMM');
      const row = weeks.get(week) || {};
      for (const region of getMuscleSubRegions(set.exercise_name)) {
        row[region.region] = (row[region.region] || 0) + region.fraction;
        totals.set(region.region, (totals.get(region.region) || 0) + region.fraction);
      }
      weeks.set(week, row);
    }
    const keys = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key]) => key);
    const data = [...weeks.entries()].map(([week, row]) => ({
      week,
      ...Object.fromEntries(Object.entries(row).map(([key, value]) => [key, roundChartNumber(value)])),
    }));
    return { keys, data };
  }, [sets]);
  if (data.length < 2 || !keys.length) return <Empty>More training history is needed to show weekly muscle-volume distribution.</Empty>;
  return <div className="h-72 rounded-[18px] border border-border bg-card p-3"><ResponsiveContainer><BarChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
    <CartesianGrid vertical={false} {...grid} />
    <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} />
    <YAxis tick={axis} tickFormatter={formatChartNumber} axisLine={false} tickLine={false} />
    <Tooltip contentStyle={tooltip} formatter={tooltipFormatter} />
    {keys.map(key => <Bar key={key} dataKey={key} stackId="volume" fill="hsl(var(--foreground))" fillOpacity={0.16 + keys.indexOf(key) * 0.11} />)}
  </BarChart></ResponsiveContainer></div>;
}

export function RecoveryTimeline({ metrics, readiness, workouts }: { metrics: Array<{ date: string; sleep_hours: number | null }>; readiness: Array<{ checkin_date: string; readiness: number | null; fatigue: number | null }>; workouts: Array<{ date: string }> }) {
  const data = useMemo(() => {
    const rows = new Map<string, { date: string; label: string; sleep?: number; readiness?: number; training?: number }>();
    for (const row of metrics) if (row.sleep_hours != null) rows.set(row.date, { ...(rows.get(row.date) || { date: row.date, label: format(parseISO(row.date), 'd MMM') }), sleep: roundChartNumber(Number(row.sleep_hours)) });
    for (const row of readiness) rows.set(row.checkin_date, { ...(rows.get(row.checkin_date) || { date: row.checkin_date, label: format(parseISO(row.checkin_date), 'd MMM') }), readiness: row.readiness == null ? undefined : roundChartNumber(Number(row.readiness)) });
    for (const row of workouts) rows.set(row.date, { ...(rows.get(row.date) || { date: row.date, label: format(parseISO(row.date), 'd MMM') }), training: 1 });
    return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [metrics, readiness, workouts]);
  if (data.length < 2) return <Empty>More sleep or readiness history is needed for a recovery timeline.</Empty>;
  return <div className="h-64 rounded-[18px] border border-border bg-card p-3"><ResponsiveContainer><ComposedChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
    <CartesianGrid vertical={false} {...grid} />
    <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={22} />
    <YAxis yAxisId="hours" tick={axis} tickFormatter={formatChartNumber} axisLine={false} tickLine={false} />
    <YAxis yAxisId="score" orientation="right" hide domain={[0, 10]} />
    <Tooltip contentStyle={tooltip} formatter={tooltipFormatter} />
    <Bar yAxisId="score" dataKey="training" fill="hsl(var(--muted-foreground))" fillOpacity={0.16} barSize={5} />
    <Line yAxisId="hours" type="monotone" dataKey="sleep" stroke="hsl(var(--recover))" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
    <Line yAxisId="score" type="monotone" dataKey="readiness" stroke="hsl(var(--foreground))" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
  </ComposedChart></ResponsiveContainer></div>;
}

export function ActivityTimeline({ activities }: { activities: Array<{ date: string; activity_type?: string | null; duration_minutes?: number | null }> }) {
  const { data, keys } = useMemo(() => {
    const weeks = new Map<string, Record<string, number>>();
    const totals = new Map<string, number>();
    for (const row of activities) {
      if (!row.date) continue;
      const kind = (row.activity_type || 'activity').replace(/_/g, ' ');
      const week = format(startOfWeek(parseISO(row.date), { weekStartsOn: 1 }), 'd MMM');
      const target = weeks.get(week) || {};
      target[kind] = (target[kind] || 0) + Number(row.duration_minutes || 0);
      totals.set(kind, (totals.get(kind) || 0) + Number(row.duration_minutes || 0));
      weeks.set(week, target);
    }
    const keys = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key]) => key);
    const data = [...weeks.entries()].map(([week, row]) => ({
      week,
      ...Object.fromEntries(Object.entries(row).map(([key, value]) => [key, roundChartNumber(value)])),
    }));
    return { keys, data };
  }, [activities]);
  if (data.length < 2 || !keys.length) return <Empty>More activity history is needed for a weekly timeline.</Empty>;
  return <div className="h-64 rounded-[18px] border border-border bg-card p-3"><ResponsiveContainer><BarChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
    <CartesianGrid vertical={false} {...grid} />
    <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} />
    <YAxis tick={axis} tickFormatter={formatChartNumber} axisLine={false} tickLine={false} />
    <Tooltip contentStyle={tooltip} formatter={tooltipFormatter} />
    {keys.map((key, index) => <Bar key={key} dataKey={key} stackId="minutes" fill="hsl(var(--foreground))" fillOpacity={0.18 + index * 0.13} />)}
  </BarChart></ResponsiveContainer></div>;
}

export function PhysiqueChangeChart({ first, latest }: { first?: Record<string, number | null>; latest?: Record<string, number | null> }) {
  if (!first || !latest || first === latest) return <Empty>Two physique check-ins are needed for a change diagram.</Empty>;
  const fields = [['Waist', 'waist_cm'], ['Chest', 'chest_cm'], ['L arm', 'upper_arm_left_cm'], ['R arm', 'upper_arm_right_cm'], ['L calf', 'calf_left_cm'], ['R calf', 'calf_right_cm']] as const;
  const data = fields
    .map(([label, key]) => ({ label, first: first[key], latest: latest[key] }))
    .filter(row => row.first != null && row.latest != null)
    .map(row => ({ ...row, first: roundChartNumber(Number(row.first)), latest: roundChartNumber(Number(row.latest)) }));
  if (data.length < 2) return <Empty>More repeated body measurements are needed for a change diagram.</Empty>;
  return <div className="h-64 rounded-[18px] border border-border bg-card p-3"><ResponsiveContainer><ComposedChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
    <CartesianGrid horizontal={false} {...grid} />
    <XAxis type="number" tick={axis} tickFormatter={formatChartNumber} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
    <YAxis type="category" dataKey="label" tick={axis} axisLine={false} tickLine={false} width={48} />
    <Tooltip contentStyle={tooltip} formatter={tooltipFormatter} />
    <Line dataKey="first" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ r: 4 }} />
    <Line dataKey="latest" stroke="hsl(var(--foreground))" strokeWidth={3} dot={{ r: 5 }} />
  </ComposedChart></ResponsiveContainer></div>;
}

export function RelationshipCharts({ metrics, sets, energy, weightPoints }: { metrics: Array<{ date: string; sleep_hours: number | null }>; sets: Array<{ workout_date?: string | null; actual_weight?: number | null; actual_reps?: number | null }>; energy: Array<{ date: string; intake?: number; expenditure?: number }>; weightPoints: Array<{ date: string; trend: number }> }) {
  const sleepPerformance = useMemo(() => {
    const sleep = new Map(metrics.filter(metric => metric.sleep_hours != null).map(metric => [metric.date, roundChartNumber(Number(metric.sleep_hours))]));
    const volume = new Map<string, number>();
    for (const set of sets) {
      const date = set.workout_date || '';
      if (!date) continue;
      volume.set(date, (volume.get(date) || 0) + Number(set.actual_weight || 0) * Number(set.actual_reps || 0));
    }
    return [...volume.entries()]
      .filter(([date]) => sleep.has(date))
      .map(([date, trainingVolume]) => ({ date, sleep: sleep.get(date), trainingVolume: roundChartNumber(trainingVolume) }));
  }, [metrics, sets]);

  const balanceWeight = useMemo(() => {
    const trend = new Map(weightPoints.map(point => [point.date, point.trend]));
    const sorted = [...weightPoints].sort((a, b) => a.date.localeCompare(b.date));
    const prev = new Map(sorted.slice(1).map((point, index) => [point.date, point.trend - sorted[index].trend]));
    return energy
      .filter(day => day.intake != null && day.expenditure != null && trend.has(day.date) && prev.has(day.date))
      .map(day => ({
        date: day.date,
        balance: roundChartNumber(Number(day.intake) - Number(day.expenditure)),
        weightChange: roundChartNumber(Number(prev.get(day.date))),
      }));
  }, [energy, weightPoints]);

  return <div className="grid gap-4 md:grid-cols-2">
    <div className="rounded-[18px] border border-border bg-card p-3">
      <div className="mb-1 text-sm font-semibold">Sleep vs training volume</div>
      <p className="type-caption mb-2">Association only. Volume is load × reps on matched days.</p>
      <div className="h-52">{sleepPerformance.length >= 3 ? <ResponsiveContainer><ScatterChart margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid {...grid} />
        <XAxis type="number" dataKey="sleep" name="Sleep" unit=" h" tick={axis} tickFormatter={formatChartNumber} />
        <YAxis type="number" dataKey="trainingVolume" name="Training volume" tick={axis} tickFormatter={formatChartNumber} />
        <Tooltip contentStyle={tooltip} formatter={tooltipFormatter} />
        <Scatter data={sleepPerformance} fill="hsl(var(--foreground))" />
      </ScatterChart></ResponsiveContainer> : <Empty>At least three matched sleep and training days are needed.</Empty>}</div>
    </div>
    <div className="rounded-[18px] border border-border bg-card p-3">
      <div className="mb-1 text-sm font-semibold">Energy balance vs weight trend</div>
      <p className="type-caption mb-2">Association only. Missing intake days are excluded.</p>
      <div className="h-52">{balanceWeight.length >= 3 ? <ResponsiveContainer><ScatterChart margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid {...grid} />
        <XAxis type="number" dataKey="balance" name="Energy balance" unit=" kcal" tick={axis} tickFormatter={formatChartNumber} />
        <YAxis type="number" dataKey="weightChange" name="Trend change" unit=" kg" tick={axis} tickFormatter={formatChartNumber} />
        <Tooltip contentStyle={tooltip} formatter={tooltipFormatter} />
        <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
        <Scatter data={balanceWeight} fill="hsl(var(--foreground))" />
      </ScatterChart></ResponsiveContainer> : <Empty>At least three matched energy and bodyweight days are needed.</Empty>}</div>
    </div>
  </div>;
}

export function EventTimeline({ meals, workouts, metrics, readiness }: { meals: Array<{ date: string }>; workouts: Array<{ date: string }>; metrics: Array<{ date: string; bodyweight: number | null; sleep_hours: number | null }>; readiness: Array<{ checkin_date: string }> }) {
  const events = useMemo(() => {
    const counts = new Map<string, { date: string; meals: number; workouts: number; weight: boolean; sleep: boolean; readiness: boolean }>();
    const get = (date: string) => counts.get(date) || { date, meals: 0, workouts: 0, weight: false, sleep: false, readiness: false };
    meals.forEach(item => { const row = get(item.date); row.meals++; counts.set(item.date, row); });
    workouts.forEach(item => { const row = get(item.date); row.workouts++; counts.set(item.date, row); });
    metrics.forEach(item => { const row = get(item.date); row.weight ||= item.bodyweight != null; row.sleep ||= item.sleep_hours != null; counts.set(item.date, row); });
    readiness.forEach(item => { const row = get(item.checkin_date); row.readiness = true; counts.set(item.checkin_date, row); });
    return [...counts.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 24);
  }, [meals, workouts, metrics, readiness]);
  if (!events.length) return <Empty>No events are available in this range.</Empty>;
  return <div className="border-y border-border divide-y divide-border">{events.map(row => <div key={row.date} className="grid grid-cols-[86px_1fr] gap-3 py-3">
    <div className="text-sm font-semibold tabular-nums">{format(parseISO(row.date), 'd MMM')}</div>
    <div className="flex flex-wrap gap-1.5">
      {row.workouts > 0 && <span className="rounded-md bg-energy-soft px-2 py-1 type-meta">Workout</span>}
      {row.meals > 0 && <span className="rounded-md bg-fuel-soft px-2 py-1 type-meta">{row.meals} meal{row.meals === 1 ? '' : 's'}</span>}
      {row.weight && <span className="rounded-md bg-muted px-2 py-1 type-meta">Weight</span>}
      {row.sleep && <span className="rounded-md bg-recover-soft px-2 py-1 type-meta">Sleep</span>}
      {row.readiness && <span className="rounded-md bg-muted px-2 py-1 type-meta">Readiness</span>}
    </div>
  </div>)}</div>;
}
