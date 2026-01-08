import { useWorkouts } from '@/hooks/useWorkouts';

interface HeaderProps {
  title?: string;
}

export function Header({ title = 'FitTrack' }: HeaderProps) {
  const { workouts } = useWorkouts();
  const totalSessions = workouts.length;
  const progressPercent = Math.min((totalSessions / 72) * 100, 100);

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border px-5 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
        <span className="text-sm text-muted-foreground tabular-nums">
          {totalSessions}/72
        </span>
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