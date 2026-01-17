import { useState } from 'react';
import { defaultRoutine } from '@/lib/workoutPresets';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface DaySelectorProps {
  selectedDay: string;
  onSelect: (day: string, date: Date, weekNumber: number) => void;
}

export function DaySelector({ selectedDay, onSelect }: DaySelectorProps) {
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

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="space-y-2">
        <h3 className="section-header">WORKOUT DATE</h3>
        <div className="grid grid-cols-2 gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="btn-brutalist text-left p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">DATE</div>
                  <div className="font-bold">{format(selectedDate, 'MMM d, yyyy')}</div>
                </div>
                <Calendar className="h-5 w-5 text-muted-foreground" />
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

          <div className="btn-brutalist p-4">
            <div className="text-xs text-muted-foreground mb-1">WEEK</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekNumber(Math.max(1, weekNumber - 1))}
                className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors"
              >
                -
              </button>
              <span className="font-bold text-xl tabular-nums w-8 text-center">
                {weekNumber}
              </span>
              <button
                onClick={() => setWeekNumber(Math.min(12, weekNumber + 1))}
                className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workout Day Selector */}
      <div className="space-y-2">
        <h3 className="section-header">SELECT WORKOUT DAY</h3>
        
        <div className="grid grid-cols-2 gap-2">
          {days.map(([dayKey, dayData]) => (
            <button
              key={dayKey}
              onClick={() => handleDaySelect(dayKey)}
              className={cn(
                'btn-brutalist text-left p-4',
                selectedDay === dayKey && 'btn-primary'
              )}
            >
              <div className="text-xs text-muted-foreground mb-1">
                {dayKey.toUpperCase()}
              </div>
              <div className="font-bold">{dayData.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {dayData.focus}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
