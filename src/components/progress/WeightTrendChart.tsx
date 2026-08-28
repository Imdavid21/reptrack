import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { format, parseISO } from 'date-fns';
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

export function nearestWeightPointIndex(normalizedPlotX: number, pointCount: number) {
  if (pointCount <= 1) return 0;
  const clamped = Math.max(0, Math.min(1, normalizedPlotX));
  return Math.round(clamped * (pointCount - 1));
}

export function WeightTrendChart({ metrics, target }: WeightTrendChartProps) {
  const data = useMemo(() => metrics
    .filter(metric => Number(metric.bodyweight) > 0)
    .map(metric => ({ date: metric.date, value: Number(metric.bodyweight) }))
    .sort((a, b) => a.date.localeCompare(b.date)), [metrics]);

  const averages = useMemo(() => data.map((row, index) => ({ date: row.date, value: movingAverage(data, index) })), [data]);
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
  const active = activeIndex == null ? null : {
    index: activeIndex,
    raw: data[activeIndex],
    average: averages[activeIndex],
    rawPoint: rawPoints[activeIndex],
    avgPoint: avgPoints[activeIndex],
  };

  const indexFromClientX = (clientX: number) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const svgX = (clientX - rect.left) / rect.width * width;
    const normalizedPlotX = (svgX - padX) / (width - padX * 2);
    return nearestWeightPointIndex(normalizedPlotX, data.length);
  };

  const inspectPointer = (event: PointerEvent<HTMLDivElement>) => {
    const index = indexFromClientX(event.clientX);
    if (index != null) setActiveIndex(index);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') setActiveIndex(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') {
      setActiveIndex(null);
      return;
    }
    if (event.key === 'Home') {
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      setActiveIndex(data.length - 1);
      return;
    }
    const current = activeIndex ?? data.length - 1;
    setActiveIndex(event.key === 'ArrowLeft'
      ? Math.max(0, current - 1)
      : Math.min(data.length - 1, current + 1));
  };

  const tooltipOnRight = active ? active.avgPoint.x > width * 0.62 : false;

  return <section className="rounded-[20px] border border-border bg-card p-4" aria-labelledby="weight-trend-heading">
    <div className="flex items-start justify-between gap-4">
      <div><h2 id="weight-trend-heading" className="text-sm font-semibold">Bodyweight trend</h2><p className="type-caption mt-0.5">7-day average is the primary signal; dots are raw weigh-ins.</p></div>
      <div className="text-right"><div className="text-lg font-semibold tabular-nums">{Number(latestAvg.value.toFixed(2))} kg</div><div className="type-caption">7-day average</div></div>
    </div>
    <p className="sr-only">Latest weigh-in {Number(latest.value.toFixed(2))} kilograms. Seven-day average {Number(latestAvg.value.toFixed(2))} kilograms. Trend is {direction} across this range.</p>
    <div
      ref={chartRef}
      className="relative mt-4 cursor-crosshair overflow-visible rounded-xl bg-muted/20 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-muted/30"
      style={{ touchAction: 'pan-y' }}
      tabIndex={0}
      role="group"
      aria-label="Interactive bodyweight chart. Hover, tap, drag, or use left and right arrow keys to inspect dates."
      onPointerMove={inspectPointer}
      onPointerDown={inspectPointer}
      onPointerLeave={handlePointerLeave}
      onFocus={() => setActiveIndex(index => index ?? data.length - 1)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={handleKeyDown}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto overflow-visible" role="img" aria-label={`Bodyweight trend, ${direction}. Latest seven-day average ${Number(latestAvg.value.toFixed(2))} kilograms.`}>
        <line x1={padX} y1={yFor(low + (high - low) * .25)} x2={width - padX} y2={yFor(low + (high - low) * .25)} stroke="currentColor" opacity="0.08" />
        <line x1={padX} y1={yFor(low + (high - low) * .75)} x2={width - padX} y2={yFor(low + (high - low) * .75)} stroke="currentColor" opacity="0.08" />
        {target && target >= low && target <= high && <line x1={padX} y1={yFor(target)} x2={width - padX} y2={yFor(target)} stroke="currentColor" opacity="0.28" strokeDasharray="6 5" />}
        <path d={pathFor(rawPoints)} fill="none" stroke="currentColor" opacity="0.10" strokeWidth="1" strokeDasharray="2 4" />
        {rawPoints.map((point, index) => <circle key={data[index].date} cx={point.x} cy={point.y} r={activeIndex === index ? 5 : 3.5} fill="hsl(var(--background))" stroke="currentColor" strokeWidth={activeIndex === index ? 2 : 1.5} opacity={activeIndex == null || activeIndex === index ? 0.6 : 0.35} style={{ transition: 'r .15s ease, opacity .15s ease' }} />)}
        <path d={pathFor(avgPoints)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {avgPoints.map((point, index) => <circle key={`avg-${averages[index].date}`} cx={point.x} cy={point.y} r={activeIndex === index ? 5.5 : index === avgPoints.length - 1 ? 4.5 : 2.5} fill="currentColor" style={{ transition: 'r .15s ease' }} />)}
        {active && <>
          <line x1={active.avgPoint.x} y1={padY} x2={active.avgPoint.x} y2={height - padY} stroke="currentColor" strokeWidth="1" opacity="0.22" strokeDasharray="3 4" pointerEvents="none" />
          <circle cx={active.avgPoint.x} cy={active.avgPoint.y} r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" pointerEvents="none" />
          <circle cx={active.rawPoint.x} cy={active.rawPoint.y} r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 3" pointerEvents="none" />
        </>}
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
      </svg>
      {active && <div
        className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-xl border border-border bg-popover/95 px-3 py-2 text-popover-foreground shadow-lg backdrop-blur-sm"
        style={{
          left: `${active.avgPoint.x / width * 100}%`,
          transform: tooltipOnRight ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
        }}
      >
        <div className="type-meta">{format(parseISO(active.raw.date), 'd MMM yyyy')}</div>
        <div className="mt-1 flex items-baseline justify-between gap-4"><span className="type-caption">7-day avg</span><span className="text-sm font-semibold tabular-nums">{active.average.value.toFixed(2)} kg</span></div>
        <div className="mt-0.5 flex items-baseline justify-between gap-4"><span className="type-caption">Weigh-in</span><span className="text-sm font-semibold tabular-nums">{active.raw.value.toFixed(2)} kg</span></div>
        {target != null && <div className="mt-0.5 flex items-baseline justify-between gap-4"><span className="type-caption">To target</span><span className="text-sm font-semibold tabular-nums">{Math.abs(active.average.value - target).toFixed(2)} kg</span></div>}
      </div>}
    </div>
    <div className="mt-3 flex items-center gap-4 type-caption" aria-hidden>
      <span className="flex items-center gap-1.5"><svg width="18" height="6" viewBox="0 0 18 6"><line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" /></svg>7-day average</span>
      <span className="flex items-center gap-1.5 text-muted-foreground"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="1.5" /></svg>Weigh-in</span>
      <span className="ml-auto hidden sm:inline text-muted-foreground">Hover or drag to inspect</span>
    </div>
    <div className="mt-2 flex items-center justify-between type-caption tabular-nums"><span>{data[0].date}</span>{target ? <span>Target {Number(target.toFixed(2))} kg</span> : <span>{data.length} weigh-ins</span>}<span>{latest.date}</span></div>
  </section>;
}
