import { useWorkouts } from '@/hooks/useWorkouts';
import { Logo } from './Logo';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { workouts } = useWorkouts();
  const totalSessions = workouts.length;
  const progressPercent = Math.min((totalSessions / 72) * 100, 100);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        {title ? (
          <h1 className="text-sm font-bold tracking-widest">{title}</h1>
        ) : (
          <Logo />
        )}
        <div className="text-right">
          <span className="text-xs text-muted-foreground">
            {totalSessions}/72 SESSIONS
          </span>
        </div>
      </div>
      <div className="progress-bar mt-2">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}
