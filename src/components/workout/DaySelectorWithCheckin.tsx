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

function getDefaultDayForDate(date: Date, numDays: number): string | null {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) return null;
  if (dayOfWeek > numDays) return null;
  return `Day ${dayOfWeek}`;
}

interface DaySelectorWithCheckinProps {
  selectedDay: string;
  onSelect: (day: string, date: Date, weekNumber: number) => void;
}

export function DaySelectorWithCheckin({
  selectedDay,
  onSelect,
}: DaySelectorWithCheckinProps) {
  const { preferences } = useUserPreferences();
  const splitDays = preferences ? getSplitDays(preferences.training_split) : defaultRoutine.days;
  const days = Object.entries(splitDays);
  const { workouts } = useWorkouts();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getWeekFromPastData = (): number => {
    if (!workouts || workouts.length === 0) return 1;
    const mostRecentWorkout = workouts[0];
    const lastWeek = mostRecentWorkout.week_number;
    const lastWorkoutDate = new Date(mostRecentWorkout.date).toDateString();
    const today = new Date().toDateString();
    if (lastWorkoutDate === today) return lastWeek;
    const lastWorkoutDateObj = new Date(mostRecentWorkout.date);
    const daysSince = Math.floor((Date.now() - lastWorkoutDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 7) return Math.min(12, lastWeek + 1);
    return lastWeek;
  };

  const [weekNumber, setWeekNumber] = useState<number>(1);

  useEffect(() => {
    setWeekNumber(getWeekFromPastData());
  }, [workouts]);

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

  // Dynamic grid: 2 cols for 3-4 days, 3 cols for 5-6 days
  const gridCols = days.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-5">
      {/* Date & Week Row */}
      <div className="flex items-center justify-between gap-3">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-full transition-colors hover:bg-muted",
              !isToday && "border-foreground text-foreground"
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
          <span className="text-muted-foreground text-xs font-medium">P{phase} W</span>
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

      {/* Workout Day Grid - Dark cards */}
      <div className={cn("grid gap-2.5", gridCols)}>
        {days.map(([dayKey, dayData]) => {
          const isSelected = selectedDay === dayKey;

          return (
            <button
              key={dayKey}
              onClick={() => handleDaySelect(dayKey)}
              className={cn(
                'relative text-center p-4 rounded-xl transition-all active:scale-[0.97]',
                isSelected
                  ? 'bg-foreground text-background ring-2 ring-foreground ring-offset-2 ring-offset-background'
                  : 'bg-foreground text-background hover:opacity-90'
              )}
            >
              <div className="font-bold text-sm">{dayData.name}</div>
              <div className="text-[11px] opacity-60 mt-0.5 truncate">
                {dayData.focus}
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}
