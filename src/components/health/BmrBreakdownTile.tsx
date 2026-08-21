import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { bmrBurnedSoFarTodayPrecise } from '@/lib/metabolism';
import { cn } from '@/lib/utils';

interface Props {
  /** Resting energy expenditure (Mifflin-St Jeor), kcal/day. */
  bmr: number;
  /** Baseline maintenance before deliberate exercise, kcal/day. */
  maintenance: number;
  isOverride: boolean;
  /** Today's real logged activity/workout burn - only meaningful when viewing today. */
  totalBurnedToday: number;
  /** False when viewing a back-dated day - the live "so far" ticker only makes sense for today. */
  isToday: boolean;
  /** Personal calibration applied on top of the formula baseline, kcal/day. Absent for days with no model row. */
  calibrationAdjustment?: number | null;
  /** Formula baseline (BMR x non-exercise factor) before calibration, kcal/day. */
  formulaBaseline?: number | null;
  /** Extra content rendered inside the expanded breakdown (e.g. daily calorie summary). */
  children?: React.ReactNode;
}


/**
 * Tappable maintenance tile.
 *
 * Leads with baseline maintenance rather than BMR: maintenance is the number
 * the deficit and net-calorie math actually run on, while BMR is only one
 * input to it. Showing "BMR" as the headline made the two read like rival
 * answers to the same question.
 *
 * Expanded, it spells out the chain (resting -> daily living -> calibration
 * -> maintenance) and keeps the live "burned so far today" ticker.
 */
export function BmrBreakdownTile({
  bmr,
  maintenance,
  isOverride,
  totalBurnedToday,
  isToday,
  calibrationAdjustment,
  formulaBaseline,
  children,
}: Props) {

  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!expanded || !isToday) return;
    // Whole kcal only: two decimals ticking 10x a second read as noise next
    // to the calm numbers around it. A ~1700 kcal/day BMR gains 1 kcal every
    // ~50s, so a 15s refresh keeps it honest without flickering.
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, [expanded, isToday]);

  const restBurnedSoFar = isToday ? bmrBurnedSoFarTodayPrecise(bmr, now) : bmr;
  const totalBurnedSoFar = restBurnedSoFar + totalBurnedToday;

  // Only show the calibration row when there is a real model row behind it.
  // Without one we can't split "daily living" from "calibration" honestly, so
  // we collapse both into a single derived daily-living figure.
  const hasCalibration =
    typeof calibrationAdjustment === 'number' &&
    calibrationAdjustment !== 0 &&
    typeof formulaBaseline === 'number' &&
    formulaBaseline > 0;
  const dailyLiving = Math.round((hasCalibration ? formulaBaseline! : maintenance) - bmr);

  // A plain div, not a <button>: this tile lives inside CalorieTrackerCompact's
  // CollapsibleTrigger (itself a button, toggling the whole card's expanded
  // state) - nesting a real button inside it is invalid HTML and lets clicks
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
      className="w-full py-3 text-left transition-colors hover:bg-muted/30 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground tracking-wider">Maintenance (before exercise)</div>
          <div className="text-xl font-bold tabular-nums leading-tight text-foreground">
            {maintenance.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">kcal/day</span>
          </div>
          {isOverride && (
            <div className="text-xs text-muted-foreground">Manual override</div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <span>{expanded ? 'Hide' : 'View details'}</span>
          <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Resting burn (BMR)</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{bmr.toLocaleString()} kcal/day</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Daily living (non-exercise)</span>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {dailyLiving >= 0 ? '+' : '-'}{Math.abs(dailyLiving).toLocaleString()} kcal
            </span>
          </div>
          {hasCalibration && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Personal calibration</span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {calibrationAdjustment! >= 0 ? '+' : '-'}{Math.abs(Math.round(calibrationAdjustment!)).toLocaleString()} kcal
              </span>
            </div>
          )}
          {isToday && (
            <div className="flex items-baseline justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">
                {totalBurnedToday > 0 ? 'Burned so far today' : 'Burned at rest so far today'}
              </span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {Math.round(totalBurnedSoFar).toLocaleString()} kcal
              </span>
            </div>
          )}

          <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
            Exercise burn is counted on top of this.
          </p>
        </div>
      )}
    </div>
  );
}
