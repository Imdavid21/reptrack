import { useMemo } from 'react';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function VolumeChart() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);

  const chartData = useMemo(() => {
    if (!data?.weeklyVolume) return [];
    return data.weeklyVolume;
  }, [data?.weeklyVolume]);

  const categoryDistribution = useMemo(() => {
    if (!data?.volumeTotals || data.volumeTotals.total === 0) return null;
    
    const { push, pull, legs, total } = data.volumeTotals;
    return {
      push: Math.round((push / total) * 100),
      pull: Math.round((pull / total) * 100),
      legs: Math.round((legs / total) * 100),
    };
  }, [data?.volumeTotals]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Weekly Volume</h3>
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Weekly Volume</h3>
        <p className="text-sm text-muted-foreground py-8 text-center">
          No volume data yet. Complete workouts to track volume!
        </p>
      </div>
    );
  }

  const formatVolume = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 p-3 text-xs">
        <p className="font-medium mb-2">Week of {label}</p>
        <div className="space-y-1">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: p.stroke }}
              />
              <span className="text-muted-foreground">{p.name}:</span>
              <span className="font-medium">{formatVolume(p.value)} kg</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border/30 mt-2 pt-2">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium ml-2">{formatVolume(total)} kg</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Weekly Volume</h3>
        {data?.volumeTotals && (
          <div className="text-xs text-muted-foreground">
            Total: {formatVolume(data.volumeTotals.total)} kg
          </div>
        )}
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="pushGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--insight-lavender))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--insight-lavender))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pullGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--insight-mint))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--insight-mint))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="legsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--insight-coral))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--insight-coral))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="week"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatVolume}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={renderTooltip} />
            <Area
              type="monotone"
              dataKey="pushVolume"
              name="Push"
              stroke="hsl(var(--insight-lavender))"
              strokeWidth={2}
              fill="url(#pushGradient)"
              dot={{ fill: 'hsl(var(--insight-lavender))', strokeWidth: 0, r: 3 }}
            />
            <Area
              type="monotone"
              dataKey="pullVolume"
              name="Pull"
              stroke="hsl(var(--insight-mint))"
              strokeWidth={2}
              fill="url(#pullGradient)"
              dot={{ fill: 'hsl(var(--insight-mint))', strokeWidth: 0, r: 3 }}
            />
            <Area
              type="monotone"
              dataKey="legsVolume"
              name="Legs"
              stroke="hsl(var(--insight-coral))"
              strokeWidth={2}
              fill="url(#legsGradient)"
              dot={{ fill: 'hsl(var(--insight-coral))', strokeWidth: 0, r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs mt-3 border-t border-border/30 pt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-insight-lavender" />
          <span>Push</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-insight-mint" />
          <span>Pull</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-insight-coral" />
          <span>Legs</span>
        </div>
      </div>

      {categoryDistribution && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="text-xs text-muted-foreground mb-2">Volume Distribution</div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/30">
            <div
              className="bg-insight-lavender transition-all"
              style={{ width: `${categoryDistribution.push}%` }}
            />
            <div
              className="bg-insight-mint transition-all"
              style={{ width: `${categoryDistribution.pull}%` }}
            />
            <div
              className="bg-insight-coral transition-all"
              style={{ width: `${categoryDistribution.legs}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-2 text-muted-foreground">
            <span>Push {categoryDistribution.push}%</span>
            <span>Pull {categoryDistribution.pull}%</span>
            <span>Legs {categoryDistribution.legs}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
