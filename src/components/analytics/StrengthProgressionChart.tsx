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

// Color palette for different exercises
const EXERCISE_COLORS: Record<string, string> = {
  'Incline DB Press': 'hsl(var(--chart-1))',
  'Incline Barbell Bench': 'hsl(var(--chart-2))',
  'Flat DB Bench': 'hsl(var(--chart-3))',
  'Flat Barbell Bench': 'hsl(var(--chart-4))',
  'Deadlift': 'hsl(var(--chart-5))',
  'Overhead Press': 'hsl(var(--primary))',
  'DB Shoulder Press': 'hsl(var(--muted-foreground))',
  'Leg Press': 'hsl(var(--heat-2))',
  'Goblet Squat': 'hsl(var(--heat-3))',
  'Barbell Squat': 'hsl(var(--heat-4))',
  'Barbell Row': 'hsl(var(--foreground))',
};

export function StrengthProgressionChart() {
  const { data: progressions, isLoading } = useExerciseProgression();
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  // Initialize selected exercises when data loads
  const availableExercises = useMemo(() => {
    if (!progressions) return [];
    return progressions.map(p => p.exerciseName);
  }, [progressions]);

  // Auto-select first 3 exercises if none selected
  const activeExercises = useMemo(() => {
    if (selectedExercises.size === 0 && availableExercises.length > 0) {
      return new Set(availableExercises.slice(0, 3));
    }
    return selectedExercises;
  }, [selectedExercises, availableExercises]);

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

  // Transform data for recharts - need one object per week with all exercise values
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

  const hasEnoughData = chartData.length >= 1;

  return (
    <div className="card-brutalist">
      <h3 className="section-header">STRENGTH PROGRESSION (KG)</h3>
      
      {/* Exercise selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableExercises.map(name => (
          <button
            key={name}
            onClick={() => toggleExercise(name)}
            className={cn(
              'px-2 py-1 text-xs border transition-colors',
              activeExercises.has(name)
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {!hasEnoughData || filteredProgressions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {filteredProgressions.length === 0 
              ? 'Select exercises to view progression' 
              : 'Log more workouts to see progression charts'}
          </p>
        </div>
      ) : (
        <>
          <div className="h-[250px] -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 0,
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                {filteredProgressions.map(p => (
                  <Line
                    key={p.exerciseName}
                    type="monotone"
                    dataKey={p.exerciseName}
                    stroke={EXERCISE_COLORS[p.exerciseName] || 'hsl(var(--foreground))'}
                    strokeWidth={2}
                    dot={{ r: 3, fill: EXERCISE_COLORS[p.exerciseName] || 'hsl(var(--foreground))' }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 text-xs">
            {filteredProgressions.map(p => (
              <div key={p.exerciseName} className="flex items-center gap-2">
                <div
                  className="w-3 h-0.5"
                  style={{ backgroundColor: EXERCISE_COLORS[p.exerciseName] || 'hsl(var(--foreground))' }}
                />
                {p.exerciseName}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
