import { useMemo } from 'react';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function SleepEnergyChart() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDailyMetrics(dateRange);

  const chartData = useMemo(() => {
    if (!data?.dataPoints) return [];
    
    return data.dataPoints
      .filter(d => d.sleep_hours !== null || d.energy_level !== null)
      .map(d => ({
        date: format(parseISO(d.date), 'MMM d'),
        sleep: d.sleep_hours,
        energy: d.energy_level,
      }));
  }, [data?.dataPoints]);

  if (isLoading) {
    return (
      <div className="border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="border border-border p-4">
        <h3 className="section-header">SLEEP & ENERGY</h3>
        <p className="text-sm text-muted-foreground">
          No sleep/energy data yet. Log your first workout with habits!
        </p>
      </div>
    );
  }

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="border border-border bg-card p-2 text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value}{p.dataKey === 'sleep' ? 'h' : '/10'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">SLEEP & ENERGY</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-foreground" />
            Sleep (h)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-muted-foreground" />
            Energy
          </span>
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              domain={[0, 12]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 10]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              hide
            />
            <Tooltip content={renderTooltip} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sleep"
              name="Sleep"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--foreground))' }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="energy"
              name="Energy"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--muted-foreground))' }}
              strokeDasharray="5 5"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data?.totals && (
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
          <div>
            <div className="text-lg font-bold tabular-nums">
              {data.totals.avgSleep?.toFixed(1) ?? '—'}h
            </div>
            <div className="text-xs text-muted-foreground">AVG SLEEP</div>
          </div>
          <div>
            <div className="text-lg font-bold tabular-nums">
              {data.totals.avgEnergy?.toFixed(1) ?? '—'}/10
            </div>
            <div className="text-xs text-muted-foreground">AVG ENERGY</div>
          </div>
        </div>
      )}
    </div>
  );
}
