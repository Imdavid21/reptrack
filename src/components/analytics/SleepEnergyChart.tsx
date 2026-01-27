import { useMemo } from 'react';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import {
  AreaChart,
  Area,
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
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Sleep & Energy</h3>
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Sleep & Energy</h3>
        <p className="text-sm text-muted-foreground py-8 text-center">
          No sleep/energy data yet. Log your morning check-in!
        </p>
      </div>
    );
  }

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 p-3 text-xs">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: p.stroke }}
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium">
              {p.value}{p.dataKey === 'sleep' ? 'h' : '/10'}
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Sleep & Energy</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-insight-yellow" />
            Sleep
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-insight-blue" />
            Energy
          </span>
        </div>
      </div>

      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--insight-yellow))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--insight-yellow))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--insight-blue))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--insight-blue))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
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
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="sleep"
              name="Sleep"
              stroke="hsl(var(--insight-yellow))"
              strokeWidth={2}
              fill="url(#sleepGradient)"
              dot={{ r: 3, fill: 'hsl(var(--insight-yellow))' }}
              connectNulls
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="energy"
              name="Energy"
              stroke="hsl(var(--insight-blue))"
              strokeWidth={2}
              fill="url(#energyGradient)"
              dot={{ r: 3, fill: 'hsl(var(--insight-blue))' }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data?.totals && (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/30">
          <div className="bg-insight-yellow/10 rounded-xl p-3 text-center">
            <div className="text-lg font-bold tabular-nums">
              {data.totals.avgSleep?.toFixed(1) ?? '—'}h
            </div>
            <div className="text-xs text-muted-foreground">Avg Sleep</div>
          </div>
          <div className="bg-insight-blue/10 rounded-xl p-3 text-center">
            <div className="text-lg font-bold tabular-nums">
              {data.totals.avgEnergy?.toFixed(1) ?? '—'}/10
            </div>
            <div className="text-xs text-muted-foreground">Avg Energy</div>
          </div>
        </div>
      )}
    </div>
  );
}
