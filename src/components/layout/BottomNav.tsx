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
      <div className="flex items-center justify-around py-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'tab-item min-w-[52px] rounded-xl press-effect',
                isActive && 'tab-item-active'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'p-2 rounded-xl transition-all duration-200',
                    isActive && 'bg-primary/10'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-all duration-200',
                      isActive && 'text-primary'
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-2xs mt-0.5 font-medium transition-colors duration-200',
                    isActive && 'text-primary'
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}