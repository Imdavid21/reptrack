import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isToday } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  date: Date;
  onChange: (date: Date) => void;
  /** Popover alignment. */
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * Compact, reusable date control for back-dating any log (workout, water,
 * food, activity, sleep, weight). Defaults to today; future dates disabled.
 * Shows a clear "back-dated" state when a past date is selected.
 */
export function LogDateChip({ date, onChange, align = 'end', className }: Props) {
  const [open, setOpen] = useState(false);
  const today = isToday(date);
  const label = today ? 'Today' : format(date, 'EEE, MMM d');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Log date: ${label}. Tap to change.`}
          className={
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ' +
            (today
              ? 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              : 'border-energy/40 bg-energy-soft text-energy-ink') +
            (className ? ' ' + className : '')
          }
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {label}
          {!today && <span className="font-semibold">· back-dated</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(d);
              setOpen(false);
            }
          }}
          disabled={{ after: new Date() }}
          defaultMonth={date}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
