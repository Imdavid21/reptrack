import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface WorkoutTimerProps {
  /** When the workout started */
  startTime: Date | null;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WorkoutTimer({ startTime }: WorkoutTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    // Calculate initial elapsed
    setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) return null;

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span className="text-xs font-medium tabular-nums">{formatElapsed(elapsed)}</span>
    </div>
  );
}
