import { useWorkouts } from '@/hooks/useWorkouts';
import { Activity } from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export function Header({ title = 'FitTrack' }: HeaderProps) {
  const { workouts } = useWorkouts();
  const totalSessions = workouts.length;
  const progressPercent = Math.min((totalSessions / 72) * 100, 100);

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">
              {totalSessions} of 72 sessions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tabular-nums text-gradient">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>
      <div className="progress-bar mt-3">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}