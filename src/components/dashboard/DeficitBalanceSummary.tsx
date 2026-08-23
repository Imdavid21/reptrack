import { useMeals } from '@/hooks/useMeals';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useEnergyModel } from '@/hooks/useEnergyModel';
import { useLogDate } from '@/contexts/LogDateContext';

export function DeficitBalanceSummary() {
  const { logDate, isBackDated } = useLogDate();
  const { preferences } = useUserPreferences();
  const { totalCalories, meals } = useMeals(isBackDated ? logDate : undefined);
  const energy = useEnergyModel(logDate);

  if (!preferences?.deficit_mode_enabled) return null;

  const target = Math.max(1, Number(preferences.daily_deficit_target || 500));
  const calorieTarget = energy.model?.calorieTarget ?? preferences.daily_calorie_goal ?? 2000;
  const maintenance = energy.model?.personalBaseline ?? Math.max(calorieTarget + target, calorieTarget);
  const activity = energy.model?.deliberateActivity ?? 0;
  const netDeficit = energy.model ? -energy.model.energyBalance : maintenance - totalCalories + activity;
  const isDeficit = netDeficit >= 0;
  const progress = Math.min(100, Math.max(0, netDeficit / target * 100));
  const targetReached = meals.length > 0 && netDeficit >= target;

  return <section className="rounded-[20px] border border-border bg-card overflow-hidden" aria-labelledby="deficit-balance-heading">
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div><div className="type-eyebrow">Calorie balance</div><h2 id="deficit-balance-heading" className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{isDeficit ? '−' : '+'}{Math.round(Math.abs(netDeficit)).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">kcal</span></h2><p className="type-caption mt-1">{isDeficit ? 'estimated deficit today' : 'estimated surplus today'}</p></div>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold">{targetReached ? 'Target reached' : 'In progress'}</span>
      </div>

      <div className="mt-4"><div className="flex items-center justify-between gap-3 type-caption"><span>Deficit target</span><span className="font-semibold tabular-nums">−{target} kcal</span></div><div className="mt-2 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${progress}%` }} /></div></div>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border"><div className="bg-card p-3"><div className="type-caption">Food in</div><div className="mt-1 text-lg font-semibold tabular-nums">{Math.round(totalCalories).toLocaleString()} kcal</div></div><div className="bg-card p-3"><div className="type-caption">Activity out</div><div className="mt-1 text-lg font-semibold tabular-nums">{Math.round(activity).toLocaleString()} kcal</div></div></div>

      {preferences.show_bmr_on_dashboard !== false && <div className="mt-3 border-t border-border pt-3 grid grid-cols-2 gap-3 type-caption"><div><span className="block">Normal-day baseline</span><strong className="text-foreground tabular-nums">{Math.round(maintenance).toLocaleString()} kcal</strong></div><div className="text-right"><span className="block">Today's calorie target</span><strong className="text-foreground tabular-nums">{Math.round(calorieTarget).toLocaleString()} kcal</strong></div></div>}
    </div>
  </section>;
}
