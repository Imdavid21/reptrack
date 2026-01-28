import { useMemo } from 'react';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, startOfWeek } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export function PullupAccumulator() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDailyMetrics(dateRange);

  const { chartData, totalPullups, weeklyAvg } = useMemo(() => {
    if (!data?.dataPoints) {
      return { chartData: [], totalPullups: 0, weeklyAvg: 0 };
    }

    const weeklyMap = new Map<string, { week: string; pullups: number; cumulative: number }>();
    let runningTotal = 0;

    data.dataPoints.forEach(d => {
      const weekStart = startOfWeek(parseISO(d.date), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const displayWeek = format(weekStart, 'MMM d');

      const existing = weeklyMap.get(weekKey);
      if (existing) {
        existing.pullups += d.pullups || 0;
      } else {
        weeklyMap.set(weekKey, {
          week: displayWeek,
          pullups: d.pullups || 0,
          cumulative: 0,
        });
      }
      runningTotal += d.pullups || 0;
    });

    let cumulative = 0;
    const sortedWeeks = Array.from(weeklyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, data]) => {
        cumulative += data.pullups;
        return { ...data, cumulative };
      });

    return {
      chartData: sortedWeeks,
      totalPullups: data.totals.totalPullups,
      weeklyAvg: sortedWeeks.length > 0
        ? Math.round(runningTotal / sortedWeeks.length)
        : 0,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Pull-ups</h3>
        <Skeleton className="h-[160px] rounded-xl" />
      </div>
    );
  }

  if (chartData.length === 0 || totalPullups === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Pull-ups</h3>
        <p className="text-sm text-muted-foreground py-8 text-center">
          No pull-up data yet. Log your first workout!
        </p>
      </div>
    );
  }

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 p-3 text-xs">
        <p className="font-medium mb-1">Week of {label}</p>
        <p className="text-muted-foreground">
          {payload[0].value} pull-ups
        </p>
        <p className="text-foreground font-medium mt-1">
          Cumulative: {payload[0].payload.cumulative}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Pull-ups</h3>
        <div className="text-2xl font-bold tabular-nums">{totalPullups}</div>
      </div>

      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={renderTooltip} />
            <Bar dataKey="pullups" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === chartData.length - 1
                    ? 'hsl(var(--chart-1))'
                    : 'hsl(var(--chart-3))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/30">
        <div className="bg-[hsl(var(--chart-1)/0.1)] rounded-xl p-2.5 text-center">
          <div className="text-base font-bold tabular-nums">{weeklyAvg}</div>
          <div className="text-xs text-muted-foreground">Avg/Week</div>
        </div>
        <div className="bg-[hsl(var(--chart-2)/0.1)] rounded-xl p-2.5 text-center">
          <div className="text-base font-bold tabular-nums">{chartData.length}</div>
          <div className="text-xs text-muted-foreground">Weeks Tracked</div>
        </div>
      </div>
    </div>
  );
}
