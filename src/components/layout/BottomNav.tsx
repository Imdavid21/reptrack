import { Home, Dumbbell, BarChart3, History, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';

function formatElapsedTime(startTime: Date): string {
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function BottomNav() {
  const { draft } = useDraftWorkout();
  const [elapsed, setElapsed] = useState<string | null>(null);

  // Update elapsed time every second when workout is active
  useEffect(() => {
    if (!draft?.workoutStartTime) {
      setElapsed(null);
      return;
    }

    const startTime = new Date(draft.workoutStartTime);
    const updateTime = () => setElapsed(formatElapsedTime(startTime));
    updateTime();

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [draft?.workoutStartTime]);

  const navItems = [
    { to: '/', icon: Home, label: 'Today' },
    { to: '/log', icon: Dumbbell, label: elapsed || 'Workout' },
    { to: '/insights', icon: BarChart3, label: 'Insights' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="tab-bar z-50">
      <div className="flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('tab-item min-w-[48px]', isActive && 'tab-item-active')
            }
          >
            <Icon className="h-5 w-5" />
            <span className={cn(
              "text-2xs mt-1 tabular-nums",
              to === '/log' && elapsed && "text-primary font-medium"
            )}>
              {label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
