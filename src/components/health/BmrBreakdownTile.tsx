import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { bmrBurnedSoFarTodayPrecise } from '@/lib/metabolism';
import { cn } from '@/lib/utils';

interface Props {
  bmr: number;
  maintenance: number;
  isOverride: boolean;
  /** Today's real logged activity/workout burn — only meaningful when viewing today. */
  totalBurnedToday: number;
  /** False when viewing a back-dated day — the live "so far" ticker only makes sense for today. */
  isToday: boolean;
}

/**
 * Tappable BMR tile: collapsed it's the same "BMR = MAINTENANCE" summary as
 * before, expanded it shows a live "burned so far today" counter (BMR
 * prorated by how much of the day has elapsed, ticking every second) — so
 * "how much have I actually burned" has a real, current answer instead of
 * just a static daily total.
 */
export function BmrBreakdownTile({ bmr, maintenance, isOverride, totalBurnedToday, isToday }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!expanded || !isToday) return;
    // A ~1700 kcal/day BMR only moves ~0.02 kcal/sec — ticking the clock
    // every second but displaying whole numbers would show the same value
    // for 50+ seconds at a time and look frozen. 100ms + 2-decimal display
    // (bmrBurnedSoFarTodayPrecise) actually looks live.
    const id = setInterval(() => setNow(new Date()), 100);
    return () => clearInterval(id);
  }, [expanded, isToday]);

  const restBurnedSoFar = isToday ? bmrBurnedSoFarTodayPrecise(bmr, now) : bmr;
  const totalBurnedSoFar = restBurnedSoFar + totalBurnedToday;

  // A plain div, not a <button>: this tile lives inside CalorieTrackerCompact's
  // CollapsibleTrigger (itself a button, toggling the whole card's expanded
  // state) — nesting a real button inside it is invalid HTML and lets clicks
  // bubble up to toggle the outer card too. stopPropagation below plus a
  // manual button role/keyboard handler gets the same tappable behavior
  // without nesting interactive elements.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(x => !x);
        }
      }}
      className="col-span-2 p-2.5 rounded-xl border border-border bg-muted/20 text-left transition-colors hover:bg-muted/30 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground tracking-wider">BMR ESTIMATE</div>
          <div className="text-xl font-bold tabular-nums leading-tight text-foreground">
            {bmr.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">kcal/day</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Baseline maintenance {maintenance.toLocaleString()} kcal
            {isOverride && <span> (override)</span>}
          </div>
        </div>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', expanded && 'rotate-90')} />
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2.5" onClick={(e) => e.stopPropagation()}>
          {isToday ? (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Burned at rest so far today</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{restBurnedSoFar.toFixed(2)} kcal</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Live "so far today" tracking only applies when viewing today.
            </div>
          )}
          {isToday && totalBurnedToday > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">+ Logged activity today</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{totalBurnedToday.toLocaleString()} kcal</span>
            </div>
          )}
          {isToday && totalBurnedToday > 0 && (
            <div className="flex items-baseline justify-between border-t border-border pt-2">
              <span className="text-xs font-semibold text-foreground">Total burned so far</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{totalBurnedSoFar.toFixed(2)} kcal</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
