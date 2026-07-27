import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { bmrBurnedSoFarToday } from '@/lib/metabolism';
import { cn } from '@/lib/utils';

interface Props {
  bmr: number;
  maintenance: number;
  isOverride: boolean;
  inputs: { weightKg: number; heightCm: number; age: number; gender: string } | null;
  /** Today's real logged activity/workout burn — only meaningful when viewing today. */
  totalBurnedToday: number;
  /** False when viewing a back-dated day — the live "so far" ticker only makes sense for today. */
  isToday: boolean;
}

/**
 * Tappable BMR tile: collapsed it's the same "BMR = MAINTENANCE" summary as
 * before, expanded it shows a live "burned so far today" counter (BMR
 * prorated by how much of the day has elapsed, ticking every second) plus
 * the exact body inputs the number came from — so "why is my maintenance
 * this number" has a real, current answer instead of just a static total.
 */
export function BmrBreakdownTile({ bmr, maintenance, isOverride, inputs, totalBurnedToday, isToday }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!expanded || !isToday) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [expanded, isToday]);

  const restBurnedSoFar = isToday ? bmrBurnedSoFarToday(bmr, now) : bmr;
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
          <div className="text-[10px] text-muted-foreground tracking-wider">BMR = MAINTENANCE</div>
          <div className="text-xl font-bold tabular-nums leading-tight text-foreground">
            {maintenance.toLocaleString()}
            {isOverride && <span className="text-[10px] font-normal text-muted-foreground"> (override)</span>}
          </div>
          <div className="text-[10px] text-muted-foreground">at rest, counted in NET</div>
        </div>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', expanded && 'rotate-90')} />
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2.5" onClick={(e) => e.stopPropagation()}>
          {isToday ? (
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-muted-foreground">Burned at rest so far today</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{restBurnedSoFar.toLocaleString()} kcal</span>
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground">
              Live "so far today" tracking only applies when viewing today.
            </div>
          )}
          {isToday && totalBurnedToday > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-muted-foreground">+ Logged activity today</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{totalBurnedToday.toLocaleString()} kcal</span>
            </div>
          )}
          {isToday && totalBurnedToday > 0 && (
            <div className="flex items-baseline justify-between border-t border-border pt-2">
              <span className="text-[11px] font-semibold text-foreground">Total burned so far</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{totalBurnedSoFar.toLocaleString()} kcal</span>
            </div>
          )}
          {inputs && (
            <div className="pt-2 border-t border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">From your body</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <div>Weight: <span className="text-foreground font-medium">{inputs.weightKg.toFixed(1)} kg</span></div>
                <div>Height: <span className="text-foreground font-medium">{inputs.heightCm} cm</span></div>
                <div>Age: <span className="text-foreground font-medium">{inputs.age}</span></div>
                <div>Gender: <span className="text-foreground font-medium capitalize">{inputs.gender}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
