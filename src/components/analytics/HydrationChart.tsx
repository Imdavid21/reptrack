import { useMemo } from 'react';
import { useHydrationData } from '@/hooks/useHydrationData';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

const DAILY_GOAL = 3.5;

export function HydrationChart() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useHydrationData(dateRange);

  const chartData = useMemo(() => {
    if (!data?.dailyData) return [];
    return data.dailyData.map(d => ({
      ...d,
      metGoal: d.total >= DAILY_GOAL,
    }));
  }, [data?.dailyData]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Hydration</h3>
        <Skeleton className="h-[180px] rounded-xl" />
      </div>
    );
  }

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 p-3 text-xs">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-muted-foreground">
          {d.total.toFixed(2)}L ({d.logs} logs)
        </p>
        {d.metGoal && <p className="text-foreground font-medium mt-1">✓ Goal met!</p>}
      </div>
    );
  };

  const hasData = chartData.some(d => d.total > 0);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Hydration</h3>
        {data?.totals && (
          <div className="text-xs text-muted-foreground">
            Goal: {DAILY_GOAL}L/day
          </div>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No hydration data yet. Start logging water!
        </p>
      ) : (
        <>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine
                  y={DAILY_GOAL}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <Tooltip content={renderTooltip} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.metGoal
                        ? 'hsl(var(--chart-1))'
                        : 'hsl(var(--chart-4))'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          {data?.totals && (
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/30">
              <div className="bg-[hsl(var(--chart-1)/0.1)] rounded-xl p-2.5 text-center">
                <div className="text-base font-bold tabular-nums">
                  {data.totals.avgDaily.toFixed(1)}L
                </div>
                <div className="text-xs text-muted-foreground">Avg/Day</div>
              </div>
              <div className="bg-[hsl(var(--chart-2)/0.1)] rounded-xl p-2.5 text-center">
                <div className="text-base font-bold tabular-nums">
                  {data.totals.daysMetGoal}/{data.totals.daysTracked}
                </div>
                <div className="text-xs text-muted-foreground">Goals Met</div>
              </div>
              <div className="bg-[hsl(var(--chart-3)/0.1)] rounded-xl p-2.5 text-center">
                <div className="text-base font-bold tabular-nums">
                  {data.totals.totalLiters.toFixed(1)}L
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
