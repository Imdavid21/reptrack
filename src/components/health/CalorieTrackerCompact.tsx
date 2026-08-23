import { useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Loader2, Plus, Trash2, Utensils, X } from 'lucide-react';
import { format } from 'date-fns';
import { useMeals } from '@/hooks/useMeals';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useEnergyModel } from '@/hooks/useEnergyModel';
import { useAuth } from '@/hooks/useAuth';
import { useLogDate } from '@/contexts/LogDateContext';
import { supabase } from '@/integrations/supabase/client';
import { analyzeFoodImage, FoodAnalysisError, type AnalysisStep, type FoodAnalysis } from '@/lib/analyzeFoodImage';
import { AnalysisProgress } from './AnalysisProgress';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = typeof MEAL_TYPES[number];
type EntryMode = 'describe' | 'manual' | 'photo';

type EditableFood = {
  name: string;
  portion: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
};

function currentMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

function progress(value: number, target: number) {
  return Math.min(100, Math.max(0, target ? value / target * 100 : 0));
}

export function CalorieTrackerCompact() {
  const { user } = useAuth();
  const { logDate, isBackDated } = useLogDate();
  const mealsDate = isBackDated ? logDate : undefined;
  const { meals, totalCalories, addMeal, deleteMeal, isAdding } = useMeals(mealsDate);
  const { preferences } = useUserPreferences();
  const energy = useEnergyModel(logDate);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<EntryMode>('describe');
  const [mealType, setMealType] = useState<MealType>(currentMealType());
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [foods, setFoods] = useState<EditableFood[]>([]);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('compressing');
  const [analyzing, setAnalyzing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' });
  const cameraRef = useRef<HTMLInputElement>(null);

  const calorieTarget = energy.model?.calorieTarget ?? preferences?.daily_calorie_goal ?? 2000;
  const proteinTarget = energy.model?.proteinTarget ?? preferences?.daily_protein_goal ?? 165;
  const carbTarget = preferences?.daily_carbs_goal ?? 200;
  const fatTarget = preferences?.daily_fat_goal ?? 60;
  const fiberTarget = preferences?.daily_fiber_goal ?? 25;

  const macros = useMemo(() => meals.reduce((acc, meal) => ({
    protein: acc.protein + Number(meal.protein || 0),
    carbs: acc.carbs + Number(meal.carbs || 0),
    fat: acc.fat + Number(meal.fat || 0),
    fiber: acc.fiber + Number(meal.fiber || 0),
  }), { protein: 0, carbs: 0, fat: 0, fiber: 0 }), [meals]);

  const resetEntry = (nextMode: EntryMode = 'describe') => {
    setMode(nextMode);
    setMealType(currentMealType());
    setDescription('');
    setAnalysis(null);
    setFoods([]);
    setPhotoUrl(null);
    setError(null);
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' });
  };

  const startEntry = (nextMode: EntryMode) => {
    resetEntry(nextMode);
    setOpen(true);
    if (nextMode === 'photo') window.setTimeout(() => cameraRef.current?.click(), 50);
  };

  const applyAnalysis = (result: FoodAnalysis) => {
    setAnalysis(result);
    setFoods(result.foods.map(food => ({ ...food })));
  };

  const analyzeDescription = async () => {
    if (!description.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('parse-food-text', { body: { text: description.trim() } });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      applyAnalysis(data as FoodAnalysis);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not estimate this meal.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzePhoto = async (file: File) => {
    if (!user) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeFoodImage(file, user.id, setAnalysisStep);
      setPhotoUrl(result.publicUrl);
      applyAnalysis(result.analysis);
    } catch (cause) {
      setError(cause instanceof FoodAnalysisError ? cause.userMessage : cause instanceof Error ? cause.message : 'Could not analyze photo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analysisTotals = useMemo(() => {
    const valid = foods.filter(food => food.name.trim() && Number(food.calories) > 0);
    const sum = (key: keyof EditableFood) => valid.reduce((total, food) => total + Number(food[key] || 0), 0);
    return {
      calories: sum('calories'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), fiber: sum('fiber'),
    };
  }, [foods]);

  const saveEstimate = async () => {
    const valid = foods.filter(food => food.name.trim() && Number(food.calories) > 0);
    if (!valid.length) { setError('Add at least one food with calories.'); return; }
    setError(null);
    try {
      await addMeal({
        meal_type: mealType,
        food_name: analysis?.description || valid.map(food => food.name).join(', '),
        calories: Math.round(analysisTotals.calories),
        protein: analysisTotals.protein || undefined,
        carbs: analysisTotals.carbs || undefined,
        fat: analysisTotals.fat || undefined,
        fiber: analysisTotals.fiber || undefined,
        photo_url: photoUrl || undefined,
        ai_detected_food: valid.map(food => food.name).join(', '),
        ai_confidence: analysis?.confidence,
        is_confirmed: true,
        nutrition_source: photoUrl ? 'ai_photo' : 'ai_text',
        source_metadata: { modelEstimated: true, editedBeforeSave: true },
      });
      setOpen(false);
    } catch {
      setError('Food was not saved. Try again.');
    }
  };

  const saveManual = async () => {
    const calories = Number(manual.calories);
    if (!manual.name.trim() || !Number.isFinite(calories) || calories <= 0) { setError('Enter a food name and calories.'); return; }
    setError(null);
    try {
      await addMeal({
        meal_type: mealType,
        food_name: manual.name.trim(),
        calories: Math.round(calories),
        protein: Number(manual.protein) || undefined,
        carbs: Number(manual.carbs) || undefined,
        fat: Number(manual.fat) || undefined,
        fiber: Number(manual.fiber) || undefined,
        is_confirmed: true,
        nutrition_source: 'manual',
        source_metadata: { modelEstimated: false },
      });
      setOpen(false);
    } catch {
      setError('Food was not saved. Try again.');
    }
  };

  return <>
    <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => { const file = event.target.files?.[0]; if (file) void analyzePhoto(file); event.target.value = ''; }} />

    <section className="rounded-[20px] border border-border bg-card overflow-hidden" aria-labelledby="nutrition-today-heading">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3"><div><h2 id="nutrition-today-heading" className="type-eyebrow">Food</h2><div className="mt-1 flex items-baseline gap-1.5"><span className="text-3xl font-semibold tabular-nums">{totalCalories.toLocaleString()}</span><span className="text-sm text-muted-foreground tabular-nums">/ {calorieTarget.toLocaleString()} kcal</span></div></div><Utensils className="h-4 w-4 text-muted-foreground" /></div>
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground rounded-full" style={{ width: `${progress(totalCalories, calorieTarget)}%` }} /></div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Protein</span><span className="text-sm font-semibold tabular-nums">{Math.round(macros.protein)} / {proteinTarget} g</span></div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground rounded-full" style={{ width: `${progress(macros.protein, proteinTarget)}%` }} /></div>
          <div className="mt-1 type-caption text-right tabular-nums">{macros.protein >= proteinTarget ? `${Math.round(macros.protein - proteinTarget)} g over` : `${Math.round(proteinTarget - macros.protein)} g remaining`}</div>
        </div>

        <button onClick={() => setDetailsOpen(value => !value)} className="mt-3 min-h-10 w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground"><span>Carbs {Math.round(macros.carbs)}/{carbTarget} g · Fat {Math.round(macros.fat)}/{fatTarget} g · Fibre {Math.round(macros.fiber)}/{fiberTarget} g</span>{detailsOpen ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}</button>
        {detailsOpen && <div className="mt-2 border-t border-border divide-y divide-border">{meals.length ? meals.map(meal => <div key={meal.id} className="py-3 flex items-start gap-3"><div className="min-w-0 flex-1"><div className="text-sm font-medium break-words">{meal.food_name || meal.ai_detected_food || 'Meal'}</div><div className="type-caption mt-0.5 capitalize">{meal.meal_type} · {meal.calories || 0} kcal{meal.protein ? ` · ${Math.round(meal.protein)} g protein` : ''}</div></div><button onClick={async () => { try { await deleteMeal(meal.id); } catch { /* row remains if query refresh fails */ } }} aria-label={`Delete ${meal.food_name || 'meal'}`} className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted"><Trash2 className="h-4 w-4"/></button></div>) : <p className="py-4 text-sm text-muted-foreground">Nothing logged today.</p>}</div>}
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <button onClick={() => startEntry('describe')} className="min-h-12 flex-1 rounded-xl bg-foreground text-background px-4 font-semibold text-sm flex items-center justify-center gap-2"><Plus className="h-4 w-4"/>Add food</button>
        <button onClick={() => startEntry('photo')} aria-label="Add food with camera" className="h-12 w-12 rounded-xl border border-border flex items-center justify-center"><Camera className="h-4 w-4"/></button>
      </div>
    </section>

    <Drawer open={open} onOpenChange={value => { setOpen(value); if (!value) resetEntry(); }}>
      <DrawerContent className="rounded-t-[28px] max-h-[92dvh] overflow-y-auto">
        <DrawerHeader className="px-5 text-left"><DrawerTitle>Add food{isBackDated ? ` · ${format(logDate, 'MMM d')}` : ''}</DrawerTitle></DrawerHeader>
        <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] space-y-4">
          <div className="flex gap-1 overflow-x-auto">{MEAL_TYPES.map(type => <button key={type} onClick={() => setMealType(type)} className={cn('min-h-10 px-3 rounded-xl text-xs font-semibold capitalize', mealType === type ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{type}</button>)}</div>

          {!analysis && mode === 'describe' && <>
            <div><label htmlFor="food-description" className="type-caption">What did you eat?</label><textarea id="food-description" autoFocus value={description} onChange={event => setDescription(event.target.value)} placeholder="e.g. 300 g chicken breast, 100 g rice, salad" className="mt-1 w-full min-h-28 rounded-2xl border border-border bg-background p-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <button onClick={analyzeDescription} disabled={!description.trim() || analyzing} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50 flex items-center justify-center gap-2">{analyzing && <Loader2 className="h-4 w-4 animate-spin"/>}{analyzing ? 'Estimating…' : 'Estimate meal'}</button>
            <div className="grid grid-cols-2 gap-2"><button onClick={() => { setMode('photo'); cameraRef.current?.click(); }} className="min-h-12 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2"><Camera className="h-4 w-4"/>Photo</button><button onClick={() => setMode('manual')} className="min-h-12 rounded-xl border border-border text-sm font-semibold">Manual details</button></div>
          </>}

          {!analysis && mode === 'photo' && <div className="space-y-4"><button onClick={() => cameraRef.current?.click()} className="w-full min-h-32 rounded-2xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2"><Camera className="h-6 w-6"/><span className="text-sm font-semibold">Take or choose a food photo</span></button>{analyzing && <AnalysisProgress currentStep={analysisStep}/>}<button onClick={() => setMode('describe')} className="w-full min-h-11 text-sm text-muted-foreground">Describe instead</button></div>}

          {!analysis && mode === 'manual' && <div className="space-y-3"><Input placeholder="Food name" value={manual.name} onChange={event => setManual(value => ({ ...value, name: event.target.value }))} className="h-12"/><div className="grid grid-cols-2 gap-2"><Input placeholder="Calories" type="number" inputMode="numeric" value={manual.calories} onChange={event => setManual(value => ({ ...value, calories: event.target.value }))}/><Input placeholder="Protein g" type="number" inputMode="decimal" value={manual.protein} onChange={event => setManual(value => ({ ...value, protein: event.target.value }))}/><Input placeholder="Carbs g" type="number" inputMode="decimal" value={manual.carbs} onChange={event => setManual(value => ({ ...value, carbs: event.target.value }))}/><Input placeholder="Fat g" type="number" inputMode="decimal" value={manual.fat} onChange={event => setManual(value => ({ ...value, fat: event.target.value }))}/><Input placeholder="Fibre g" type="number" inputMode="decimal" value={manual.fiber} onChange={event => setManual(value => ({ ...value, fiber: event.target.value }))}/></div><button onClick={saveManual} disabled={isAdding} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50">{isAdding ? 'Saving…' : 'Add food'}</button><button onClick={() => setMode('describe')} className="w-full min-h-11 text-sm text-muted-foreground">Describe instead</button></div>}

          {analysis && <div className="space-y-4">
            <div className="rounded-2xl bg-muted p-4"><div className="type-eyebrow">Estimated</div><div className="mt-1 text-3xl font-semibold tabular-nums">~{Math.round(analysisTotals.calories)} kcal</div><div className="mt-1 text-sm text-muted-foreground tabular-nums">~{Math.round(analysisTotals.protein)} g protein · ~{Math.round(analysisTotals.carbs)} g carbs · ~{Math.round(analysisTotals.fat)} g fat</div></div>
            <div className="divide-y divide-border border-y border-border">{foods.map((food, index) => <div key={`${food.name}-${index}`} className="py-3 grid grid-cols-[1fr_90px_40px] gap-2 items-center"><div><Input value={food.name} onChange={event => setFoods(items => items.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} className="h-10"/><div className="type-caption mt-1">{food.portion}</div></div><Input aria-label={`Calories for ${food.name}`} type="number" inputMode="numeric" value={food.calories} onChange={event => setFoods(items => items.map((item, i) => i === index ? { ...item, calories: Number(event.target.value) || 0 } : item))} className="h-10 text-right tabular-nums"/><button onClick={() => setFoods(items => items.filter((_, i) => i !== index))} aria-label={`Remove ${food.name}`} className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted"><X className="h-4 w-4"/></button></div>)}</div>
            <p className="type-caption">These values are estimates. Adjust the items or calories before saving if you know more.</p>
            <button onClick={saveEstimate} disabled={isAdding || !foods.length} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50">{isAdding ? 'Saving…' : `Add ~${Math.round(analysisTotals.calories)} kcal`}</button>
            <button onClick={() => { setAnalysis(null); setFoods([]); setMode('describe'); }} className="w-full min-h-11 text-sm text-muted-foreground">Start over</button>
          </div>}

          {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        </div>
      </DrawerContent>
    </Drawer>
  </>;
}
