import { type ReactNode, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { bmrBurnedSoFarTodayPrecise } from '@/lib/metabolism';
import { cn } from '@/lib/utils';

interface Props {
  /** Resting energy expenditure (Mifflin-St Jeor), kcal/day. */
  bmr: number;
  /** Baseline maintenance before deliberate exercise, kcal/day. */
  maintenance: number;
  isOverride: boolean;
  /** Today's real logged activity/workout burn — only meaningful when viewing today. */
  totalBurnedToday: number;
  /** False when viewing a back-dated day — the live "so far" ticker only makes sense for today. */
  isToday: boolean;
  /** Personal calibration applied on top of the formula baseline, kcal/day. Absent for days with no model row. */
  calibrationAdjustment?: number | null;
  /** Formula baseline (BMR x non-exercise factor) before calibration, kcal/day. */
  formulaBaseline?: number | null;
  /** Additional expenditure details shown only when this tile is expanded. */
  children?: ReactNode;
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
    // A ~1700 kcal/day BMR only moves ~0.02 kcal/sec — ticking the clock
    // every second but displaying whole numbers would show the same value
    // for 50+ seconds at a time and look frozen. 100ms + 2-decimal display
    // (bmrBurnedSoFarTodayPrecise) actually looks live.
    const id = setInterval(() => setNow(new Date()), 100);
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

  return (
    <div className="col-span-2 rounded-xl border border-border bg-muted/20 text-left transition-colors">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(x => !x);
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-2 rounded-xl p-2.5 hover:bg-muted/30"
      >
        <div>
          <div className="text-xs text-muted-foreground tracking-wider">MAINTENANCE (BEFORE EXERCISE)</div>
          <div className="text-xl font-bold tabular-nums leading-tight text-foreground">
            {maintenance.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">kcal/day</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Resting {bmr.toLocaleString()} + daily living
            {isOverride && <span> (override)</span>}
          </div>
        </div>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', expanded && 'rotate-90')} />
      </div>

      {expanded && (
        <div className="mx-2.5 mb-2.5 border-t border-border pt-3 space-y-2.5" onClick={(e) => e.stopPropagation()}>
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
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="text-xs font-semibold text-foreground">Maintenance before exercise</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{maintenance.toLocaleString()} kcal</span>
          </div>

          <div className="pt-1">
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
          </div>
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

          <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
            Workouts, walks, runs and rides are added on top of maintenance, so maintenance itself leaves them out.
          </p>
          {children && <div className="border-t border-border pt-3">{children}</div>}
        </div>
      )}
    </div>
  );
}
