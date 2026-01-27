import { Home, Dumbbell, BarChart3, History, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWorkouts } from '@/hooks/useWorkouts';
import { format } from 'date-fns';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export function BottomNav() {
  const { workouts } = useWorkouts();
  
  // Get today's completed workout duration
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayWorkout = workouts.find(w => w.date === today);
  const duration = todayWorkout?.workout_duration_minutes;
  const durationLabel = duration ? formatDuration(duration) : null;

  const navItems = [
    { to: '/', icon: Home, label: 'Today' },
    { to: '/log', icon: Dumbbell, label: durationLabel || 'Workout' },
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
              to === '/log' && durationLabel && "text-primary font-medium"
            )}>
              {label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
