import { useMemo } from 'react';
import { useHabitsData } from '@/hooks/useHabitsData';
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
  const { data, isLoading } = useHabitsData(60);

  const { chartData, totalPullups, weeklyAvg } = useMemo(() => {
    if (!data?.dataPoints) {
      return { chartData: [], totalPullups: 0, weeklyAvg: 0 };
    }

    // Group by week
    const weeklyMap = new Map<string, { week: string; pullups: number; cumulative: number }>();
    let runningTotal = 0;

    data.dataPoints.forEach(d => {
      const weekStart = startOfWeek(parseISO(d.date), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const displayWeek = format(weekStart, 'MMM d');

      const existing = weeklyMap.get(weekKey);
      if (existing) {
        existing.pullups += d.pullups;
      } else {
        weeklyMap.set(weekKey, {
          week: displayWeek,
          pullups: d.pullups,
          cumulative: 0,
        });
      }
      runningTotal += d.pullups;
    });

    // Add cumulative totals
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
      <div className="border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[180px]" />
      </div>
    );
  }

  if (chartData.length === 0 || totalPullups === 0) {
    return (
      <div className="border border-border p-4">
        <h3 className="section-header">PULL-UPS</h3>
        <p className="text-sm text-muted-foreground">
          No pull-up data yet. Log your first workout!
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="border border-border bg-card p-2 text-xs">
        <p className="font-medium mb-1">Week of {label}</p>
        <p>{payload[0].value} pull-ups</p>
        <p className="text-muted-foreground">
          Cumulative: {payload[0].payload.cumulative}
        </p>
      </div>
    );
  };

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">PULL-UPS</h3>
        <div className="text-2xl font-bold tabular-nums">{totalPullups}</div>
      </div>

      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pullups" fill="hsl(var(--foreground))">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === chartData.length - 1
                    ? 'hsl(var(--foreground))'
                    : 'hsl(var(--muted-foreground))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
        <div>
          <div className="text-lg font-bold tabular-nums">{weeklyAvg}</div>
          <div className="text-xs text-muted-foreground">AVG/WEEK</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">{chartData.length}</div>
          <div className="text-xs text-muted-foreground">WEEKS TRACKED</div>
        </div>
      </div>
    </div>
  );
}
