import { useMemo } from 'react';
import { addDays, format, startOfWeek, subWeeks } from 'date-fns';
import { useWorkouts, type Workout } from '@/hooks/useWorkouts';
import { localDateKey } from '@/lib/dateKey';
import { cn } from '@/lib/utils';

const WEEKS_TO_SHOW = 53;
type WorkoutWithSkipState = Workout & { is_skipped?: boolean };

export function WorkoutConsistencyMap() {
  const { workouts, isLoading } = useWorkouts();

  const { weeks, maxCount, activeDays, sessions } = useMemo(() => {
    const counts = new Map<string, number>();
    workouts.forEach(workout => {
      if ((workout as WorkoutWithSkipState).is_skipped) return;
      if (!workout.completed_at) return;
      counts.set(workout.date, (counts.get(workout.date) ?? 0) + 1);
    });

    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    const firstWeekStart = subWeeks(currentWeekStart, WEEKS_TO_SHOW - 1);
    const calendarWeeks = Array.from({ length: WEEKS_TO_SHOW }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDays(firstWeekStart, weekIndex * 7 + dayIndex);
        const key = localDateKey(date);
        return { date, key, count: date > today ? 0 : (counts.get(key) ?? 0), isFuture: date > today };
      }),
    );

    const visibleKeys = new Set(calendarWeeks.flat().map(day => day.key));
    const visibleCounts = [...counts.entries()].filter(([key]) => visibleKeys.has(key));
    return {
      weeks: calendarWeeks,
      maxCount: Math.max(1, ...visibleCounts.map(([, count]) => count)),
      activeDays: visibleCounts.filter(([, count]) => count > 0).length,
      sessions: visibleCounts.reduce((sum, [, count]) => sum + count, 0),
    };
  }, [workouts]);

  const intensity = (count: number) => count === 0 ? 0 : Math.max(1, Math.ceil((count / maxCount) * 4));

  return (
    <section className="rounded-[20px] border border-border bg-card p-4" aria-labelledby="consistency-map-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="consistency-map-title" className="type-section-title">Training consistency</h2>
          <p className="type-caption mt-1">{isLoading ? 'Loading…' : `${activeDays} active days · ${sessions} sessions`}</p>
        </div>
        <span className="type-caption shrink-0">1 year</span>
      </div>

      <div className="overflow-x-auto pb-1" dir="rtl" aria-label="Workout activity over the last year">
        <div className="grid min-w-[46rem] grid-flow-col grid-rows-[1rem_repeat(7,0.7rem)] gap-1" dir="ltr" role="grid">
          {weeks.map(week => {
            const firstOfMonth = week.find(day => day.date.getDate() <= 7);
            return (
              <div key={week[0].key} className="contents">
                <span className="text-[9px] leading-none text-muted-foreground" aria-hidden="true">
                  {firstOfMonth ? format(firstOfMonth.date, 'MMM') : ''}
                </span>
                {week.map(day => {
                  const level = intensity(day.count);
                  const label = `${format(day.date, 'MMMM d, yyyy')}: ${day.count} workout${day.count === 1 ? '' : 's'}`;
                  return (
                    <span
                      key={day.key}
                      role="gridcell"
                      title={label}
                      aria-label={label}
                      className={cn(
                        'h-[0.7rem] w-[0.7rem] rounded-[2px] border border-border/40',
                        day.isFuture && 'opacity-30',
                        level === 0 && 'bg-muted/65',
                        level === 1 && 'bg-energy/25',
                        level === 2 && 'bg-energy/45',
                        level === 3 && 'bg-energy/70',
                        level === 4 && 'bg-energy',
                      )}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <span
            key={level}
            className={cn(
              'h-2.5 w-2.5 rounded-[2px] border border-border/40',
              level === 0 && 'bg-muted/65',
              level === 1 && 'bg-energy/25',
              level === 2 && 'bg-energy/45',
              level === 3 && 'bg-energy/70',
              level === 4 && 'bg-energy',
            )}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}
