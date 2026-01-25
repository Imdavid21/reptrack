import { useMemo } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export function Heatmap() {
  const { workouts } = useWorkouts();

  const { weeks } = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subDays(today, 90), { weekStartsOn: 1 });
    const cells: { date: string; intensity: number }[] = [];
    
    // Create workout lookup
    const workoutDates = new Set(workouts.map(w => w.date));

    // Generate 13 weeks of data
    for (let i = 0; i < 91; i++) {
      const date = addDays(startDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasWorkout = workoutDates.has(dateStr);
      
      cells.push({
        date: dateStr,
        intensity: hasWorkout ? 4 : 0,
      });
    }

    // Group by week
    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return { cells, weeks };
  }, [workouts]);

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 0: return 'bg-heat-0';
      case 1: return 'bg-heat-1';
      case 2: return 'bg-heat-2';
      case 3: return 'bg-heat-3';
      case 4: return 'bg-heat-4';
      default: return 'bg-heat-0';
    }
  };

  return (
    <div className="card-brutalist">
      <h3 className="section-header">90-DAY ACTIVITY</h3>
      
      {/* Full-width responsive heatmap grid */}
      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="flex justify-between gap-[2px] min-w-0">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[2px] flex-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    'aspect-square w-full min-w-[8px] max-w-[20px] border border-border',
                    getIntensityClass(day.intensity)
                  )}
                  title={`${day.date}${day.intensity > 0 ? ' - Workout logged' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="w-3 h-3 border border-border bg-heat-0" />
        <div className="w-3 h-3 border border-border bg-heat-1" />
        <div className="w-3 h-3 border border-border bg-heat-2" />
        <div className="w-3 h-3 border border-border bg-heat-3" />
        <div className="w-3 h-3 border border-border bg-heat-4" />
        <span>More</span>
      </div>
    </div>
  );
}
