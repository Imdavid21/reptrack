import { useMemo } from 'react';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

    return (
      <div className="border border-border bg-card p-3 text-xs">
        <p className="font-medium mb-2">Week of {label}</p>
        <div className="space-y-1">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center gap-2">
              <div 
                className="w-2 h-2" 
                style={{ backgroundColor: p.stroke }}
              />
              <span className="text-muted-foreground">{p.name}:</span>
              <span className="font-medium">{formatVolume(p.value)} kg</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-2 pt-2">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium ml-2">{formatVolume(total)} kg</span>
        </div>
      </div>
    );
  };

  const renderLegend = () => (
    <div className="flex justify-center gap-6 text-xs mt-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-[2px] bg-foreground" />
        <span>Push</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-[2px] bg-muted-foreground" />
        <span>Pull</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-[2px] bg-accent" />
        <span>Legs</span>
      </div>
    </div>
  );

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

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            <Line
              type="monotone"
              dataKey="pushVolume"
              name="Push"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--foreground))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="pullVolume"
              name="Pull"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="legsVolume"
              name="Legs"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--accent))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {renderLegend()}

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
              className="bg-accent"
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
