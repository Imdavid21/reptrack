import { useMemo } from 'react';
import { useMorningCheckinHistory } from '@/hooks/useMorningCheckin';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, differenceInDays } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export function BodyweightChart() {
  const { dateRange } = useDateRange();
  const days = differenceInDays(dateRange.to, dateRange.from) + 1;
  const { data: checkins, isLoading } = useMorningCheckinHistory(days);

  const chartData = useMemo(() => {
    if (!checkins) return [];
    
    return checkins
      .filter(c => {
        const date = parseISO(c.date);
        return date >= dateRange.from && date <= dateRange.to && c.bodyweight !== null && c.bodyweight > 0;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(c => ({
        date: format(parseISO(c.date), 'MMM d'),
        weight: c.bodyweight,
      }));
  }, [checkins, dateRange]);

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
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Bodyweight</h3>
        <Skeleton className="h-[180px] rounded-xl" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Bodyweight</h3>
        <p className="text-sm text-muted-foreground py-8 text-center">
          No bodyweight data yet. Log your weight in morning check-in!
        </p>
      </div>
    );
  }

  const firstWeight = chartData[0]?.weight as number;
  const lastWeight = chartData[chartData.length - 1]?.weight as number;
  const change = lastWeight - firstWeight;
  const changePercent = ((change / firstWeight) * 100).toFixed(1);

  const TrendIcon = change > 0.5 ? TrendingUp : change < -0.5 ? TrendingDown : Minus;
  const trendColor = 'text-foreground';

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 p-3 text-xs">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground mt-1">
          Weight: <span className="font-medium text-foreground">{payload[0].value} kg</span>
        </p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Bodyweight</h3>
        {chartData.length >= 2 && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {change >= 0 ? '+' : ''}{change.toFixed(1)} kg ({change >= 0 ? '+' : ''}{changePercent}%)
          </div>
        )}
      </div>

      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
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
              domain={[yMin, yMax]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            {avgWeight && (
              <ReferenceLine
                y={avgWeight}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
              />
            )}
            <Tooltip content={renderTooltip} />
            <Area
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              fill="url(#weightGradient)"
              dot={{ r: 3, fill: 'hsl(var(--chart-2))' }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/30">
        <div className="text-center">
          <div className="text-lg font-bold tabular-nums">{firstWeight} kg</div>
          <div className="text-xs text-muted-foreground">Start</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold tabular-nums">{lastWeight} kg</div>
          <div className="text-xs text-muted-foreground">Current</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold tabular-nums">{avgWeight?.toFixed(1)} kg</div>
          <div className="text-xs text-muted-foreground">Average</div>
        </div>
      </div>
    </div>
  );
}
