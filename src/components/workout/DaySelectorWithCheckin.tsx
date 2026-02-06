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


  return (
    <div className="space-y-5">
      {/* Date & Week Row */}
      <div className="flex items-center">
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
      </div>

      {/* Workout Day Chips - Horizontal scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {days.map(([dayKey, dayData]) => {
          const isSelected = selectedDay === dayKey;

          return (
            <button
              key={dayKey}
              onClick={() => handleDaySelect(dayKey)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-[0.97]',
                isSelected
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              )}
            >
              {dayData.name}
            </button>
          );
        })}
      </div>

      {/* Selected day details */}
      {selectedDay && splitDays[selectedDay] && (
        <div>
          <h2 className="text-2xl font-bold">{splitDays[selectedDay].name}</h2>
          <p className="text-sm text-muted-foreground">{splitDays[selectedDay].focus}</p>
        </div>
      )}

    </div>
  );
}
