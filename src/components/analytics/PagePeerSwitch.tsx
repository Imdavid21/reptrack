import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function PagePeerSwitch() {
  return (
    <nav aria-label="Analysis view" className="inline-flex rounded-full border border-border bg-muted/35 p-1">
      {[
        { to: '/app/insights', label: 'Insights' },
        { to: '/app/dataroom', label: 'Data Room' },
      ].map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            isActive ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

