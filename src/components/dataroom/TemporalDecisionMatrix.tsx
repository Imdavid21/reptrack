import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Dumbbell, Moon, Scale, Utensils, Activity } from 'lucide-react';
import type { TemporalAnalysis, TemporalHorizon, TemporalMetric, TemporalTone } from '@/lib/dataroom/temporal';
import { cn } from '@/lib/utils';

const toneClass: Record<TemporalTone, string> = {
  positive: 'text-energy-ink bg-energy-soft border-energy-border',
  neutral: 'text-foreground bg-muted/35 border-border',
  watch: 'text-recover-ink bg-recover-soft border-recover-border',
  insufficient: 'text-muted-foreground bg-muted/20 border-border',
};

const dotClass: Record<TemporalTone, string> = {
  positive: 'bg-energy', neutral: 'bg-foreground/50', watch: 'bg-recover', insufficient: 'bg-muted-foreground/30',
};

const metricIcon: Record<TemporalMetric['key'], typeof Scale> = {
  bodyweight: Scale,
  training: Dumbbell,
  strength: Activity,
  sleep: Moon,
  protein: Utensils,
};

function Delta({ metric }: { metric: TemporalMetric }) {
  if (!metric.delta) return <span className="type-meta">No comparison</span>;
  return <span className={cn('rounded-md border px-1.5 py-0.5 type-meta tabular-nums', toneClass[metric.tone])}>{metric.delta}</span>;
}

function MetricRow({ metric }: { metric: TemporalMetric }) {
  const Icon = metricIcon[metric.key];
  return (
    <div className="grid grid-cols-[1.4rem_minmax(0,1fr)_auto] items-center gap-2.5 py-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="type-action text-foreground">{metric.label}</span>
          <span className="truncate type-supporting">{metric.previous ? `vs ${metric.previous}` : metric.detail}</span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="type-card-title tabular-nums">{metric.value}</span>
          <span className="type-meta capitalize">{metric.confidence} confidence</span>
        </div>
      </div>
      <Delta metric={metric} />
    </div>
  );
}

function HorizonPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('min-h-9 flex-1 rounded-xl px-2 text-xs font-semibold transition-colors', active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
    >
      {label}
    </button>
  );
}

function rangeLabel(title: string) {
  if (/2 years/i.test(title)) return '2y';
  const days = title.match(/(\d+) days/i)?.[1];
  return days ? `${days}d` : 'Range';
}

export function TemporalDecisionMatrix({ analysis }: { analysis: TemporalAnalysis }) {
  const [active, setActive] = useState<TemporalHorizon>('week');
  const available = useMemo(() => {
    const items: Array<{ horizon: TemporalHorizon; label: string }> = [
      { horizon: 'today', label: 'Today' },
      { horizon: 'week', label: '7d' },
    ];
    if (analysis.month) items.push({ horizon: 'month', label: '28d' });
    if (analysis.range) items.push({ horizon: 'range', label: rangeLabel(analysis.range.title) });
    return items;
  }, [analysis.month, analysis.range]);

  useEffect(() => {
    if (!available.some(item => item.horizon === active)) setActive('week');
  }, [available, active]);

  const panel = analysis[active] ?? analysis.week;
  const compactMetrics = useMemo(() => panel.metrics.slice(0, active === 'today' ? 4 : 5), [panel.metrics, active]);

  return (
    <section aria-labelledby="temporal-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 type-eyebrow"><CalendarDays className="h-3.5 w-3.5" />Decision horizon</div>
            <h2 id="temporal-title" className="mt-1 type-section-title">Today, week, month, range</h2>
            <p className="mt-1 max-w-xl type-supporting">Short-term decisions stay comparable. Longer selections add a range-specific view instead of stretching the same rule across every horizon.</p>
          </div>
          <span className={cn('mt-0.5 h-2.5 w-2.5 rounded-full', dotClass[panel.decisionTone])} aria-hidden />
        </div>
        <div className="mt-4 flex rounded-xl border border-border bg-muted/30 p-1">
          {available.map(item => <HorizonPill key={item.horizon} label={item.label} active={active === item.horizon} onClick={() => setActive(item.horizon)} />)}
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="type-eyebrow">{panel.eyebrow}</p>
            <h3 className="type-component-title">{panel.title}</h3>
          </div>
          <p className="type-meta text-right">{panel.subtitle}</p>
        </div>

        <div className="mt-3 divide-y divide-border border-y border-border">
          {compactMetrics.map(metric => <MetricRow key={metric.key} metric={metric} />)}
        </div>

        <div className={cn('mt-4 flex items-start gap-3 rounded-xl border px-3.5 py-3', toneClass[panel.decisionTone])}>
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotClass[panel.decisionTone])} />
          <div className="min-w-0 flex-1">
            <p className="type-meta">Decision rule</p>
            <p className="mt-0.5 type-supporting text-current">{panel.decision}</p>
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
        </div>
      </div>
    </section>
  );
}
