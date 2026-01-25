import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useExerciseProgression } from '@/hooks/useExerciseProgression';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Distinct color palette for exercises
const EXERCISE_COLORS: string[] = [
  'hsl(142, 76%, 36%)',   // Green
  'hsl(221, 83%, 53%)',   // Blue
  'hsl(280, 65%, 60%)',   // Purple
  'hsl(24, 95%, 53%)',    // Orange
  'hsl(346, 87%, 55%)',   // Red/Pink
  'hsl(174, 72%, 40%)',   // Teal
  'hsl(45, 93%, 47%)',    // Yellow
  'hsl(199, 89%, 48%)',   // Cyan
];

export function StrengthProgressionChart() {
  const { data: progressions, isLoading } = useExerciseProgression();
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  // Get available exercises
  const availableExercises = useMemo(() => {
    if (!progressions) return [];
    return progressions.map(p => p.exerciseName);
  }, [progressions]);

  // Default to first 2-3 exercises (not all)
  const activeExercises = useMemo(() => {
    if (selectedExercises.size === 0 && availableExercises.length > 0) {
      return new Set(availableExercises.slice(0, Math.min(3, availableExercises.length)));
    }
    return selectedExercises;
  }, [selectedExercises, availableExercises]);

  // Get color for each exercise by index
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
      <div className="card-brutalist">
        <h3 className="section-header">STRENGTH PROGRESSION (KG)</h3>
        <Skeleton className="h-[250px] w-full" />
      </div>
    );
  }

  if (!progressions || progressions.length === 0) {
    return (
      <div className="card-brutalist text-center py-8">
        <p className="text-muted-foreground">
          Log workouts with weights to see strength progression
        </p>
      </div>
    );
  }

  // Filter to only selected exercises
  const filteredProgressions = progressions.filter(p => activeExercises.has(p.exerciseName));

  // Find all unique weeks across selected exercises
  const allWeeks = new Set<number>();
  filteredProgressions.forEach(p => p.data.forEach(d => allWeeks.add(d.week)));
  const weeks = Array.from(allWeeks).sort((a, b) => a - b);

  // Transform data for recharts
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

  // Calculate dynamic Y-axis domain based on actual data
  const allWeights = filteredProgressions.flatMap(p => p.data.map(d => d.weight));
  const minWeight = allWeights.length > 0 ? Math.min(...allWeights) : 0;
  const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : 100;
  
  // Add padding: 10% below min (but not below 0) and 10% above max
  const yMin = Math.max(0, Math.floor((minWeight * 0.8) / 5) * 5);
  const yMax = Math.ceil((maxWeight * 1.15) / 5) * 5;

  const hasEnoughData = chartData.length >= 1;

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    return (
      <div className="bg-card border border-border p-2">
        <p className="font-mono text-xs mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs flex items-center gap-2">
            <span 
              className="w-2 h-2 inline-block" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-semibold">{entry.value}kg</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="card-brutalist">
      <h3 className="section-header">STRENGTH PROGRESSION (KG)</h3>
      
      {/* Exercise selector - scrollable on small screens */}
      <div className="flex flex-wrap gap-1.5 mb-4 max-h-24 overflow-y-auto">
        {availableExercises.map((name, idx) => (
          <button
            key={name}
            onClick={() => toggleExercise(name)}
            className={cn(
              'px-2 py-1 text-xs border transition-all flex items-center gap-1.5',
              activeExercises.has(name)
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            )}
          >
            <span 
              className="w-2 h-2 flex-shrink-0" 
              style={{ backgroundColor: getExerciseColor(name) }}
            />
            {name}
          </button>
        ))}
      </div>

      {filteredProgressions.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border">
          <p className="text-muted-foreground text-sm">
            Select at least one exercise above
          </p>
        </div>
      ) : !hasEnoughData ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Log more workouts to see progression charts
          </p>
        </div>
      ) : (
        <>
          <div className="h-[220px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip content={renderTooltip} />
                {filteredProgressions.map(p => (
                  <Line
                    key={p.exerciseName}
                    type="monotone"
                    dataKey={p.exerciseName}
                    stroke={getExerciseColor(p.exerciseName)}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: getExerciseColor(p.exerciseName), strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend - only show selected exercises */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs border-t border-border pt-3">
            {filteredProgressions.map(p => (
              <div key={p.exerciseName} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-1"
                  style={{ backgroundColor: getExerciseColor(p.exerciseName) }}
                />
                <span className="text-muted-foreground">{p.exerciseName}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
