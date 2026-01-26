import { useState } from 'react';
import { defaultRoutine } from '@/lib/workoutPresets';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

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
  const days = Object.entries(defaultRoutine.days);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDaySelect = (dayKey: string) => {
    onSelect(dayKey, selectedDate, weekNumber);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

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
            />
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">Week</span>
          <button
            onClick={() => setWeekNumber(Math.max(1, weekNumber - 1))}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            −
          </button>
          <span className="font-bold tabular-nums w-5 text-center">{weekNumber}</span>
          <button
            onClick={() => setWeekNumber(Math.min(12, weekNumber + 1))}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            +
          </button>
        </div>
      </div>

      {/* 3x2 Workout Grid - Primary Focus */}
      <div className="grid grid-cols-3 gap-2">
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
