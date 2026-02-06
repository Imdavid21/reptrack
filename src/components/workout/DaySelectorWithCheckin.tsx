import { useState, useEffect } from 'react';
import { defaultRoutine } from '@/lib/workoutPresets';
import { getSplitDays } from '@/lib/splitTemplates';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useWorkouts } from '@/hooks/useWorkouts';

// Map weekday (0=Sun, 1=Mon, ...) to workout day key
function getDefaultDayForDate(date: Date, numDays: number): string | null {
  const dayOfWeek = date.getDay();
  // Simple mapping: Mon=Day 1, Tue=Day 2, etc.
  // Adjust logic if needed for specific splits, but this is a reasonable default
  if (dayOfWeek === 0) return null; // Sunday
  if (dayOfWeek > numDays) return null; // If split has fewer days than weekday index
  return `Day ${dayOfWeek}`;
}

interface DaySelectorWithCheckinProps {
  selectedDay: string;
  onSelect: (day: string, date: Date, weekNumber: number) => void;
  onQuickLog?: () => void;
}

export function DaySelectorWithCheckin({
  selectedDay,
  onSelect,
  onQuickLog
}: DaySelectorWithCheckinProps) {
  const { preferences } = useUserPreferences();
  const splitDays = preferences ? getSplitDays(preferences.training_split) : defaultRoutine.days;
  const days = Object.entries(splitDays);
  const { workouts } = useWorkouts();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Calculate week number based on past workout data
  const getWeekFromPastData = (): number => {
    if (!workouts || workouts.length === 0) {
      return 1; // Start at week 1 if no data
    }

    // Get the most recent workout's week number
    const mostRecentWorkout = workouts[0]; // Already sorted desc by date
    const lastWeek = mostRecentWorkout.week_number;

    // Check if last workout was today - if so, same week
    const lastWorkoutDate = new Date(mostRecentWorkout.date).toDateString();
    const today = new Date().toDateString();

    if (lastWorkoutDate === today) {
      return lastWeek;
    }

    // Check if we should increment week based on new week starting
    const lastWorkoutDateObj = new Date(mostRecentWorkout.date);
    const daysSince = Math.floor((Date.now() - lastWorkoutDateObj.getTime()) / (1000 * 60 * 60 * 24));

    // If it's been 7+ days, increment week
    if (daysSince >= 7) {
      return Math.min(12, lastWeek + 1);
    }

    return lastWeek;
  };

  const [weekNumber, setWeekNumber] = useState<number>(1);

  // Update week number when workouts data loads
  useEffect(() => {
    setWeekNumber(getWeekFromPastData());
  }, [workouts]);

  // Auto-select workout day based on weekday on mount
  useEffect(() => {
    const defaultDay = getDefaultDayForDate(selectedDate, days.length);
    if (defaultDay && !selectedDay && splitDays[defaultDay]) {
      onSelect(defaultDay, selectedDate, weekNumber);
    }
  }, [preferences]);

  const handleDaySelect = (dayKey: string) => {
    onSelect(dayKey, selectedDate, weekNumber);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleWeekChange = (delta: number) => {
    setWeekNumber(prev => Math.max(1, Math.min(12, prev + delta)));
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const phase = Math.ceil(weekNumber / 4);

  // Dynamic grid columns based on day count
  const gridCols = days.length === 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-4">
      {/* Compact Header Row */}
      <div className="flex items-center justify-between gap-3">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-full transition-colors hover:bg-muted",
              !isToday && "border-primary text-primary"
            )}>
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium">
                {isToday ? 'Today' : format(selectedDate, 'MMM d')}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date > new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground text-xs">P{phase} W</span>
          <button
            onClick={() => handleWeekChange(-1)}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            −
          </button>
          <span className="font-bold tabular-nums w-5 text-center">{weekNumber}</span>
          <button
            onClick={() => handleWeekChange(1)}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            +
          </button>
        </div>
      </div>

      {/* Dynamic Workout Grid */}
      <div className={cn("grid gap-2", gridCols)}>
        {days.map(([dayKey, dayData]) => (
          <button
            key={dayKey}
            onClick={() => handleDaySelect(dayKey)}
            className={cn(
              'btn-brutalist text-center p-3 transition-all',
              selectedDay === dayKey && 'btn-primary'
            )}
          >
            <div className="font-bold text-sm">{dayData.name}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {dayData.focus}
            </div>
          </button>
        ))}
      </div>

      {/* Quick Log - Minimal */}
      {onQuickLog && (
        <button
          onClick={onQuickLog}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip exercises →
        </button>
      )}
    </div>
  );
}
