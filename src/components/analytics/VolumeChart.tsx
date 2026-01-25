import { useMemo } from 'react';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function VolumeChart() {
  const { data, isLoading } = useExerciseSets(60);

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
      <div className="border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="border border-border p-4">
        <h3 className="section-header">WEEKLY VOLUME</h3>
        <p className="text-sm text-muted-foreground">
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

    return (
      <div className="border border-border bg-card p-2 text-xs">
        <p className="font-medium mb-1">Week of {label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill }}>
            {p.name}: {formatVolume(p.value)} kg
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">WEEKLY VOLUME</h3>
        {data?.volumeTotals && (
          <div className="text-xs text-muted-foreground">
            Total: {formatVolume(data.volumeTotals.total)} kg
          </div>
        )}
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatVolume}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={renderTooltip} />
            <Bar
              dataKey="pushVolume"
              name="Push"
              stackId="a"
              fill="hsl(var(--foreground))"
            />
            <Bar
              dataKey="pullVolume"
              name="Pull"
              stackId="a"
              fill="hsl(var(--muted-foreground))"
            />
            <Bar
              dataKey="legsVolume"
              name="Legs"
              stackId="a"
              fill="hsl(var(--border))"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {categoryDistribution && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">VOLUME DISTRIBUTION</div>
          <div className="flex h-3 overflow-hidden border border-border">
            <div
              className="bg-foreground"
              style={{ width: `${categoryDistribution.push}%` }}
            />
            <div
              className="bg-muted-foreground"
              style={{ width: `${categoryDistribution.pull}%` }}
            />
            <div
              className="bg-border"
              style={{ width: `${categoryDistribution.legs}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span>Push {categoryDistribution.push}%</span>
            <span>Pull {categoryDistribution.pull}%</span>
            <span>Legs {categoryDistribution.legs}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
