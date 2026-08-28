import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { format, parseISO } from 'date-fns';
import type { DailyMetric } from '@/hooks/useDailyMetrics';

interface WeightTrendChartProps {
  metrics: DailyMetric[];
  target?: number | null;
}

const chartNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const formatChartNumber = (value: number) => chartNumber.format(value);

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

  const trend = useMemo(() => data.map((row, index) => ({ date: row.date, value: movingAverage(data, index) })), [data]);
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length < 2) {
    return <div className="rounded-[18px] border border-border bg-card p-4 type-caption">Add at least two weigh-ins.</div>;
  }

  const width = 640;
  const height = 210;
  const padX = 20;
  const padY = 20;

  // Scale around the observed weights, not the long-term target. Including a
  // distant goal in the domain compresses the actual trend against one edge of
  // the chart and makes normal day-to-day movement unreadable.
  const observedValues = [...data.map(row => row.value), ...trend.map(row => row.value)];
  const observedMin = Math.min(...observedValues);
  const observedMax = Math.max(...observedValues);
  const observedRange = observedMax - observedMin;
  const visibleRange = Math.max(1.5, observedRange * 1.8);
  const center = (observedMin + observedMax) / 2;
  const low = center - visibleRange / 2;
  const high = center + visibleRange / 2;

  const xFor = (index: number) => padX + index / Math.max(1, data.length - 1) * (width - padX * 2);
  const yFor = (value: number) => padY + (high - value) / Math.max(0.01, high - low) * (height - padY * 2);
  const actualPoints = data.map((row, index) => ({ x: xFor(index), y: yFor(row.value) }));
  const trendPoints = trend.map((row, index) => ({ x: xFor(index), y: yFor(row.value) }));
  const latest = data[data.length - 1];
  const latestTrend = trend[trend.length - 1];
  const firstTrend = trend[0];
  const direction = latestTrend.value < firstTrend.value - 0.05 ? 'down' : latestTrend.value > firstTrend.value + 0.05 ? 'up' : 'stable';
  const active = activeIndex == null ? null : {
    actual: data[activeIndex],
    trend: trend[activeIndex],
    actualPoint: actualPoints[activeIndex],
    trendPoint: trendPoints[activeIndex],
  };

  const indexFromClientX = (clientX: number) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const svgX = (clientX - rect.left) / rect.width * width;
    return nearestWeightPointIndex((svgX - padX) / (width - padX * 2), data.length);
  };

  const inspectPointer = (event: PointerEvent<HTMLDivElement>) => {
    const index = indexFromClientX(event.clientX);
    if (index != null) setActiveIndex(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') return setActiveIndex(null);
    if (event.key === 'Home') return setActiveIndex(0);
    if (event.key === 'End') return setActiveIndex(data.length - 1);
    const current = activeIndex ?? data.length - 1;
    setActiveIndex(event.key === 'ArrowLeft' ? Math.max(0, current - 1) : Math.min(data.length - 1, current + 1));
  };

  const tooltipOnRight = active ? active.trendPoint.x > width * 0.62 : false;

  return <section className="rounded-[20px] border border-border bg-card p-4" aria-label="Bodyweight trend">
    <p className="sr-only">Latest weigh-in {formatChartNumber(latest.value)} kilograms. Seven-day trend {formatChartNumber(latestTrend.value)} kilograms. Trend is {direction} across this range.</p>
    <div ref={chartRef} className="relative cursor-crosshair overflow-visible rounded-xl bg-muted/20 outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ touchAction: 'pan-y' }} tabIndex={0} role="group" aria-label="Interactive bodyweight chart" onPointerMove={inspectPointer} onPointerDown={inspectPointer} onPointerLeave={(event) => { if (event.pointerType !== 'touch') setActiveIndex(null); }} onFocus={() => setActiveIndex(index => index ?? data.length - 1)} onBlur={() => setActiveIndex(null)} onKeyDown={handleKeyDown}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto overflow-visible" role="img" aria-label={`Bodyweight trend ${direction}`}>
        <line x1={padX} y1={yFor(low + (high - low) * .25)} x2={width - padX} y2={yFor(low + (high - low) * .25)} stroke="currentColor" opacity="0.08" />
        <line x1={padX} y1={yFor(low + (high - low) * .75)} x2={width - padX} y2={yFor(low + (high - low) * .75)} stroke="currentColor" opacity="0.08" />
        {target && target >= low && target <= high && <line x1={padX} y1={yFor(target)} x2={width - padX} y2={yFor(target)} stroke="currentColor" opacity="0.28" strokeDasharray="6 5" />}
        <path d={pathFor(actualPoints)} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.38" />
        {actualPoints.map((point, index) => <circle key={data[index].date} cx={point.x} cy={point.y} r={activeIndex === index ? 5 : 3.5} fill="hsl(var(--background))" stroke="currentColor" strokeWidth={activeIndex === index ? 2 : 1.5} opacity={activeIndex == null || activeIndex === index ? 0.75 : 0.45} />)}
        <path d={pathFor(trendPoints)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {trendPoints.map((point, index) => <circle key={`trend-${trend[index].date}`} cx={point.x} cy={point.y} r={activeIndex === index ? 5 : 2.5} fill="currentColor" opacity={activeIndex == null || activeIndex === index ? 1 : 0.72} />)}
        {active && <>
          <line x1={active.trendPoint.x} y1={padY} x2={active.trendPoint.x} y2={height - padY} stroke="currentColor" strokeWidth="1" opacity="0.22" strokeDasharray="3 4" pointerEvents="none" />
          <circle cx={active.trendPoint.x} cy={active.trendPoint.y} r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" pointerEvents="none" />
          <circle cx={active.actualPoint.x} cy={active.actualPoint.y} r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25" pointerEvents="none" />
        </>}
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
      </svg>
      {active && <div className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-xl border border-border bg-popover/95 px-3 py-2 text-popover-foreground shadow-lg backdrop-blur-sm" style={{ left: `${active.trendPoint.x / width * 100}%`, transform: tooltipOnRight ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)' }}>
        <div className="type-meta">{format(parseISO(active.actual.date), 'd MMM yyyy')}</div>
        <div className="mt-1 flex items-baseline justify-between gap-4"><span className="type-caption">Actual</span><span className="text-sm font-semibold tabular-nums">{formatChartNumber(active.actual.value)} kg</span></div>
        <div className="mt-0.5 flex items-baseline justify-between gap-4"><span className="type-caption">Trend</span><span className="text-sm font-semibold tabular-nums">{formatChartNumber(active.trend.value)} kg</span></div>
        {target != null && <div className="mt-0.5 flex items-baseline justify-between gap-4"><span className="type-caption">Target gap</span><span className="text-sm font-semibold tabular-nums">{formatChartNumber(Math.abs(active.trend.value - target))} kg</span></div>}
      </div>}
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-4 type-caption" aria-hidden>
      <span className="flex items-center gap-1.5"><svg width="22" height="8" viewBox="0 0 22 8"><line x1="0" y1="4" x2="22" y2="4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/><circle cx="11" cy="4" r="2.5" fill="currentColor"/></svg>Trend</span>
      <span className="flex items-center gap-1.5 text-muted-foreground"><svg width="22" height="8" viewBox="0 0 22 8"><line x1="0" y1="4" x2="22" y2="4" stroke="currentColor" strokeWidth="1.75" opacity=".55"/><circle cx="11" cy="4" r="3" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="1.5"/></svg>Actual</span>
    </div>
    <div className="mt-2 flex items-center justify-between type-caption tabular-nums"><span>{format(parseISO(data[0].date), 'd MMM')}</span>{target ? <span>Target {formatChartNumber(target)} kg</span> : <span>{data.length} weigh-ins</span>}<span>{format(parseISO(latest.date), 'd MMM')}</span></div>
  </section>;
}
