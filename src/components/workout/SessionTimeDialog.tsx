import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current session start time, if known. */
  startTime: Date | null;
  /** Current duration in minutes, if known. */
  durationMinutes: number | null;
  onSave: (startTime: Date, durationMinutes: number) => void;
  onClear?: () => void;
  /** The calendar day the session belongs to. */
  date: Date;
}

function toTimeValue(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Lets the user set (or correct) when a session started and how long it ran.
 * Used for back-dated logging and for editing an already logged workout.
 */
export function SessionTimeDialog({ open, onOpenChange, startTime, durationMinutes, onSave, onClear, date }: Props) {
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState('60');

  useEffect(() => {
    if (!open) return;
    setTime(toTimeValue(startTime ?? new Date()));
    setDuration(String(durationMinutes && durationMinutes > 0 ? durationMinutes : 60));
  }, [open, startTime, durationMinutes]);

  const handleSave = () => {
    const [h, m] = time.split(':').map(Number);
    const start = new Date(date);
    start.setHours(Number.isFinite(h) ? h : 18, Number.isFinite(m) ? m : 0, 0, 0);
    const mins = Math.max(1, Math.round(Number(duration) || 0));
    onSave(start, mins);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Session time</DialogTitle>
          <DialogDescription>Set when the workout started and how long it lasted.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Start time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Duration (min)</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm tabular-nums"
            />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {onClear && (
            <button
              type="button"
              onClick={() => { onClear(); onOpenChange(false); }}
              className="h-11 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use live timer
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold active:scale-[.98] transition-transform"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
