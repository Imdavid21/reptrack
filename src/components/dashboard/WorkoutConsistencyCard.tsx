import { useMemo, useState } from 'react';
import { addDays, format, startOfWeek, subWeeks } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { useWorkouts, type Workout } from '@/hooks/useWorkouts';
import { localDateKey } from '@/lib/dateKey';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const CONSISTENCY_VISIBILITY_KEY = 'fittrack_show_workout_consistency';
const WEEKS_TO_SHOW = 53;

type WorkoutWithSkipState = Workout & { is_skipped?: boolean };

export function WorkoutConsistencyCard() {
  const { workouts, isLoading } = useWorkouts();
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(CONSISTENCY_VISIBILITY_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const { weeks, activeDays, activeThisWeek, maxCount } = useMemo(() => {
    const counts = new Map<string, number>();
    workouts.forEach((workout) => {
      if ((workout as WorkoutWithSkipState).is_skipped) return;
      counts.set(workout.date, (counts.get(workout.date) ?? 0) + 1);
    });

    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    const firstWeekStart = subWeeks(currentWeekStart, WEEKS_TO_SHOW - 1);
    const calendarWeeks = Array.from({ length: WEEKS_TO_SHOW }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDays(firstWeekStart, weekIndex * 7 + dayIndex);
        const key = localDateKey(date);
        return {
          date,
          key,
          count: date > today ? 0 : (counts.get(key) ?? 0),
          isFuture: date > today,
        };
      }),
    );

    const visibleKeys = new Set(calendarWeeks.flat().map((day) => day.key));
    const visibleCounts = [...counts.entries()].filter(([key]) => visibleKeys.has(key));

    return {
      weeks: calendarWeeks,
      activeDays: visibleCounts.filter(([, count]) => count > 0).length,
      activeThisWeek: calendarWeeks.at(-1)?.filter((day) => day.count > 0).length ?? 0,
      maxCount: Math.max(1, ...visibleCounts.map(([, count]) => count)),
    };
  }, [workouts]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    try {
      localStorage.setItem(CONSISTENCY_VISIBILITY_KEY, String(open));
    } catch {
      // Local state still provides a working control if storage is unavailable.
    }
  };

  const intensity = (count: number) => {
    if (count === 0) return 0;
    return Math.max(1, Math.ceil((count / maxCount) * 4));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold">Workout consistency</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {isLoading ? 'Loading activity…' : `${activeDays} active days · ${activeThisWeek} this week`}
          </p>
        </div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`${isOpen ? 'Hide' : 'Show'} workout consistency`}
          >
            {isOpen ? 'Hide' : 'Show'}
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={cn('transition-transform', isOpen && 'rotate-180')}
            />
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="overflow-x-auto pb-1" dir="rtl" aria-label="Workout activity over the last year">
            <div className="grid min-w-[46rem] grid-flow-col grid-rows-[1rem_repeat(7,0.7rem)] gap-1" dir="ltr" role="grid">
              {weeks.map((week, weekIndex) => {
                const firstOfMonth = week.find((day) => day.date.getDate() <= 7);
                return (
                  <div key={week[0].key} className="contents">
                    <span className="text-[9px] leading-none text-muted-foreground" aria-hidden="true">
                      {firstOfMonth ? format(firstOfMonth.date, 'MMM') : ''}
                    </span>
                    {week.map((day) => {
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
            {[0, 1, 2, 3, 4].map((level) => (
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
