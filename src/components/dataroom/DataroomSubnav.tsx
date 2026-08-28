import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ITEMS = [
  { label: 'Overview', path: '/app/dataroom' },
  { label: 'Body', path: '/app/dataroom/body' },
  { label: 'Training', path: '/app/dataroom/training' },
  { label: 'Nutrition', path: '/app/dataroom/nutrition' },
  { label: 'Recovery', path: '/app/dataroom/recovery' },
  { label: 'Activity', path: '/app/dataroom/activity' },
  { label: 'History', path: '/app/dataroom/history' },
  { label: 'Records', path: '/app/dataroom/records' },
  { label: 'Explore', path: '/app/dataroom/explore' },
  { label: 'Lab', path: '/app/dataroom/lab' },
] as const;

function isActive(pathname: string, path: string) {
  if (path === '/app/dataroom') return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function DataroomSubnav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav aria-label="Dataroom sections" className="sticky top-0 z-30 -mx-2 mb-4 border-y border-border bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
        {ITEMS.map(item => {
          const active = isActive(pathname, item.path);
          return (
            <button
              key={item.path}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(item.path)}
              className={cn(
                'min-h-9 shrink-0 rounded-xl px-3 text-xs font-semibold transition-colors',
                active ? 'bg-foreground text-background' : 'bg-muted/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
