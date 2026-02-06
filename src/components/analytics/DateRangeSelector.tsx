import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateRange, DATE_PRESETS } from '@/contexts/DateRangeContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';

export function DateRangeSelector() {
  const { dateRange, setDateRange, preset, setPreset } = useDateRange();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
      setPreset('custom');
      setIsCalendarOpen(false);
    } else if (range?.from) {
      setDateRange({ from: range.from, to: range.from });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-lg">
      <div className="flex-1 w-full">
        {/* Preset selector */}
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
            {preset === 'custom' && (
              <SelectItem value="custom" className="text-xs">
                Custom
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 w-full">
        {/* Custom date picker */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full h-8 justify-start text-left font-normal text-xs',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  format(dateRange.from, 'MMM d, yyyy')
                )
              ) : (
                <span>Pick dates</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
