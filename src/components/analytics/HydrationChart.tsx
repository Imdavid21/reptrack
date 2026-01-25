import { useMemo } from 'react';
import { useHydrationData } from '@/hooks/useHydrationData';
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
  const { data, isLoading } = useHydrationData(14);

  const chartData = useMemo(() => {
    if (!data?.dailyData) return [];
    return data.dailyData.map(d => ({
      ...d,
      metGoal: d.total >= DAILY_GOAL,
    }));
  }, [data?.dailyData]);

  if (isLoading) {
    return (
      <div className="border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[180px]" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    
    return (
      <div className="border border-border bg-card p-2 text-xs">
        <p className="font-medium mb-1">{label}</p>
        <p>{d.total.toFixed(2)}L ({d.logs} logs)</p>
        {d.metGoal && <p className="text-muted-foreground">✓ Goal met!</p>}
      </div>
    );
  };

  const hasData = chartData.some(d => d.total > 0);

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">HYDRATION (14 DAYS)</h3>
        {data?.totals && (
          <div className="text-xs text-muted-foreground">
            Goal: {DAILY_GOAL}L/day
          </div>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">
          No hydration data yet. Start logging water!
        </p>
      ) : (
        <>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  interval={1}
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
                  strokeOpacity={0.7}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.metGoal
                        ? 'hsl(var(--foreground))'
                        : 'hsl(var(--muted-foreground))'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          {data?.totals && (
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
              <div>
                <div className="text-lg font-bold tabular-nums">
                  {data.totals.avgDaily.toFixed(1)}L
                </div>
                <div className="text-xs text-muted-foreground">AVG/DAY</div>
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums">
                  {data.totals.daysMetGoal}/{data.totals.daysTracked}
                </div>
                <div className="text-xs text-muted-foreground">GOALS MET</div>
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums">
                  {data.totals.totalLiters.toFixed(1)}L
                </div>
                <div className="text-xs text-muted-foreground">TOTAL</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
