import { ReactNode, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

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
  return <div className="min-h-16 rounded-2xl border border-border bg-card px-3 py-2.5" aria-live="polite">
    {label && <div className="type-meta mb-1">{label}</div>}
    <div className="flex gap-4 overflow-x-auto pb-0.5">
      {items.map(item => <div key={item.label} className="shrink-0"><div className="type-meta">{item.label}</div><div className="text-sm font-semibold tabular-nums">{item.value}</div></div>)}
    </div>
  </div>;
}

export function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className={cn('h-8 border-b border-dashed border-border', className)} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => `${index / (values.length - 1) * 100},${28 - (value - min) / span * 24}`).join(' ');
  return <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn('h-8 w-full', className)} aria-hidden>
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
  </svg>;
}

export function TrajectoryRail({ cards }: { cards: Array<{ label: string; value: string; detail: string; values: number[]; onClick?: () => void }> }) {
  return <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {cards.map(card => <button key={card.label} onClick={card.onClick} className="w-36 shrink-0 snap-start rounded-2xl border border-border bg-card p-3 text-left active:scale-[.985] transition-transform">
      <div className="type-meta">{card.label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{card.value}</div>
      <div className="type-caption mt-0.5 truncate">{card.detail}</div>
      <div className="mt-2 text-foreground/80"><MiniSparkline values={card.values} /></div>
    </button>)}
  </div>;
}

type TimelineTrack = { label: string; values: Array<{ date: string; value: number | null }> };

export function TimelineTracks({ tracks, onDateOpen }: { tracks: TimelineTrack[]; onDateOpen?: (date: string) => void }) {
  const dates = useMemo(() => {
    const set = new Set<string>();
    tracks.forEach(track => track.values.forEach(point => set.add(point.date)));
    return [...set].sort();
  }, [tracks]);
  const [selected, setSelected] = useState(Math.max(0, dates.length - 1));
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectFromPointer = (clientX: number) => {
    const node = wrapRef.current;
    if (!node || dates.length === 0) return;
    const rect = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const next = Math.round((x / Math.max(rect.width, 1)) * (dates.length - 1));
    setSelected(next);
  };

  const selectedDate = dates[selected];
  const selectedItems = tracks.map(track => {
    const value = track.values.find(point => point.date === selectedDate)?.value;
    return { label: track.label, value: value == null ? '—' : Number(value.toFixed(1)).toLocaleString() };
  });

  if (!dates.length) return <div className="rounded-2xl border border-border py-8 text-center type-caption">No timeline evidence in this range.</div>;

  return <div className="space-y-2">
    <DataInspector label={selectedDate ? format(parseISO(selectedDate), 'EEE, d MMM') : undefined} items={selectedItems} />
    <div
      ref={wrapRef}
      className="relative rounded-2xl border border-border bg-card px-2 py-3 select-none touch-pan-y"
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); selectFromPointer(event.clientX); }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) selectFromPointer(event.clientX); }}
      onPointerUp={() => selectedDate && onDateOpen?.(selectedDate)}
      role="slider"
      aria-label="Inspect Dataroom timeline"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, dates.length - 1)}
      aria-valuenow={selected}
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') setSelected(value => Math.max(0, value - 1));
        if (event.key === 'ArrowRight') setSelected(value => Math.min(dates.length - 1, value + 1));
      }}
    >
      <div className="pointer-events-none absolute inset-y-2 w-px bg-foreground/50" style={{ left: `calc(8px + ${(selected / Math.max(1, dates.length - 1)) * 100}% * ((100% - 16px) / 100))` }} />
      <div className="space-y-2.5">
        {tracks.map(track => {
          const indexed = new Map(track.values.map(point => [point.date, point.value]));
          const vals = dates.map(date => indexed.get(date) ?? null);
          const numeric = vals.filter((value): value is number => value != null);
          const min = numeric.length ? Math.min(...numeric) : 0;
          const max = numeric.length ? Math.max(...numeric) : 1;
          const span = max - min || 1;
          return <div key={track.label} className="grid grid-cols-[52px_1fr] items-center gap-2">
            <div className="type-meta truncate">{track.label}</div>
            <div className="flex h-7 items-end gap-px">
              {vals.map((value, index) => <span key={`${track.label}-${dates[index]}`} className={cn('min-w-px flex-1 rounded-t-sm', value == null ? 'bg-transparent border-b border-dashed border-border' : 'bg-foreground/55', index === selected && value != null && 'bg-foreground')} style={{ height: value == null ? 2 : `${Math.max(14, 22 + ((value - min) / span) * 78)}%` }} />)}
            </div>
          </div>;
        })}
      </div>
      <div className="mt-3 flex justify-between px-[54px] type-meta"><span>{format(parseISO(dates[0]), 'd MMM')}</span><span>{format(parseISO(dates.at(-1)!), 'd MMM')}</span></div>
    </div>
  </div>;
}

export function EvidenceMatrix({ dates, rows, onSelect }: { dates: string[]; rows: Array<{ label: string; observed: Set<string> }>; onSelect?: (date: string, row: string) => void }) {
  const shownDates = dates.length > 31 ? dates.filter((_, index) => index % Math.ceil(dates.length / 31) === 0 || index === dates.length - 1) : dates;
  return <div className="rounded-2xl border border-border bg-card p-3 overflow-hidden">
    <div className="space-y-2.5">
      {rows.map(row => <div key={row.label} className="grid grid-cols-[64px_1fr] items-center gap-2">
        <div className="type-meta truncate">{row.label}</div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${shownDates.length}, minmax(3px, 1fr))` }}>
          {shownDates.map(date => <button key={`${row.label}-${date}`} aria-label={`${row.label}, ${date}, ${row.observed.has(date) ? 'recorded' : 'not recorded'}`} onClick={() => onSelect?.(date, row.label)} className={cn('aspect-square min-h-1 rounded-[3px] border', row.observed.has(date) ? 'bg-foreground border-foreground' : 'bg-transparent border-border')} />)}
        </div>
      </div>)}
    </div>
    {shownDates.length > 1 && <div className="mt-3 flex justify-between pl-[72px] type-meta"><span>{format(parseISO(shownDates[0]), 'd MMM')}</span><span>{format(parseISO(shownDates.at(-1)!), 'd MMM')}</span></div>}
  </div>;
}

export function DumbbellMetric({ label, previous, current, formatValue }: { label: string; previous: number | null; current: number | null; formatValue: (value: number) => string }) {
  const values = [previous, current].filter((value): value is number => value != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = max - min || 1;
  const point = (value: number | null) => value == null ? 50 : 8 + ((value - min) / span) * 84;
  return <div className="rounded-2xl border border-border bg-card p-3">
    <div className="type-meta">{label}</div>
    <div className="mt-2 flex items-baseline justify-between gap-2 text-xs"><span>{previous == null ? '—' : formatValue(previous)}</span><span className="font-semibold">{current == null ? '—' : formatValue(current)}</span></div>
    <div className="relative mt-2 h-7" aria-hidden>
      <div className="absolute left-[8%] right-[8%] top-1/2 h-px bg-border" />
      {previous != null && <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-card" style={{ left: `${point(previous)}%` }} />}
      {current != null && <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ left: `${point(current)}%` }} />}
    </div>
    {previous != null && current != null && <div className="type-caption mt-1 tabular-nums">{current - previous > 0 ? '+' : ''}{formatValue(current - previous)} vs previous</div>}
  </div>;
}

export function TrendLineChart({ data, lines, reference, height = 236, inspectorLabel }: { data: Array<Record<string, string | number | null>>; lines: Array<{ key: string; label: string; stroke?: string; width?: number; dashed?: boolean }>; reference?: { value: number; label?: string }; height?: number; inspectorLabel?: string }) {
  const [index, setIndex] = useState(Math.max(0, data.length - 1));
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = data[index];
  const dateKey = typeof selected?.date === 'string' ? selected.date : undefined;
  const select = (clientX: number) => {
    const node = wrapRef.current;
    if (!node || data.length === 0) return;
    const rect = node.getBoundingClientRect();
    const normalized = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1)));
    setIndex(Math.round(normalized * (data.length - 1)));
  };
  if (!data.length) return <div className="rounded-2xl border border-border py-8 text-center type-caption">Not enough data in this range.</div>;
  return <div className="space-y-2">
    <DataInspector label={dateKey ? format(parseISO(dateKey), 'EEE, d MMM') : inspectorLabel} items={lines.map(line => ({ label: line.label, value: selected?.[line.key] == null ? '—' : Number(selected[line.key]).toLocaleString(undefined, { maximumFractionDigits: 2 }) }))} />
    <div ref={wrapRef} className="relative rounded-2xl border border-border bg-card pt-2 touch-pan-y" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); select(event.clientX); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) select(event.clientX); }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 14, bottom: 4, left: -18 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={42} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['auto', 'auto']} />
          {reference && <ReferenceLine y={reference.value} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={reference.label ? { value: reference.label, fontSize: 10, fill: 'hsl(var(--muted-foreground))' } : undefined} />}
          {lines.map((line, lineIndex) => <Line key={line.key} type="monotone" dataKey={line.key} connectNulls={false} stroke={line.stroke || (lineIndex === 0 ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))')} strokeOpacity={lineIndex === 0 ? 1 : 0.45} strokeWidth={line.width || (lineIndex === 0 ? 2.5 : 1.25)} strokeDasharray={line.dashed ? '4 4' : undefined} dot={lineIndex === 0 ? { r: 2.5, fill: 'hsl(var(--foreground))' } : false} activeDot={false} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-y-3 w-px bg-foreground/45" style={{ left: `${8 + (index / Math.max(1, data.length - 1)) * 88}%` }} />
    </div>
  </div>;
}

export function DailyBars({ data, valueKey, label, goal, suffix = '', height = 210 }: { data: Array<{ date: string; label: string; [key: string]: string | number | null }>; valueKey: string; label: string; goal?: number | null; suffix?: string; height?: number }) {
  const [index, setIndex] = useState(Math.max(0, data.length - 1));
  const selected = data[index];
  return <div className="space-y-2">
    <DataInspector label={selected?.date ? format(parseISO(selected.date), 'EEE, d MMM') : undefined} items={[{ label, value: selected?.[valueKey] == null ? '—' : `${Math.round(Number(selected[valueKey])).toLocaleString()}${suffix}` }]} />
    <div className="rounded-2xl border border-border bg-card pt-2" onPointerMove={event => {
      if (!data.length) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      setIndex(Math.round((x / Math.max(1, rect.width)) * (data.length - 1)));
    }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.45} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={34} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          {goal != null && goal > 0 && <ReferenceLine y={goal} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />}
          <Bar dataKey={valueKey} fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>;
}

export function BodyMeasurementMap({ measurements, onSelect }: { measurements: Array<{ key: string; label: string; value: number | null; delta?: number | null }>; onSelect?: (key: string) => void }) {
  const byKey = new Map(measurements.map(item => [item.key, item]));
  const Item = ({ id, className }: { id: string; className: string }) => {
    const item = byKey.get(id);
    if (!item) return null;
    return <button onClick={() => onSelect?.(id)} className={cn('absolute rounded-xl border border-border bg-background/95 px-2.5 py-2 text-left shadow-sm min-w-[92px]', className)}>
      <div className="type-meta">{item.label}</div>
      <div className="text-sm font-semibold tabular-nums">{item.value == null ? '—' : `${item.value} cm`}</div>
      {item.delta != null && <div className="type-meta tabular-nums">{item.delta > 0 ? '+' : ''}{item.delta} cm</div>}
    </button>;
  };
  return <div className="relative mx-auto h-[390px] max-w-[360px] overflow-hidden rounded-3xl border border-border bg-card">
    <svg viewBox="0 0 180 360" className="absolute inset-0 h-full w-full text-muted-foreground/25" aria-hidden>
      <circle cx="90" cy="38" r="24" fill="currentColor" />
      <path d="M64 68 C70 60,110 60,116 68 L126 164 C120 185,112 204,108 225 L120 335 H96 L90 238 L84 335 H60 L72 225 C68 204,60 185,54 164 Z" fill="currentColor" />
      <path d="M58 82 L26 170 L40 178 L72 103 Z" fill="currentColor" />
      <path d="M122 82 L154 170 L140 178 L108 103 Z" fill="currentColor" />
    </svg>
    <Item id="chest" className="left-1/2 top-[84px] -translate-x-1/2" />
    <Item id="leftArm" className="left-2 top-[140px]" />
    <Item id="rightArm" className="right-2 top-[140px]" />
    <Item id="waist" className="left-1/2 top-[198px] -translate-x-1/2" />
    <Item id="leftCalf" className="left-2 bottom-5" />
    <Item id="rightCalf" className="right-2 bottom-5" />
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
    const map = new Map<string, { label: string; value: number }>();
    muscles.forEach(item => {
      const key = muscleBucket(item.muscle);
      const row = map.get(key) || { label: key, value: 0 };
      row.value += item.setsPerWeek;
      map.set(key, row);
    });
    return map;
  }, [muscles]);
  const max = Math.max(1, ...[...grouped.values()].map(item => item.value));
  const opacity = (key: string) => 0.12 + ((grouped.get(key)?.value || 0) / max) * 0.78;
  const Region = ({ keyName, x, y, w, h, rx = 8 }: { keyName: string; x: number; y: number; w: number; h: number; rx?: number }) => <rect x={x} y={y} width={w} height={h} rx={rx} fill="currentColor" opacity={opacity(keyName)} />;
  return <div className="grid grid-cols-[1fr_112px] gap-3 rounded-3xl border border-border bg-card p-4">
    <button className="relative min-h-[300px] text-foreground" onClick={() => undefined} aria-label="Muscle exposure body map">
      <svg viewBox="0 0 170 320" className="h-[300px] w-full" aria-hidden>
        <circle cx="85" cy="27" r="19" fill="currentColor" opacity=".08" />
        <Region keyName="shoulders" x={45} y={52} w={80} h={30} rx={15} />
        <Region keyName="chest" x={57} y={66} w={56} h={46} />
        <Region keyName="arms" x={25} y={63} w={27} h={105} rx={13} />
        <Region keyName="arms" x={118} y={63} w={27} h={105} rx={13} />
        <Region keyName="core" x={61} y={112} w={48} h={58} />
        <Region keyName="quads" x={55} y={174} w={28} h={88} rx={12} />
        <Region keyName="quads" x={87} y={174} w={28} h={88} rx={12} />
        <Region keyName="calves" x={57} y={264} w={22} h={50} rx={10} />
        <Region keyName="calves" x={91} y={264} w={22} h={50} rx={10} />
      </svg>
    </button>
    <div className="space-y-2 self-center">
      {[...grouped.values()].filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 7).map(item => <button key={item.label} onClick={() => onSelect?.(item.label)} className="w-full rounded-xl border border-border px-2 py-1.5 text-left">
        <div className="type-meta capitalize">{item.label}</div>
        <div className="text-sm font-semibold tabular-nums">{item.value.toFixed(1)}/wk</div>
      </button>)}
    </div>
  </div>;
}

export function BulletRows({ rows }: { rows: Array<{ label: string; value: number; low?: number; high?: number; detail?: string }> }) {
  return <div className="space-y-4">
    {rows.map(row => {
      const ceiling = Math.max(row.high || 0, row.value, 1) * 1.15;
      const valueLeft = Math.min(100, row.value / ceiling * 100);
      const low = row.low == null ? null : row.low / ceiling * 100;
      const high = row.high == null ? null : row.high / ceiling * 100;
      return <div key={row.label}>
        <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-sm font-semibold capitalize">{row.label}</span><span className="type-caption tabular-nums">{row.value.toFixed(1)}{row.detail ? ` · ${row.detail}` : ''}</span></div>
        <div className="relative h-3 rounded-full bg-muted">
          {low != null && high != null && <span className="absolute inset-y-0 rounded-full bg-muted-foreground/20" style={{ left: `${Math.min(100, low)}%`, width: `${Math.max(2, Math.min(100, high) - Math.min(100, low))}%` }} />}
          <span className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ left: `${valueLeft}%` }} />
        </div>
      </div>;
    })}
  </div>;
}

export function MatrixRows({ columns, rows }: { columns: string[]; rows: Array<{ label: string; values: Array<number | null> }> }) {
  const max = Math.max(1, ...rows.flatMap(row => row.values.filter((value): value is number => value != null)));
  return <div className="overflow-x-auto rounded-2xl border border-border bg-card">
    <div className="min-w-[360px] p-3">
      <div className="grid grid-cols-[88px_repeat(var(--cols),1fr)] gap-1" style={{ ['--cols' as string]: columns.length }}>
        <div />{columns.map(column => <div key={column} className="type-meta text-center">{column}</div>)}
        {rows.map(row => <div key={row.label} className="contents"><div className="type-meta self-center truncate">{row.label}</div>{row.values.map((value, index) => <div key={`${row.label}-${index}`} className="aspect-square rounded-md border border-border" style={{ background: value == null ? 'transparent' : `hsl(var(--foreground) / ${0.12 + (value / max) * 0.72})` }} title={value == null ? 'No data' : String(value)} />)}</div>)}
      </div>
    </div>
  </div>;
}

export function ActivityBars({ rows }: { rows: Array<{ label: string; value: number; detail?: string }> }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <div className="space-y-3">
    {rows.map(row => <div key={row.label}>
      <div className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold capitalize">{row.label}</span><span className="text-sm font-semibold tabular-nums">{Math.round(row.value)} min</span></div>
      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(3, row.value / max * 100)}%` }} /></div>
      {row.detail && <div className="type-caption mt-1">{row.detail}</div>}
    </div>)}
  </div>;
}

export function SymmetryGauge({ label, left, right, unit = '' }: { label: string; left: number | null; right: number | null; unit?: string }) {
  const max = Math.max(1, left || 0, right || 0);
  const leftPos = left == null ? 50 : 50 - (left / max) * 40;
  const rightPos = right == null ? 50 : 50 + (right / max) * 40;
  const delta = left != null && right != null ? Math.abs(left - right) : null;
  return <div className="rounded-2xl border border-border bg-card p-3">
    <div className="text-sm font-semibold">{label}</div>
    <div className="mt-3 flex justify-between text-xs"><span>Left {left == null ? '—' : `${left}${unit}`}</span><span>Right {right == null ? '—' : `${right}${unit}`}</span></div>
    <div className="relative mt-2 h-8">
      <div className="absolute left-[8%] right-[8%] top-1/2 h-px bg-border" />
      <div className="absolute left-1/2 top-1/2 h-5 w-px -translate-y-1/2 bg-muted-foreground/40" />
      {left != null && <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ left: `${leftPos}%` }} />}
      {right != null && <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ left: `${rightPos}%` }} />}
    </div>
    <div className="type-caption text-center">{delta == null ? 'Both sides are needed for comparison' : `Difference ${Number(delta.toFixed(1))}${unit}`}</div>
  </div>;
}
