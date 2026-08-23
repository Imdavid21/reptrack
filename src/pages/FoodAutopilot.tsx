import { useMemo, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useMealAutopilot } from '@/hooks/useMealAutopilot';
import { useMeals } from '@/hooks/useMeals';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const TYPES = ['breakfast','lunch','dinner','snack'] as const;
type MealType = typeof TYPES[number];

function currentMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

export default function FoodAutopilot() {
  const { settings } = useAdvancedMode();
  const [type, setType] = useState<MealType>(currentMealType());
  const history = useMealAutopilot(type);
  const { addMeal, isAdding, meals } = useMeals();
  const [logged, setLogged] = useState<string | null>(null);
  const todayCalories = useMemo(() => meals.reduce((sum, meal) => sum + Number(meal.calories || 0), 0), [meals]);

  if (!settings.enabled) return <MainLayout showBack backTo="/app/settings" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><h1 className="type-page-title">Advanced Mode is off</h1></div></MainLayout>;

  const logOption = async (option: { label: string; calories: number; protein: number; carbs: number; fat: number }) => {
    try {
      await addMeal({ meal_type: type, food_name: option.label, calories: option.calories, protein: option.protein, carbs: option.carbs, fat: option.fat, is_confirmed: true, nutrition_source: 'saved_meal', source_metadata: { advanced_autopilot: true, derived_from_history: true } });
      setLogged(option.label);
      window.setTimeout(() => setLogged(null), 1800);
    } catch { toast.error('Meal was not logged.'); }
  };

  return <MainLayout showBack backTo="/app/lab" hideNav>
    <div className="mx-auto max-w-[720px] pb-12">
      <header className="mb-5 flex items-end justify-between gap-4"><div><div className="type-eyebrow">Advanced</div><h1 className="type-page-title mt-1">Food Autopilot</h1></div><div className="text-right"><div className="text-lg font-semibold tabular-nums">{Math.round(todayCalories)}</div><div className="type-caption">today</div></div></header>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">{TYPES.map(item => <button key={item} onClick={() => setType(item)} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold capitalize shrink-0', item === type ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{item}</button>)}</div>

      <section className="rounded-[20px] border border-border bg-card overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Usual meals</div>
        <div className="divide-y divide-border">{(history.data?.bundles || []).map(option => <button disabled={isAdding} key={`${option.mealType}-${option.label}`} onClick={() => logOption(option)} className="w-full p-4 text-left hover:bg-muted/30 disabled:opacity-50"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="text-sm font-semibold line-clamp-2">{option.label}</div><div className="type-caption mt-1">{option.count}× logged</div></div><div className="text-right shrink-0"><div className="text-sm font-semibold tabular-nums">{option.calories} kcal</div><div className="type-caption tabular-nums">{option.protein}g P</div></div></div>{logged === option.label && <div className="mt-2 flex items-center gap-1 text-xs font-semibold"><Check className="h-3.5 w-3.5"/>Logged</div>}</button>)}{history.isLoading && <div className="p-4 type-caption">Loading…</div>}{!history.isLoading && !(history.data?.bundles || []).length && <div className="p-4 type-caption">No repeat meals yet.</div>}</div>
      </section>

      <section className="rounded-[20px] border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Frequent foods</div>
        <div className="grid sm:grid-cols-2 gap-px bg-border">{(history.data?.foods || []).map(option => <button disabled={isAdding} key={option.label} onClick={() => logOption(option)} className="bg-card p-4 text-left hover:bg-muted/30 disabled:opacity-50"><div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold truncate">{option.label}</div><Plus className="h-4 w-4 shrink-0"/></div><div className="type-caption mt-1 tabular-nums">{option.calories} kcal · {option.protein}g P · {option.count}×</div></button>)}</div>
      </section>

      <p className="type-caption mt-3">Averages from your own logs. Edit after logging if today differs.</p>
    </div>
  </MainLayout>;
}
