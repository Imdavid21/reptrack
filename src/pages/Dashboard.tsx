import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkouts } from '@/hooks/useWorkouts';
import { ASCIIProgress } from '@/components/ui/ASCIIProgress';
import { startOfWeek, format, isSameDay, addDays } from 'date-fns';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKOUT_DAYS = [
  { day: 'Mon', label: 'PUSH' },
  { day: 'Tue', label: 'PULL' },
  { day: 'Wed', label: 'LEGS' },
  { day: 'Thu', label: 'PUSH' },
  { day: 'Fri', label: 'PULL' },
  { day: 'Sat', label: 'LEGS' },
  { day: 'Sun', label: 'REST' },
];

export default function Dashboard() {
  const { workouts } = useWorkouts();

  const totalSessions = workouts.length;
  const targetSessions = 72;
  const currentWeek = Math.ceil(totalSessions / 6) || 1;
  
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get this week's dates and workouts
  const weekDates = WORKOUT_DAYS.map((_, i) => addDays(weekStart, i));
  const workoutDatesSet = new Set(
    workouts.map(w => format(new Date(w.date + 'T00:00:00'), 'yyyy-MM-dd'))
  );

  // Calculate weekly volume
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const thisWeekWorkouts = workouts.filter(w => w.date >= weekStartStr);
  const thisWeekVolume = thisWeekWorkouts.reduce((sum, w) => {
    // Sum up volume from exercises
    return sum;
  }, 0);

  // Last week comparison (placeholder)
  const lastWeekVolume = 25400;
  const volumeChange = thisWeekVolume > 0 ? ((thisWeekVolume - lastWeekVolume) / lastWeekVolume * 100).toFixed(1) : 0;

  const sessionsThisWeek = thisWeekWorkouts.length;

  return (
    <MainLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="text-center">
          <div className="label-v3">{format(today, 'EEEE, MMM d, yyyy').toUpperCase()}</div>
        </div>

        <div className="divider-v3" />

        {/* Program progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="label-v3">WEEK {currentWeek} OF 12</span>
            <span className="font-mono text-sm">{totalSessions}/72 SESSIONS</span>
          </div>
          <ASCIIProgress value={totalSessions} max={72} />
        </div>

        <div className="divider-v3" />

        {/* Today's Status */}
        <div>
          <div className="label-v3 mb-2">TODAY</div>
          <div className="text-h2 font-bold">
            {isSameDay(today, weekDates[6]) ? 'REST DAY' : 'TRAINING DAY'}
          </div>
        </div>

        <div className="divider-v3" />

        {/* This Week Grid */}
        <div>
          <div className="label-v3 mb-3">THIS WEEK</div>
          <div className="space-y-1 font-mono text-sm">
            {WORKOUT_DAYS.map((item, i) => {
              const date = weekDates[i];
              date.setHours(0, 0, 0, 0);
              const dateStr = format(date, 'yyyy-MM-dd');
              const isCompleted = workoutDatesSet.has(dateStr);
              const isToday = isSameDay(date, today);
              const isRest = item.day === 'Sun';

              return (
                <div 
                  key={item.day}
                  className={cn(
                    "flex items-center justify-between py-2 border-b border-border",
                    isToday && "bg-foreground/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("w-8", isToday && "font-bold")}>{item.day.toUpperCase()}</span>
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isRest ? (
                      <span className="text-muted-foreground">────</span>
                    ) : isCompleted ? (
                      <>
                        <span className="tabular-nums">4240KG</span>
                        <Check className="h-4 w-4" />
                      </>
                    ) : (
                      <span className="text-muted-foreground">·</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly total */}
        <div className="stat-v3">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-v3-label">THIS WEEK</div>
              <div className="stat-v3-value">{sessionsThisWeek}/6</div>
            </div>
            <div className="text-right">
              <div className="stat-v3-label">SESSIONS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Link
        to="/log"
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-foreground text-background flex items-center justify-center"
        aria-label="Log workout"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </MainLayout>
  );
}
