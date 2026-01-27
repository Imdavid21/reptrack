import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useExerciseProgression } from '@/hooks/useExerciseProgression';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Soft pastel color palette for exercises
const EXERCISE_COLORS: { stroke: string; fill: string }[] = [
  { stroke: 'hsl(var(--insight-lavender))', fill: 'hsl(var(--insight-lavender) / 0.2)' },
  { stroke: 'hsl(var(--insight-mint))', fill: 'hsl(var(--insight-mint) / 0.2)' },
  { stroke: 'hsl(var(--insight-coral))', fill: 'hsl(var(--insight-coral) / 0.2)' },
  { stroke: 'hsl(var(--insight-blue))', fill: 'hsl(var(--insight-blue) / 0.2)' },
  { stroke: 'hsl(var(--insight-pink))', fill: 'hsl(var(--insight-pink) / 0.2)' },
  { stroke: 'hsl(var(--insight-yellow))', fill: 'hsl(var(--insight-yellow) / 0.2)' },
];

export function StrengthProgressionChart() {
  const { dateRange } = useDateRange();
  const { data: progressions, isLoading } = useExerciseProgression(dateRange);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  const availableExercises = useMemo(() => {
    if (!progressions) return [];
    return progressions.map(p => p.exerciseName);
  }, [progressions]);

  const activeExercises = useMemo(() => {
    if (selectedExercises.size === 0 && availableExercises.length > 0) {
      return new Set(availableExercises.slice(0, Math.min(3, availableExercises.length)));
    }
    return selectedExercises;
  }, [selectedExercises, availableExercises]);

  const getExerciseColor = (exerciseName: string) => {
    const index = availableExercises.indexOf(exerciseName);
    return EXERCISE_COLORS[index % EXERCISE_COLORS.length];
  };

  const toggleExercise = (exerciseName: string) => {
    setSelectedExercises(prev => {
      const next = new Set(prev.size === 0 ? availableExercises.slice(0, 3) : prev);
      if (next.has(exerciseName)) {
        next.delete(exerciseName);
      } else {
        next.add(exerciseName);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Strength Progression</h3>
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    );
  }

  if (!progressions || progressions.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5 text-center py-12">
        <p className="text-muted-foreground text-sm">
          Log workouts with weights to see strength progression
        </p>
      </div>
    );
  }

  const filteredProgressions = progressions.filter(p => activeExercises.has(p.exerciseName));
  const allWeeks = new Set<number>();
  filteredProgressions.forEach(p => p.data.forEach(d => allWeeks.add(d.week)));
  const weeks = Array.from(allWeeks).sort((a, b) => a - b);

  const chartData = weeks.map(week => {
    const point: Record<string, string | number> = { week: `W${week}` };
    filteredProgressions.forEach(p => {
      const weekData = p.data.find(d => d.week === week);
      if (weekData) {
        point[p.exerciseName] = weekData.weight;
      }
    });
    return point;
  });

  const allWeights = filteredProgressions.flatMap(p => p.data.map(d => d.weight));
  const minWeight = allWeights.length > 0 ? Math.min(...allWeights) : 0;
  const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : 100;
  const yMin = Math.max(0, Math.floor((minWeight * 0.8) / 5) * 5);
  const yMax = Math.ceil((maxWeight * 1.15) / 5) * 5;

  const hasEnoughData = chartData.length >= 1;

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 p-3">
        <p className="font-medium text-xs mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.stroke }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value}kg</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <h3 className="text-sm font-semibold mb-4">Strength Progression</h3>
      
      {/* Exercise selector */}
      <div className="flex flex-wrap gap-1.5 mb-4 max-h-20 overflow-y-auto">
        {availableExercises.map((name) => {
          const color = getExerciseColor(name);
          return (
            <button
              key={name}
              onClick={() => toggleExercise(name)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full transition-all flex items-center gap-1.5',
                activeExercises.has(name)
                  ? 'bg-card shadow-sm border border-border/50'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              <span 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: color.stroke }}
              />
              {name}
            </button>
          );
        })}
      </div>

      {filteredProgressions.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-border/50">
          <p className="text-muted-foreground text-sm">
            Select at least one exercise above
          </p>
        </div>
      ) : !hasEnoughData ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            Log more workouts to see progression charts
          </p>
        </div>
      ) : (
        <>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  {filteredProgressions.map((p, i) => {
                    const color = getExerciseColor(p.exerciseName);
                    return (
                      <linearGradient key={p.exerciseName} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color.stroke} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color.stroke} stopOpacity={0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <XAxis
                  dataKey="week"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip content={renderTooltip} />
                {filteredProgressions.map((p, i) => {
                  const color = getExerciseColor(p.exerciseName);
                  return (
                    <Area
                      key={p.exerciseName}
                      type="monotone"
                      dataKey={p.exerciseName}
                      stroke={color.stroke}
                      strokeWidth={2}
                      fill={`url(#gradient-${i})`}
                      dot={{ r: 4, fill: color.stroke, strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs border-t border-border/30 pt-3">
            {filteredProgressions.map(p => {
              const color = getExerciseColor(p.exerciseName);
              return (
                <div key={p.exerciseName} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color.stroke }}
                  />
                  <span className="text-muted-foreground">{p.exerciseName}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
