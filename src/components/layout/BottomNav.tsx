import { Home, Dumbbell, Sparkles, BarChart3, History, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/log', icon: Dumbbell, label: 'Log' },
  { to: '/create', icon: Sparkles, label: 'AI' },
  { to: '/analytics', icon: BarChart3, label: 'Stats' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav className="tab-bar z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('tab-item', isActive && 'tab-item-active')
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-2xs mt-1">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}