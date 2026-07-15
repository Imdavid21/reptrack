import { useNavigate } from 'react-router-dom';
import { CalendarClock, Dumbbell, Moon, Beef, ChevronRight } from 'lucide-react';
import { useCoachPrompts } from '@/hooks/useCoachPrompts';
import type { CoachPrompt } from '@/lib/coachPrompts';
import { haptic } from '@/lib/haptics';

const META: Record<CoachPrompt['id'], { icon: typeof Dumbbell; route: string }> = {
  'no-activity': { icon: CalendarClock, route: '/app/log' },
  'leg-ratio': { icon: Dumbbell, route: '/app/log' },
  'log-gaps': { icon: Moon, route: '/app' },
  'protein-floor': { icon: Beef, route: '/app' },
};

/**
 * In-app coach nudges (§4/§5) surfaced as tappable banners: nothing logged
 * today, leg volume behind, sleep/weight gaps, and (in a cut) low protein.
 */
export function CoachPrompts() {
  const navigate = useNavigate();
  const prompts = useCoachPrompts();

  if (prompts.length === 0) return null;

  return (
    <div className="space-y-2">
      {prompts.map((p) => {
        const { icon: Icon, route } = META[p.id];
        const warn = p.severity === 'warn';
        return (
          <button
            key={p.id}
            onClick={() => { haptic('light'); navigate(route); }}
            className={
              'w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors active:scale-[0.99] ' +
              (warn ? 'border-fuel/30 bg-fuel-soft hover:bg-fuel-soft/70' : 'border-border bg-card hover:bg-muted/40')
            }
          >
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${warn ? 'bg-fuel/15' : 'bg-muted'}`}>
              <Icon className={`h-4 w-4 ${warn ? 'text-fuel-ink' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight">{p.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{p.detail}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </button>
        );
      })}
    </div>
  );
}
