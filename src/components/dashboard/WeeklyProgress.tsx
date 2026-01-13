import { useWorkouts } from '@/hooks/useWorkouts';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKOUT_DAYS = [
  { day: 'Mon', label: 'Push A' },
  { day: 'Tue', label: 'Pull A' },
  { day: 'Wed', label: 'Legs A' },
  { day: 'Thu', label: 'Push B' },
  { day: 'Fri', label: 'Pull B' },
  { day: 'Sat', label: 'Legs B' },
  { day: 'Sun', label: 'Rest' },
];

export function WeeklyProgress() {
  const { workouts } = useWorkouts();
  
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const today = new Date();
  
  // Get workouts for this week
  const weekDates = WORKOUT_DAYS.map((_, i) => addDays(weekStart, i));
  const workoutDatesSet = new Set(workouts.map(w => w.date));

  return (
    <div className="card-brutalist">
      <h3 className="section-header">THIS WEEK</h3>
      
      <div className="grid grid-cols-7 gap-1">
        {WORKOUT_DAYS.map((item, i) => {
          const date = weekDates[i];
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCompleted = workoutDatesSet.has(dateStr);
          const isToday = isSameDay(date, today);
          const isPast = date < today && !isToday;
          const isRest = item.day === 'Sun';

          return (
            <div
              key={item.day}
              className={cn(
                'flex flex-col items-center p-2 border transition-colors',
                isToday && 'border-primary bg-primary/5',
                isCompleted && 'border-primary/50 bg-primary/10',
                !isToday && !isCompleted && 'border-border',
                isPast && !isCompleted && !isRest && 'opacity-50'
              )}
            >
              <span className={cn(
                'text-[10px] font-medium',
                isToday && 'text-primary'
              )}>
                {item.day}
              </span>
              
              <div className={cn(
                'w-6 h-6 flex items-center justify-center mt-1',
                isCompleted && 'text-primary'
              )}>
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isRest ? (
                  <span className="text-[10px] text-muted-foreground">—</span>
                ) : (
                  <span className={cn(
                    'text-xs tabular-nums',
                    isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                  )}>
                    {format(date, 'd')}
                  </span>
                )}
              </div>
              
              <span className="text-[8px] text-muted-foreground mt-1 truncate w-full text-center">
                {isRest ? 'REST' : item.label.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
