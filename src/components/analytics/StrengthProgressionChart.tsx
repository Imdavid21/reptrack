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

// Color palette for different exercises
const EXERCISE_COLORS: Record<string, string> = {
  'Incline DB Press': 'hsl(var(--foreground))',
  'Flat Barbell Bench': 'hsl(var(--muted-foreground))',
  'Barbell Squat': 'hsl(var(--heat-2))',
  'Conventional Deadlift': 'hsl(var(--heat-4))',
  'Barbell Row': 'hsl(var(--heat-3))',
  'Overhead Press': 'hsl(var(--primary))',
};

export function StrengthProgressionChart() {
  const { data: progressions, isLoading } = useExerciseProgression();

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

  // Find all unique weeks across all exercises
  const allWeeks = new Set<number>();
  progressions.forEach(p => p.data.forEach(d => allWeeks.add(d.week)));
  const weeks = Array.from(allWeeks).sort((a, b) => a - b);

  // Transform data for recharts - need one object per week with all exercise values
  const chartData = weeks.map(week => {
    const point: Record<string, string | number> = { week: `W${week}` };
    progressions.forEach(p => {
      const weekData = p.data.find(d => d.week === week);
      if (weekData) {
        point[p.exerciseName] = weekData.weight;
      }
    });
    return point;
  });

  // Only show chart if we have at least 2 data points
  if (chartData.length < 2) {
    return (
      <div className="card-brutalist text-center py-8">
        <p className="text-muted-foreground">
          Log more workouts to see progression charts
        </p>
      </div>
    );
  }

  return (
    <div className="card-brutalist">
      <h3 className="section-header">STRENGTH PROGRESSION (KG)</h3>
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
            {progressions.map(p => (
              <Line
                key={p.exerciseName}
                type="monotone"
                dataKey={p.exerciseName}
                stroke={EXERCISE_COLORS[p.exerciseName] || 'hsl(var(--foreground))'}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs">
        {progressions.map(p => (
          <div key={p.exerciseName} className="flex items-center gap-2">
            <div
              className="w-3 h-0.5"
              style={{ backgroundColor: EXERCISE_COLORS[p.exerciseName] || 'hsl(var(--foreground))' }}
            />
            {p.exerciseName}
          </div>
        ))}
      </div>
    </div>
  );
}
