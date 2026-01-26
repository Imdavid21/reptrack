import { useState } from 'react';
import { defaultRoutine } from '@/lib/workoutPresets';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
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

  const isBackdated = selectedDate.toDateString() !== new Date().toDateString();

  return (
    <div className="space-y-4">
      {/* Date & Week Row */}
      <div className="grid grid-cols-2 gap-2">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "btn-brutalist text-left p-4 flex items-center justify-between transition-colors",
              isBackdated && "border-primary bg-primary/5"
            )}>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {isBackdated ? 'BACKFILL DATE' : 'DATE'}
                </div>
                <div className="font-bold">{format(selectedDate, 'MMM d, yyyy')}</div>
                {isBackdated && (
                  <div className="text-xs text-primary mt-1">Logging past workout</div>
                )}
              </div>
              <Calendar className={cn(
                "h-5 w-5",
                isBackdated ? "text-primary" : "text-muted-foreground"
              )} />
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

      {/* Backfill notice */}
      {isBackdated && (
        <div className="border border-primary/30 bg-primary/5 p-3 text-sm flex items-start gap-2">
          <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-primary">Logging for {format(selectedDate, 'EEEE, MMM d')}</div>
            <div className="text-muted-foreground text-xs mt-1">
              You're backfilling a past workout. Select today's date to log for today.
            </div>
          </div>
        </div>
      )}

      {/* Workout Day Grid */}
      <div className="space-y-2">
        <h3 className="section-header">SELECT WORKOUT</h3>
        <div className="grid grid-cols-2 gap-2">
          {days.map(([dayKey, dayData]) => (
            <button
              key={dayKey}
              onClick={() => handleDaySelect(dayKey)}
              className={cn(
                'btn-brutalist text-left p-4 transition-all',
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

      {/* Quick Log Option */}
      {onQuickLog && (
        <button
          onClick={onQuickLog}
          className="w-full border border-dashed border-muted-foreground/50 py-3 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
        >
          QUICK LOG (SKIP EXERCISES)
        </button>
      )}
    </div>
  );
}
