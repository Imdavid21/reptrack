import { Home, Dumbbell, BarChart3, History, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Today' },
  { to: '/log', icon: Dumbbell, label: 'Workout' },
  { to: '/insights', icon: BarChart3, label: 'Insights' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
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
            <span className="text-2xs mt-1">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
