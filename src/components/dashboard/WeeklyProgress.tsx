import { useWorkouts } from '@/hooks/useWorkouts';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getSplitDays } from '@/lib/splitTemplates';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildWeekSchedule(splitDaysCount: number, restDays: number[], splitDays: Record<string, any>) {
  // Map each weekday to either a split day or rest
  const schedule: { day: string; label: string; isRest: boolean }[] = [];
  const splitDayEntries = Object.values(splitDays);
  let splitIdx = 0;

  for (let i = 0; i < 7; i++) {
    const dayOfWeek = (i + 1) % 7; // Mon=1, Tue=2, ..., Sun=0
    const isRest = restDays.includes(dayOfWeek) || splitIdx >= splitDaysCount;

    if (isRest) {
      schedule.push({
        day: WEEKDAY_LABELS[i],
        label: 'Rest',
        isRest: true,
      });
    } else {
      const splitDay = splitDayEntries[splitIdx];
      const name = splitDay?.name || `Day ${splitIdx + 1}`;
      // Extract short label: "Push A" -> "Push", "Upper A" -> "Upper", "Full Body A" -> "Full"
      const shortLabel = name.split(' ')[0];
      schedule.push({
        day: WEEKDAY_LABELS[i],
        label: shortLabel,
        isRest: false,
      });
      splitIdx++;
    }
  }

  return schedule;
}

export function WeeklyProgress() {
  const { workouts } = useWorkouts();
  const { preferences } = useUserPreferences();

  const split = preferences?.training_split || 'ppl6';
  const restDays = (preferences?.rest_days as number[]) || [0];
  const splitDays = getSplitDays(split);
  const splitDaysCount = Object.keys(splitDays).length;

  const weekSchedule = buildWeekSchedule(splitDaysCount, restDays, splitDays);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDates = WEEKDAY_LABELS.map((_, i) => addDays(weekStart, i));

  const workoutDatesSet = new Set(
    workouts.map(w => {
      const d = new Date(w.date + 'T00:00:00');
      return format(d, 'yyyy-MM-dd');
    })
  );

  return (
    <div className="card-brutalist">
      <h3 className="section-header mb-3">THIS WEEK</h3>

      <div className="grid grid-cols-7 gap-1">
        {weekSchedule.map((item, i) => {
          const date = weekDates[i];
          date.setHours(0, 0, 0, 0);
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCompleted = workoutDatesSet.has(dateStr);
          const isToday = isSameDay(date, today);
          const isPast = date.getTime() < today.getTime() && !isToday;

          return (
            <div
              key={item.day}
              className={cn(
                'flex flex-col items-center py-2 px-1 border rounded-lg transition-colors',
                isToday && 'border-foreground bg-foreground/5',
                isCompleted && !isToday && 'border-foreground/30 bg-foreground/5',
                !isToday && !isCompleted && 'border-border',
                isPast && !isCompleted && !item.isRest && 'opacity-40'
              )}
            >
              <span className={cn(
                'text-[10px] font-semibold uppercase',
                isToday ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {item.day}
              </span>

              <div className={cn(
                'w-6 h-6 flex items-center justify-center my-1',
                isCompleted && 'text-foreground'
              )}>
                {isCompleted ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : item.isRest ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <span className={cn(
                    'text-xs tabular-nums font-medium',
                    isToday ? 'text-foreground font-bold' : 'text-muted-foreground'
                  )}>
                    {format(date, 'd')}
                  </span>
                )}
              </div>

              <span className={cn(
                'text-[8px] font-medium uppercase tracking-wide truncate w-full text-center',
                isCompleted ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {item.isRest ? 'REST' : item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
