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
  ReferenceLine,
} from 'recharts';

export function BodyweightChart() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDailyMetrics(dateRange);

  const chartData = useMemo(() => {
    if (!data?.dataPoints) return [];
    
    return data.dataPoints
      .filter(d => d.bodyweight !== null && d.bodyweight > 0)
      .map(d => ({
        date: format(parseISO(d.date), 'MMM d'),
        weight: d.bodyweight,
      }));
  }, [data?.dataPoints]);

  const { yMin, yMax, avgWeight } = useMemo(() => {
    if (chartData.length === 0) return { yMin: 60, yMax: 100, avgWeight: null };
    
    const weights = chartData.map(d => d.weight as number);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const padding = (max - min) * 0.2 || 5;
    
    return {
      yMin: Math.floor(min - padding),
      yMax: Math.ceil(max + padding),
      avgWeight: avg,
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[180px]" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="border border-border p-4">
        <h3 className="section-header">BODYWEIGHT</h3>
        <p className="text-sm text-muted-foreground">
          No bodyweight data yet. Log workouts with your weight!
        </p>
      </div>
    );
  }

  const firstWeight = chartData[0]?.weight as number;
  const lastWeight = chartData[chartData.length - 1]?.weight as number;
  const change = lastWeight - firstWeight;
  const changePercent = ((change / firstWeight) * 100).toFixed(1);

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="border border-border bg-card p-2 text-xs">
        <p className="font-medium">{label}</p>
        <p>{payload[0].value} kg</p>
      </div>
    );
  };

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">BODYWEIGHT</h3>
        {chartData.length >= 2 && (
          <div className={`text-xs font-medium ${change >= 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)} kg ({change >= 0 ? '+' : ''}{changePercent}%)
          </div>
        )}
      </div>

      <div className="h-[180px]">
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
              domain={[yMin, yMax]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            {avgWeight && (
              <ReferenceLine
                y={avgWeight}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}
            <Tooltip content={renderTooltip} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--foreground))' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
        <div>
          <div className="text-lg font-bold tabular-nums">{firstWeight} kg</div>
          <div className="text-xs text-muted-foreground">START</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">{lastWeight} kg</div>
          <div className="text-xs text-muted-foreground">CURRENT</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">{avgWeight?.toFixed(1)} kg</div>
          <div className="text-xs text-muted-foreground">AVERAGE</div>
        </div>
      </div>
    </div>
  );
}
