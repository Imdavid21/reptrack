import { useMemo } from 'react';
import { format } from 'date-fns';
import { Flame, Utensils, TrendingDown, Check } from 'lucide-react';
import { useMeals } from '@/hooks/useMeals';
import { useCalorieBurn } from '@/hooks/useCalorieBurn';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLogDate } from '@/contexts/LogDateContext';
import { computeCalorieTarget } from '@/lib/calorieTarget';

/**
 * Homepage headline: "calories left to burn today" — the single number that
 * says how much more activity is needed to stay on the (deficit-adjusted)
 * target. Falls back to remaining eating budget when already under target.
 * Reads the shared dashboard date, so it reflects a back-dated day too.
 */
export function BurnTargetHero() {
  const { logDate, isBackDated } = useLogDate();
  const mealsDate = isBackDated ? logDate : undefined;
  const { totalCalories } = useMeals(mealsDate);
  const { totalBurned } = useCalorieBurn(mealsDate);
  const { preferences } = useUserPreferences();

  const t = useMemo(() => computeCalorieTarget({
    eaten: totalCalories,
    burned: totalBurned,
    dailyGoal: preferences?.daily_calorie_goal ?? 2000,
    deficitMode: preferences?.deficit_mode_enabled ?? false,
    deficitTarget: preferences?.daily_deficit_target ?? 500,
    maintenance: preferences?.maintenance_calories ?? null,
  }), [totalCalories, totalBurned, preferences]);

  const needsBurn = t.burnNeeded > 0;
  // net vs goal for the progress bar (clamped, never negative)
  const pct = Math.max(0, Math.min((t.net / Math.max(t.goal, 1)) * 100, 100));
  const over = t.net > t.goal;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* 1 — Date header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {isBackDated ? format(logDate, 'EEE, MMM d') : 'Today'}
        </span>
        {preferences?.deficit_mode_enabled && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-fuel-ink">
            <TrendingDown className="h-3 w-3" /> DEFICIT
          </span>
        )}
      </div>

      {/* 2 — Hero number */}
      <div className="mt-2">
        {needsBurn ? (
          <>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold tabular-nums leading-none text-fuel-ink">{t.burnNeeded.toLocaleString()}</span>
              <span className="text-sm font-semibold text-muted-foreground mb-1">kcal to burn</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Left to burn today to hit your {t.goal.toLocaleString()} kcal target. A workout or activity gets you there.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold tabular-nums leading-none text-energy-ink">{t.remainingBudget.toLocaleString()}</span>
              <span className="text-sm font-semibold text-muted-foreground mb-1">kcal budget left</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-energy-ink" />
              On track — you can eat this much more before extra activity is needed.
            </p>
          </>
        )}
      </div>

      {/* 3 — Eaten / burned stats */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="rounded-xl bg-fuel-soft p-2.5">
          <div className="flex items-center gap-1.5 text-fuel-ink">
            <Utensils className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Eaten</span>
          </div>
          <div className="text-lg font-bold tabular-nums mt-0.5">{totalCalories.toLocaleString()}</div>
        </div>
        <div className="rounded-xl bg-energy-soft p-2.5">
          <div className="flex items-center gap-1.5 text-energy-ink">
            <Flame className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Burned</span>
          </div>
          <div className="text-lg font-bold tabular-nums mt-0.5">{totalBurned.toLocaleString()}</div>
        </div>
      </div>

      {/* 4 — Net vs goal progress */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">Net {t.net.toLocaleString()} kcal</span>
          <span className="text-muted-foreground">Goal {t.goal.toLocaleString()}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-fuel' : 'bg-energy'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 5 — Supporting budget line */}
      <p className="text-[11px] text-muted-foreground mt-2.5">
        {needsBurn
          ? `${t.net.toLocaleString()} net is ${t.burnNeeded.toLocaleString()} over target — burn it off or it carries the day over.`
          : `${t.remainingBudget.toLocaleString()} kcal of eating budget remains before you'd need extra activity.`}
      </p>
    </div>
  );
}
