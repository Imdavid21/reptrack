import { useMemo } from 'react';
import type { DailyMetric } from '@/hooks/useDailyMetrics';

interface WeightTrendChartProps {
  metrics: DailyMetric[];
  target?: number | null;
}

function movingAverage(rows: Array<{ date: string; value: number }>, index: number) {
  const date = new Date(`${rows[index].date}T12:00:00`).getTime();
  const recent = rows.filter((row, rowIndex) => rowIndex <= index && date - new Date(`${row.date}T12:00:00`).getTime() <= 6 * 86_400_000);
  return recent.reduce((sum, row) => sum + row.value, 0) / recent.length;
}

function pathFor(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

export function WeightTrendChart({ metrics, target }: WeightTrendChartProps) {
  const data = useMemo(() => metrics
    .filter(metric => Number(metric.bodyweight) > 0)
    .map(metric => ({ date: metric.date, value: Number(metric.bodyweight) }))
    .sort((a, b) => a.date.localeCompare(b.date)), [metrics]);

  const averages = useMemo(() => data.map((row, index) => ({ date: row.date, value: movingAverage(data, index) })), [data]);

  if (data.length < 2) {
    return <div className="rounded-[18px] border border-border bg-card p-4"><div className="text-sm font-semibold">Bodyweight trend</div><p className="type-supporting mt-1">Add at least two weigh-ins to draw a useful trend.</p></div>;
  }

  const width = 640;
  const height = 210;
  const padX = 20;
  const padY = 20;
  const values = [...data.map(row => row.value), ...averages.map(row => row.value), ...(target ? [target] : [])];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.6, max - min);
  const low = min - span * 0.12;
  const high = max + span * 0.12;
  const xFor = (index: number) => padX + index / Math.max(1, data.length - 1) * (width - padX * 2);
  const yFor = (value: number) => padY + (high - value) / Math.max(0.01, high - low) * (height - padY * 2);
  const rawPoints = data.map((row, index) => ({ x: xFor(index), y: yFor(row.value) }));
  const avgPoints = averages.map((row, index) => ({ x: xFor(index), y: yFor(row.value) }));
  const latest = data[data.length - 1];
  const latestAvg = averages[averages.length - 1];
  const firstAvg = averages[0];
  const direction = latestAvg.value < firstAvg.value - 0.05 ? 'down' : latestAvg.value > firstAvg.value + 0.05 ? 'up' : 'stable';

  return <section className="rounded-[20px] border border-border bg-card p-4" aria-labelledby="weight-trend-heading">
    <div className="flex items-start justify-between gap-4">
      <div><h2 id="weight-trend-heading" className="text-sm font-semibold">Bodyweight trend</h2><p className="type-caption mt-0.5">7-day average is the primary signal; dots are raw weigh-ins.</p></div>
      <div className="text-right"><div className="text-lg font-semibold tabular-nums">{Number(latestAvg.value.toFixed(2))} kg</div><div className="type-caption">7-day average</div></div>
    </div>
    <p className="sr-only">Latest weigh-in {Number(latest.value.toFixed(2))} kilograms. Seven-day average {Number(latestAvg.value.toFixed(2))} kilograms. Trend is {direction} across this range.</p>
    <div className="mt-4 overflow-hidden rounded-xl bg-muted/20">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={`Bodyweight trend, ${direction}. Latest seven-day average ${Number(latestAvg.value.toFixed(2))} kilograms.`}>
        <line x1={padX} y1={yFor(low + (high - low) * .25)} x2={width - padX} y2={yFor(low + (high - low) * .25)} stroke="currentColor" opacity="0.08" />
        <line x1={padX} y1={yFor(low + (high - low) * .75)} x2={width - padX} y2={yFor(low + (high - low) * .75)} stroke="currentColor" opacity="0.08" />
        {target && target >= low && target <= high && <line x1={padX} y1={yFor(target)} x2={width - padX} y2={yFor(target)} stroke="currentColor" opacity="0.28" strokeDasharray="6 5" />}
        <path d={pathFor(rawPoints)} fill="none" stroke="currentColor" opacity="0.16" strokeWidth="1.5" />
        {rawPoints.map((point, index) => <circle key={data[index].date} cx={point.x} cy={point.y} r="3" fill="currentColor" opacity="0.28"><title>{data[index].date}: {data[index].value.toFixed(2)} kg</title></circle>)}
        <path d={pathFor(avgPoints)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {avgPoints.map((point, index) => <circle key={`avg-${averages[index].date}`} cx={point.x} cy={point.y} r={index === avgPoints.length - 1 ? 4 : 2.5} fill="currentColor"><title>{averages[index].date}: 7-day average {averages[index].value.toFixed(2)} kg</title></circle>)}
      </svg>
    </div>
    <div className="mt-2 flex items-center justify-between type-caption tabular-nums"><span>{data[0].date}</span>{target ? <span>Target {Number(target.toFixed(2))} kg</span> : <span>{data.length} weigh-ins</span>}<span>{latest.date}</span></div>
  </section>;
}
