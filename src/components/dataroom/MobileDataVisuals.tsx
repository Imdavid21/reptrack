import { ReactNode, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

type DataTone = 'neutral' | 'training' | 'nutrition' | 'recovery' | 'activity';

type TimelineTrack = {
  label: string;
  values: Array<{ date: string; value: number | null }>;
  unit?: string;
  tone?: DataTone;
  formatValue?: (value: number) => string;
};

const toneColor = (tone: DataTone = 'neutral') => {
  if (tone === 'training') return 'hsl(var(--energy))';
  if (tone === 'nutrition') return 'hsl(var(--fuel))';
  if (tone === 'recovery') return 'hsl(var(--recover))';
  return 'hsl(var(--foreground))';
};

const formatNumber = (value: number, maximumFractionDigits = 1) => value.toLocaleString(undefined, { maximumFractionDigits });

export function VisualSection({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section>
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="type-eyebrow">{eyebrow}</div>}
        <h2 className="type-section-title mt-1">{title}</h2>
        {description && <p className="type-caption mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>;
}

export function DataInspector({ label, items }: { label?: string; items: Array<{ label: string; value: string }> }) {
  return <div className="flex min-h-11 items-end justify-between gap-4 border-b border-border pb-2" aria-live="polite">
    <div className="min-w-0">{label && <div className="type-meta">{label}</div>}</div>
    <div className="flex min-w-0 gap-4 overflow-x-auto text-right [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(item => <div key={item.label} className="shrink-0"><div className="type-meta">{item.label}</div><div className="text-sm font-semibold tabular-nums">{item.value}</div></div>)}
    </div>
  </div>;
}

export function MiniSparkline({ values, className, tone = 'neutral' }: { values: Array<number | null>; className?: string; tone?: DataTone }) {
  const numeric = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (numeric.length < 2) return <div className={cn('h-8 border-b border-dashed border-border', className)} />;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const span = max - min || 1;
  const segments: string[][] = [];
  let segment: string[] = [];
  values.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) {
      if (segment.length) segments.push(segment);
      segment = [];
      return;
    }
    segment.push(`${values.length === 1 ? 50 : index / (values.length - 1) * 100},${28 - (value - min) / span * 24}`);
  });
  if (segment.length) segments.push(segment);
  return <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn('h-8 w-full', className)} aria-hidden style={{ color: toneColor(tone) }}>
    {segments.map((points, index) => <polyline key={index} points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
  </svg>;
}

export function TrajectoryRail({ cards }: { cards: Array<{ label: string; value: string; detail: string; values: Array<number | null>; tone?: DataTone; onClick?: () => void }> }) {
  return <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {cards.map(card => <button key={card.label} onClick={card.onClick} className="w-36 min-h-28 shrink-0 snap-start border-b border-border px-1 py-3 text-left active:scale-[.985] transition-transform">
      <div className="type-meta">{card.label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{card.value}</div>
      <div className="type-caption mt-0.5 truncate">{card.detail}</div>
      <div className="mt-2"><MiniSparkline values={card.values} tone={card.tone} /></div>
    </button>)}
  </div>;
}

export function TimelineTracks({ tracks, onDateOpen }: { tracks: TimelineTrack[]; onDateOpen?: (date: string) => void }) {
  const dates = useMemo(() => {
    const set = new Set<string>();
    tracks.forEach(track => track.values.forEach(point => set.add(point.date)));
    return [...set].sort();
  }, [tracks]);
  const [selected, setSelected] = useState(Math.max(0, dates.length - 1));
  const wrapRef = useRef<HTMLDivElement>(null);
  const bucketSize = Math.max(1, Math.ceil(dates.length / 60));
  const buckets = useMemo(() => Array.from({ length: Math.ceil(dates.length / bucketSize) }, (_, index) => dates.slice(index * bucketSize, (index + 1) * bucketSize)), [dates, bucketSize]);

  const selectFromPointer = (clientX: number) => {
    const node = wrapRef.current;
    if (!node || dates.length === 0) return;
    const rect = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    setSelected(Math.round((x / Math.max(rect.width, 1)) * (dates.length - 1)));
  };

  const selectedDate = dates[selected];
  const selectedItems = tracks.map(track => {
    const value = track.values.find(point => point.date === selectedDate)?.value;
    const rendered = value == null ? '—' : track.formatValue ? track.formatValue(value) : `${formatNumber(value)}${track.unit ? ` ${track.unit}` : ''}`;
    return { label: track.label, value: rendered };
  });
  const ariaValue = selectedDate ? `${format(parseISO(selectedDate), 'd MMM yyyy')}. ${selectedItems.map(item => `${item.label} ${item.value}`).join('. ')}` : 'No selected date';

  if (!dates.length) return <div className="border-y border-border py-8 text-center type-caption">No timeline evidence in this range.</div>;

  return <div className="space-y-2">
    <DataInspector label={selectedDate ? format(parseISO(selectedDate), 'EEE, d MMM') : undefined} items={selectedItems} />
    <div
      ref={wrapRef}
      className="relative min-h-48 select-none py-3 touch-pan-y"
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); selectFromPointer(event.clientX); }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) selectFromPointer(event.clientX); }}
      role="slider"
      aria-label="Inspect Dataroom dates"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, dates.length - 1)}
      aria-valuenow={selected}
      aria-valuetext={ariaValue}
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') setSelected(value => Math.max(0, value - 1));
        if (event.key === 'ArrowRight') setSelected(value => Math.min(dates.length - 1, value + 1));
      }}
    >
      <div className="pointer-events-none absolute inset-y-2 w-px bg-foreground/55" style={{ left: `${(selected / Math.max(1, dates.length - 1)) * 100}%` }} />
      <div className="space-y-2">
        {tracks.map(track => {
          const indexed = new Map(track.values.map(point => [point.date, point.value]));
          return <div key={track.label} className="grid min-h-7 grid-cols-[58px_1fr] items-center gap-2">
            <div className="type-meta truncate">{track.label}</div>
            <div className="flex h-5 items-center gap-px" style={{ color: toneColor(track.tone) }}>
              {buckets.map((bucket, index) => {
                const observed = bucket.some(date => indexed.get(date) != null);
                return <span key={`${track.label}-${index}`} className={cn('h-1.5 min-w-px flex-1 rounded-full', observed ? 'bg-current' : 'bg-border')} />;
              })}
            </div>
          </div>;
        })}
      </div>
      <div className="mt-3 flex justify-between pl-[66px] type-meta"><span>{format(parseISO(dates[0]), 'd MMM')}</span><span>{format(parseISO(dates.at(-1)!), 'd MMM')}</span></div>
    </div>
    {onDateOpen && selectedDate && <button className="min-h-11 w-full text-sm font-semibold text-left" onClick={() => onDateOpen(selectedDate)}>Open {format(parseISO(selectedDate), 'd MMM')} details</button>}
  </div>;
}

export function EvidenceMatrix({ dates, rows, onSelect }: { dates: string[]; rows: Array<{ label: string; observed: Set<string> }>; onSelect?: (date: string, row: string) => void }) {
  const bucketSize = Math.max(1, Math.ceil(dates.length / 31));
  const buckets = useMemo(() => Array.from({ length: Math.ceil(dates.length / bucketSize) }, (_, index) => dates.slice(index * bucketSize, (index + 1) * bucketSize)), [dates, bucketSize]);
  if (!dates.length) return null;
  return <div className="border-y border-border py-2">
    <div className="space-y-1">
      {rows.map(row => <button
        key={row.label}
        type="button"
        className="grid min-h-11 w-full grid-cols-[64px_1fr] items-center gap-2 text-left"
        aria-label={`${row.label} evidence. ${row.observed.size} recorded observations in this range.`}
        onClick={event => {
          if (!onSelect || !buckets.length) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const gridStart = 72;
          const x = Math.max(0, Math.min(rect.width - gridStart, event.clientX - rect.left - gridStart));
          const index = Math.min(buckets.length - 1, Math.floor((x / Math.max(1, rect.width - gridStart)) * buckets.length));
          const bucket = buckets[index] || [];
          const date = bucket.find(item => row.observed.has(item)) || bucket[Math.floor(bucket.length / 2)];
          if (date) onSelect(date, row.label);
        }}
      >
        <span className="type-meta truncate">{row.label}</span>
        <span className="grid gap-1" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(3px, 1fr))` }} aria-hidden>
          {buckets.map((bucket, index) => <span key={index} className={cn('aspect-square max-h-3 min-h-1 rounded-[2px] border', bucket.some(date => row.observed.has(date)) ? 'bg-foreground border-foreground' : 'bg-transparent border-border')} />)}
        </span>
      </button>)}
    </div>
    <div className="mt-1 flex justify-between pl-[72px] type-meta"><span>{format(parseISO(dates[0]), 'd MMM')}</span><span>{format(parseISO(dates.at(-1)!), 'd MMM')}</span></div>
  </div>;
}

export function DumbbellMetric({ label, previous, current, formatValue }: { label: string; previous: number | null; current: number | null; formatValue: (value: number) => string }) {
  const delta = previous != null && current != null ? current - previous : null;
  return <div className="border-t border-border pt-3">
    <div className="type-meta">{label}</div>
    <div className="mt-1 text-xl font-semibold tabular-nums">{current == null ? '—' : formatValue(current)}</div>
    <div className="type-caption mt-1 tabular-nums">{delta == null ? 'No comparable previous value' : `Change ${delta > 0 ? '+' : ''}${formatValue(delta)} · previous ${formatValue(previous!)}`}</div>
  </div>;
}

type TrendLine = { key: string; label: string; stroke?: string; width?: number; dashed?: boolean; suffix?: string; tone?: DataTone; formatValue?: (value: number) => string };

export function TrendLineChart({ data, lines, reference, height = 236, inspectorLabel, summary }: { data: Array<Record<string, string | number | null>>; lines: TrendLine[]; reference?: { value: number; label?: string }; height?: number; inspectorLabel?: string; summary?: string }) {
  const [index, setIndex] = useState(Math.max(0, data.length - 1));
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = data[index];
  const dateKey = typeof selected?.date === 'string' ? selected.date : undefined;
  const renderValue = (line: TrendLine, value: unknown) => value == null ? '—' : line.formatValue ? line.formatValue(Number(value)) : `${formatNumber(Number(value), 2)}${line.suffix || ''}`;
  const select = (clientX: number) => {
    const node = wrapRef.current;
    if (!node || data.length === 0) return;
    const rect = node.getBoundingClientRect();
    const normalized = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1)));
    setIndex(Math.round(normalized * (data.length - 1)));
  };
  if (!data.length) return <div className="border-y border-border py-8 text-center type-caption">Not enough data in this range.</div>;
  const ariaSummary = summary || `${lines.map(line => line.label).join(' and ')} across ${data.length} recorded points.`;
  return <div className="space-y-1">
    <p className="sr-only">{ariaSummary}</p>
    <DataInspector label={dateKey ? format(parseISO(dateKey), 'EEE, d MMM') : inspectorLabel} items={lines.map(line => ({ label: line.label, value: renderValue(line, selected?.[line.key]) }))} />
    <div ref={wrapRef} className="relative touch-pan-y" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); select(event.clientX); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) select(event.clientX); }} role="slider" aria-label={ariaSummary} aria-valuemin={0} aria-valuemax={Math.max(0, data.length - 1)} aria-valuenow={index} aria-valuetext={`${dateKey || inspectorLabel || 'Selected point'}. ${lines.map(line => `${line.label} ${renderValue(line, selected?.[line.key])}`).join('. ')}`} tabIndex={0} onKeyDown={event => { if (event.key === 'ArrowLeft') setIndex(value => Math.max(0, value - 1)); if (event.key === 'ArrowRight') setIndex(value => Math.min(data.length - 1, value + 1)); }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.45} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={42} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis width={38} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['auto', 'auto']} />
          {reference && <ReferenceLine y={reference.value} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={reference.label ? { value: reference.label, fontSize: 10, fill: 'hsl(var(--muted-foreground))' } : undefined} />}
          {lines.map((line, lineIndex) => <Line key={line.key} type="linear" dataKey={line.key} connectNulls={false} stroke={line.stroke || toneColor(line.tone || (lineIndex === 0 ? 'neutral' : 'activity'))} strokeOpacity={lineIndex === 0 ? 1 : 0.42} strokeWidth={line.width || (lineIndex === 0 ? 2.5 : 1.25)} strokeDasharray={line.dashed ? '4 4' : undefined} dot={lineIndex === 0 ? { r: 2.5, fill: line.stroke || toneColor(line.tone) } : false} activeDot={false} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-y-3 w-px bg-foreground/45" style={{ left: `${index / Math.max(1, data.length - 1) * 100}%` }} />
    </div>
    <table className="sr-only"><caption>{ariaSummary}</caption><thead><tr><th>Date</th>{lines.map(line => <th key={line.key}>{line.label}</th>)}</tr></thead><tbody>{data.map((row, rowIndex) => <tr key={rowIndex}><td>{String(row.date || row.label || rowIndex)}</td>{lines.map(line => <td key={line.key}>{renderValue(line, row[line.key])}</td>)}</tr>)}</tbody></table>
  </div>;
}

export function DailyBars({ data, valueKey, label, goal, suffix = '', height = 210, tone = 'neutral' }: { data: Array<{ date: string; label: string; [key: string]: string | number | null }>; valueKey: string; label: string; goal?: number | null; suffix?: string; height?: number; tone?: DataTone }) {
  const [index, setIndex] = useState(Math.max(0, data.length - 1));
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = data[index];
  const select = (clientX: number) => {
    const node = wrapRef.current;
    if (!node || !data.length) return;
    const rect = node.getBoundingClientRect();
    setIndex(Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width))) * (data.length - 1)));
  };
  const selectedValue = selected?.[valueKey] == null ? '—' : `${Math.round(Number(selected[valueKey])).toLocaleString()}${suffix}`;
  return <div className="space-y-1">
    <DataInspector label={selected?.date ? format(parseISO(selected.date), 'EEE, d MMM') : undefined} items={[{ label, value: selectedValue }]} />
    <div ref={wrapRef} className="touch-pan-y" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); select(event.clientX); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) select(event.clientX); }} role="slider" aria-label={`${label} by day`} aria-valuemin={0} aria-valuemax={Math.max(0, data.length - 1)} aria-valuenow={index} aria-valuetext={`${selected?.date || ''}. ${label} ${selectedValue}`} tabIndex={0} onKeyDown={event => { if (event.key === 'ArrowLeft') setIndex(value => Math.max(0, value - 1)); if (event.key === 'ArrowRight') setIndex(value => Math.min(data.length - 1, value + 1)); }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={34} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis width={42} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          {goal != null && goal > 0 && <ReferenceLine y={goal} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />}
          <Bar dataKey={valueKey} fill={toneColor(tone)} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <table className="sr-only"><caption>{label} by recorded day</caption><thead><tr><th>Date</th><th>{label}</th></tr></thead><tbody>{data.map(row => <tr key={row.date}><td>{row.date}</td><td>{row[valueKey] == null ? 'No record' : `${row[valueKey]}${suffix}`}</td></tr>)}</tbody></table>
  </div>;
}

export function BodyMeasurementMap({ measurements, onSelect }: { measurements: Array<{ key: string; label: string; value: number | null; delta?: number | null }>; onSelect?: (key: string) => void }) {
  const byKey = new Map(measurements.map(item => [item.key, item]));
  const Item = ({ id, className }: { id: string; className: string }) => {
    const item = byKey.get(id);
    if (!item) return null;
    return <button onClick={() => onSelect?.(id)} className={cn('absolute min-h-11 min-w-[96px] rounded-lg border border-border bg-background px-2.5 py-1.5 text-left', className)}>
      <div className="type-meta">{item.label}</div><div className="text-sm font-semibold tabular-nums">{item.value == null ? '—' : `${item.value} cm`}</div>{item.delta != null && <div className="type-meta tabular-nums">{item.delta > 0 ? '+' : ''}{item.delta} cm</div>}
    </button>;
  };
  return <div className="relative mx-auto h-[390px] max-w-[360px] overflow-hidden">
    <svg viewBox="0 0 180 360" className="absolute inset-0 h-full w-full text-muted-foreground/20" aria-hidden><circle cx="90" cy="38" r="24" fill="currentColor" /><path d="M64 68 C70 60,110 60,116 68 L126 164 C120 185,112 204,108 225 L120 335 H96 L90 238 L84 335 H60 L72 225 C68 204,60 185,54 164 Z" fill="currentColor" /><path d="M58 82 L26 170 L40 178 L72 103 Z" fill="currentColor" /><path d="M122 82 L154 170 L140 178 L108 103 Z" fill="currentColor" /></svg>
    <Item id="chest" className="left-1/2 top-[84px] -translate-x-1/2" /><Item id="leftArm" className="left-1 top-[140px]" /><Item id="rightArm" className="right-1 top-[140px]" /><Item id="waist" className="left-1/2 top-[198px] -translate-x-1/2" /><Item id="leftCalf" className="left-1 bottom-4" /><Item id="rightCalf" className="right-1 bottom-4" />
  </div>;
}

function muscleBucket(name: string) {
  const n = name.toLowerCase();
  if (n.includes('chest') || n.includes('pec')) return 'chest';
  if (n.includes('lat') || n.includes('back')) return 'back';
  if (n.includes('delt') || n.includes('shoulder')) return 'shoulders';
  if (n.includes('bicep') || n.includes('tricep') || n.includes('arm')) return 'arms';
  if (n.includes('quad')) return 'quads';
  if (n.includes('ham')) return 'hamstrings';
  if (n.includes('glute')) return 'glutes';
  if (n.includes('calf')) return 'calves';
  if (n.includes('core') || n.includes('ab')) return 'core';
  return 'other';
}

export function MuscleMap({ muscles, onSelect }: { muscles: Array<{ muscle: string; setsPerWeek: number }>; onSelect?: (muscle: string) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    muscles.forEach(item => { const key = muscleBucket(item.muscle); map.set(key, (map.get(key) || 0) + item.setsPerWeek); });
    return map;
  }, [muscles]);
  const max = Math.max(1, ...grouped.values());
  const opacity = (key: string) => 0.12 + ((grouped.get(key) || 0) / max) * 0.78;
  const Region = ({ keyName, x, y, w, h, rx = 8 }: { keyName: string; x: number; y: number; w: number; h: number; rx?: number }) => <rect x={x} y={y} width={w} height={h} rx={rx} fill="currentColor" opacity={opacity(keyName)} />;
  const Figure = ({ back = false }: { back?: boolean }) => <svg viewBox="0 0 170 320" className="h-[250px] w-full text-energy" aria-hidden>
    <circle cx="85" cy="27" r="19" fill="hsl(var(--muted))" />
    <path d="M52 54 C62 44,108 44,118 54 L126 164 L110 174 L116 310 H92 L85 194 L78 310 H54 L60 174 L44 164 Z" fill="hsl(var(--muted))" />
    <Region keyName="shoulders" x={45} y={52} w={80} h={28} rx={14} />
    {!back && <><Region keyName="chest" x={57} y={68} w={56} h={42} /><Region keyName="core" x={61} y={112} w={48} h={56} /><Region keyName="quads" x={55} y={176} w={28} h={84} rx={12} /><Region keyName="quads" x={87} y={176} w={28} h={84} rx={12} /></>}
    {back && <><Region keyName="back" x={55} y={68} w={60} h={78} /><Region keyName="glutes" x={58} y={150} w={54} h={40} /><Region keyName="hamstrings" x={55} y={190} w={28} h={72} rx={12} /><Region keyName="hamstrings" x={87} y={190} w={28} h={72} rx={12} /></>}
    <Region keyName="arms" x={25} y={63} w={27} h={105} rx={13} /><Region keyName="arms" x={118} y={63} w={27} h={105} rx={13} /><Region keyName="calves" x={57} y={264} w={22} h={48} rx={10} /><Region keyName="calves" x={91} y={264} w={22} h={48} rx={10} />
  </svg>;
  const rows = [...grouped.entries()].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  return <div>
    <div className="grid grid-cols-2 gap-2"><div><div className="type-meta text-center">Front</div><Figure /></div><div><div className="type-meta text-center">Back</div><Figure back /></div></div>
    <div className="mt-2 grid grid-cols-2 gap-x-3">{rows.map(([label, value]) => <button key={label} onClick={() => onSelect?.(label)} className="min-h-11 border-t border-border py-2 text-left"><span className="flex items-baseline justify-between gap-2"><span className="text-sm font-semibold capitalize">{label}</span><span className="type-caption tabular-nums">{value.toFixed(1)}/wk</span></span></button>)}</div>
  </div>;
}

export function BulletRows({ rows, tone = 'training' }: { rows: Array<{ label: string; value: number; low?: number; high?: number; detail?: string }>; tone?: DataTone }) {
  const ceiling = Math.max(1, ...rows.map(row => Math.max(row.high || 0, row.value))) * 1.1;
  return <div className="space-y-4">
    {rows.map(row => {
      const valueLeft = Math.min(100, row.value / ceiling * 100);
      const low = row.low == null ? null : row.low / ceiling * 100;
      const high = row.high == null ? null : row.high / ceiling * 100;
      return <div key={row.label}>
        <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-sm font-semibold capitalize">{row.label}</span><span className="type-caption tabular-nums">{row.value.toFixed(1)}{row.detail ? ` · ${row.detail}` : ''}</span></div>
        <div className="relative h-3 rounded-full bg-muted">
          {low != null && high != null && <span className="absolute inset-y-0 rounded-full bg-muted-foreground/20" style={{ left: `${Math.min(100, low)}%`, width: `${Math.max(2, Math.min(100, high) - Math.min(100, low))}%` }} />}
          <span className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${valueLeft}%`, background: toneColor(tone) }} />
        </div>
      </div>;
    })}
  </div>;
}

export function MatrixRows({ columns, rows, tone = 'training' }: { columns: string[]; rows: Array<{ label: string; values: Array<number | null> }>; tone?: DataTone }) {
  const max = Math.max(1, ...rows.flatMap(row => row.values.filter((value): value is number => value != null)));
  return <div className="overflow-x-auto border-y border-border"><div className="min-w-[360px] py-3"><div className="grid grid-cols-[88px_repeat(var(--cols),1fr)] gap-1" style={{ ['--cols' as string]: columns.length }}><div />{columns.map(column => <div key={column} className="type-meta text-center">{column}</div>)}{rows.map(row => <div key={row.label} className="contents"><div className="type-meta self-center truncate">{row.label}</div>{row.values.map((value, index) => <div key={`${row.label}-${index}`} className="aspect-square rounded-sm border border-border" style={{ background: value == null ? 'transparent' : `color-mix(in srgb, ${toneColor(tone)} ${Math.round((0.18 + value / max * 0.72) * 100)}%, transparent)` }} title={value == null ? 'No data' : String(value)} />)}</div>)}</div></div></div>;
}

export function ActivityBars({ rows }: { rows: Array<{ label: string; value: number; detail?: string }> }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <div className="space-y-3">{rows.map(row => <div key={row.label}><div className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold capitalize">{row.label}</span><span className="text-sm font-semibold tabular-nums">{Math.round(row.value)} min</span></div><div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(3, row.value / max * 100)}%` }} /></div>{row.detail && <div className="type-caption mt-1">{row.detail}</div>}</div>)}</div>;
}

export function SymmetryGauge({ label, left, right, unit = '' }: { label: string; left: number | null; right: number | null; unit?: string }) {
  const max = Math.max(1, left || 0, right || 0) * 1.1;
  const delta = left != null && right != null ? Math.abs(left - right) : null;
  return <div className="border-t border-border pt-3"><div className="text-sm font-semibold">{label}</div><div className="mt-3 space-y-2">{[['Left', left], ['Right', right]].map(([side, raw]) => { const value = raw as number | null; return <div key={String(side)} className="grid grid-cols-[42px_1fr_58px] items-center gap-2"><span className="type-meta">{side}</span><span className="h-2 rounded-full bg-muted overflow-hidden"><span className="block h-full rounded-full bg-foreground" style={{ width: value == null ? '0%' : `${Math.min(100, value / max * 100)}%` }} /></span><span className="text-right text-xs font-semibold tabular-nums">{value == null ? '—' : `${value}${unit}`}</span></div>; })}</div><div className="type-caption mt-2">{delta == null ? 'Both sides are needed for comparison' : `Difference ${Number(delta.toFixed(1))}${unit}`}</div></div>;
}
