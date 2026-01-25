import { useWorkouts } from '@/hooks/useWorkouts';
import { ASCIIProgress } from '@/components/ui/ASCIIProgress';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { workouts } = useWorkouts();
  const totalSessions = workouts.length;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background px-8 py-4">
      <div className="flex items-center justify-between">
        {title ? (
          <h1 className="text-sm font-bold tracking-widest">{title}</h1>
        ) : (
          <div className="font-bold tracking-widest text-sm">
            REPS & REMINDERS
          </div>
        )}
        <div className="text-right font-mono text-xs text-muted-foreground">
          {totalSessions}/72
        </div>
      </div>
      <div className="mt-2">
        <ASCIIProgress value={totalSessions} max={72} width={30} showPercent={false} />
      </div>
    </header>
  );
}
