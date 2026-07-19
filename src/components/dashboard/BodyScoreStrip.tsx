import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, Flame, Moon, Droplets } from 'lucide-react';
import { useBodyOverview } from '@/hooks/useBodyOverview';
import { PillarKey } from '@/lib/bodyScore';
import { haptic } from '@/lib/haptics';

const PILLARS: Array<{ key: PillarKey; icon: typeof Dumbbell; text: string }> = [
  { key: 'training', icon: Dumbbell, text: 'text-energy-ink' },
  { key: 'fuel', icon: Flame, text: 'text-fuel-ink' },
  { key: 'recovery', icon: Moon, text: 'text-recover-ink' },
  { key: 'hydration', icon: Droplets, text: 'text-water-ink' },
];

/**
 * Compact Dashboard entry point to the Body Overview (last 14 days).
 * One glance: overall score + which pillar needs attention; one tap → Insights.
 */
export function BodyScoreStrip() {
  const navigate = useNavigate();
  const { overview, isLoading } = useBodyOverview();

  // Don't take up dashboard space until there's something honest to show.
  if (isLoading || !overview || overview.overall == null) return null;

  return (
    <button
      onClick={() => { haptic('light'); navigate('/app/insights'); }}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/40 active:scale-[0.99] transition-all"
      aria-label={`Body score ${overview.overall} out of 100 — open insights`}
    >
      <div className="h-10 w-10 rounded-full border-2 border-energy flex items-center justify-center shrink-0">
        <span className="text-sm font-bold tabular-nums">{overview.overall}</span>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-xs font-bold uppercase tracking-wider">Body score</div>
        <div className="text-[11px] text-muted-foreground">Last 14 days · tap for full overview</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {PILLARS.map(({ key, icon: Icon, text }) => {
          const score = overview.pillars[key].score;
          const dimmed = score == null || score < 70;
          return (
            <Icon
              key={key}
              className={`h-4 w-4 ${dimmed ? 'text-muted-foreground/40' : text}`}
              aria-label={`${key} ${score ?? 'no data'}`}
            />
          );
        })}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
