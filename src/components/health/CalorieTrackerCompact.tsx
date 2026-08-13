import { useState, useRef, useEffect, useMemo } from 'react';
import { useMeals } from '@/hooks/useMeals';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useGoalHistory } from '@/hooks/useGoalHistory';
import { useCalorieBurn } from '@/hooks/useCalorieBurn';
import { useAutoMaintenanceCalories } from '@/hooks/useAutoMaintenanceCalories';
import { resolveMaintenanceOverride } from '@/lib/metabolism';
import { supabase } from '@/integrations/supabase/client';
import { analyzeFoodImage, FoodAnalysisError, type AnalysisStep, type FoodAnalysis } from '@/lib/analyzeFoodImage';
import { AnalysisProgress } from './AnalysisProgress';
import { BmrBreakdownTile } from './BmrBreakdownTile';
import { useAuth } from '@/hooks/useAuth';
import { 
  Utensils, Camera, Plus, Loader2, Check, X, 
  Coffee, Sun, Sunset, Cookie, Trash2, ChevronDown, ChevronUp, Pencil, Flame
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { useLogDate } from '@/contexts/LogDateContext';
import { cn } from '@/lib/utils';

const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Sunset,
  snack: Cookie,
};

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

function getMealTypeByTime(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 20) return 'dinner';
  return 'snack';
}

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
};

export function CalorieTrackerCompact() {
  const { user } = useAuth();
  const { logDate, isBackDated } = useLogDate();
  const viewingToday = !isBackDated;
  const mealDateSuffix = viewingToday ? '' : ` on ${format(logDate, 'MMM d')}`;
  // The whole card reads and writes the shared dashboard date: today by default,
  // or a back-dated day (so its meals/burns show and new meals save there).
  const mealsDate = viewingToday ? undefined : logDate;
  const { meals, mealsByType, totalCalories, addMeal, deleteMeal, isAdding } = useMeals(mealsDate);
  const { preferences } = useUserPreferences();
  const { setGoal } = useGoalHistory();
  const { totalBurned, burns, todayWorkout } = useCalorieBurn(mealsDate);
  const autoMaintenance = useAutoMaintenanceCalories();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [editableFoods, setEditableFoods] = useState<EditableFood[]>([]);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('compressing');
  const [manualMode, setManualMode] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [contextHint, setContextHint] = useState('');
  const [manualData, setManualData] = useState({ food_name: '', calories: '' });
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastFiles, setLastFiles] = useState<File[]>([]);
  const [analysisProgressText, setAnalysisProgressText] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProteinOpen, setIsProteinOpen] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoal, setEditGoal] = useState(2000);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const deficitMode = preferences?.deficit_mode_enabled ?? false;
  const deficitTarget = preferences?.daily_deficit_target ?? 500;
  const dailyGoal = preferences?.daily_calorie_goal ?? 2000;
  // Maintenance baseline: explicit override, otherwise the body-based
  // auto-calculation (BMR alone — today's real activity is credited
  // separately in real time via `+ totalBurned` below, not assumed here),
  // otherwise the old circular fallback for users with no profile data yet.
  const maintenanceOverride = resolveMaintenanceOverride(preferences?.maintenance_calories);
  const maintenance = maintenanceOverride
    ?? (autoMaintenance.isAvailable ? autoMaintenance.maintenance : (dailyGoal + deficitTarget));
  // In deficit mode the cap is maintenance minus target; otherwise the plain calorie goal
  const cap = deficitMode ? Math.max(maintenance - deficitTarget, 800) : dailyGoal;
  const proteinGoal = preferences?.daily_protein_goal ?? 180;
  const proteinTotal = useMemo(
    () => meals.reduce((sum, m) => sum + Number(m.protein || 0), 0),
    [meals]
  );
  /** Per-meal protein rows + day macro totals for the protein breakdown sheet. */
  const proteinRows = useMemo(
    () => meals
      .map(m => ({
        id: m.id,
        name: m.food_name || m.ai_detected_food || 'Meal',
        type: m.meal_type,
        protein: Number(m.protein || 0),
        calories: Number(m.calories || 0),
      }))
      .sort((a, b) => b.protein - a.protein),
    [meals]
  );
  const dayMacros = useMemo(() => {
    const sum = (key: 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium') =>
      meals.reduce((s, m) => s + Number((m as any)[key] || 0), 0);
    return { carbs: sum('carbs'), fat: sum('fat'), fiber: sum('fiber'), sugar: sum('sugar'), sodium: sum('sodium') };
  }, [meals]);
  const netDeficit = maintenance - totalCalories + totalBurned; // positive = under maintenance

  useEffect(() => {
    if (isEditingGoal) setEditGoal(dailyGoal);
  }, [isEditingGoal, dailyGoal]);

  // Sync editableFoods from analysis
  useEffect(() => {
    if (analysis) {
      setEditableFoods(analysis.foods.map(f => ({ ...f })));
    }
  }, [analysis]);

  const editableTotal = useMemo(
    () => editableFoods.reduce((sum, f) => sum + (Number(f.calories) || 0), 0),
    [editableFoods]
  );

  /** Macro totals for the pending entry, shown before it's confirmed and reused
   *  as the values actually saved — per-item values when the AI supplied them,
   *  otherwise the analysis-level totals. */
  const pendingMacros = useMemo(() => {
    const valid = editableFoods.filter(f => f.name.trim() && f.calories > 0);
    const pick = (key: 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium', total?: number) => {
      const anySpecified = valid.some(f => f[key] != null);
      if (anySpecified) return valid.reduce((s, f) => s + (f[key] || 0), 0);
      return total ?? 0;
    };
    return {
      protein: pick('protein', analysis?.total_protein),
      carbs: pick('carbs', analysis?.total_carbs),
      fat: pick('fat', analysis?.total_fat),
      fiber: pick('fiber', analysis?.total_fiber),
      sugar: pick('sugar', analysis?.total_sugar),
      sodium: pick('sodium', analysis?.total_sodium),
    };
  }, [editableFoods, analysis]);

  const resetDialogState = () => {
    setAnalysis(null);
    setEditableFoods([]);
    setManualMode(false);
    setTextMode(false);
    setImageMode(false);
    setTextInput('');
    setContextHint('');
    setManualData({ food_name: '', calories: '' });
    setPreviewUrls([]);
    setUploadedPhotoUrl(null);
    setAnalysisError(null);
    setLastFiles([]);
    setAnalysisProgressText('');
  };

  const handleCameraClick = () => {
    setSelectedMealType(getMealTypeByTime());
    resetDialogState();
    setImageMode(true);
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    setSelectedMealType(getMealTypeByTime());
    resetDialogState();
    setImageMode(true);
    galleryInputRef.current?.click();
  };

  const handleDescribeClick = () => {
    setSelectedMealType(getMealTypeByTime());
    resetDialogState();
    setTextMode(true);
    setIsDialogOpen(true);
  };

  const runAnalysis = async (files: File[], hint?: string) => {
    if (!user || files.length === 0) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setEditableFoods([]);
    setAnalysisError(null);
    setAnalysisStep('compressing');
    setAnalysisProgressText('');

    try {
      const mergedFoods: FoodAnalysis['foods'] = [];
      let firstUrl: string | null = null;
      let confSum = 0;
      const descriptions: string[] = [];
      let qualitySeen: string | undefined;

      for (let i = 0; i < files.length; i++) {
        if (files.length > 1) {
          setAnalysisProgressText(`Image ${i + 1} of ${files.length}`);
        }
        const result = await analyzeFoodImage(files[i], user.id, setAnalysisStep, hint);
        if (!firstUrl) firstUrl = result.publicUrl;
        mergedFoods.push(...result.analysis.foods);
        confSum += result.analysis.confidence || 0;
        if (result.analysis.description) descriptions.push(result.analysis.description);
        if (!qualitySeen && result.analysis.food_quality) qualitySeen = result.analysis.food_quality;
      }

      setUploadedPhotoUrl(firstUrl);
      // Sum the per-item macros into analysis-level totals so nothing is lost
      // when several photos are merged into one entry.
      const sumKey = (key: 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium') => {
        if (!mergedFoods.some(f => f[key] != null)) return undefined;
        return mergedFoods.reduce((s, f) => s + (f[key] || 0), 0);
      };
      const merged: FoodAnalysis = {
        foods: mergedFoods,
        total_calories: mergedFoods.reduce((s, f) => s + (f.calories || 0), 0),
        total_protein: sumKey('protein'),
        total_carbs: sumKey('carbs'),
        total_fat: sumKey('fat'),
        total_fiber: sumKey('fiber'),
        total_sugar: sumKey('sugar'),
        total_sodium: sumKey('sodium'),
        confidence: confSum / files.length,
        description: descriptions.join(' + '),
        food_quality: qualitySeen,
      };
      setAnalysis(merged);
    } catch (error) {
      console.error('Analysis failed:', error);
      const message = error instanceof FoodAnalysisError
        ? error.userMessage
        : (error instanceof Error ? error.message : 'Could not analyze image.');
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgressText('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;

    setIsDialogOpen(true);

    // Load previews in parallel
    const urls = await Promise.all(files.map(f => new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = (ev) => resolve(ev.target?.result as string);
      r.readAsDataURL(f);
    })));
    setPreviewUrls(urls);

    setLastFiles(files);
    await runAnalysis(files, contextHint || undefined);
    e.target.value = '';
  };


  const handleTextAnalyze = async () => {
    if (!textInput.trim()) {
      toast.error('Please describe your meal');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setEditableFoods([]);

    try {
      const { data, error } = await supabase.functions.invoke('parse-food-text', {
        body: { text: textInput },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data as FoodAnalysis);
    } catch (error) {
      console.error('Text analysis failed:', error);
      toast.error('Could not parse food. Try manual entry.');
      setManualMode(true);
      setTextMode(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateFood = (index: number, field: keyof EditableFood, value: string | number) => {
    setEditableFoods(prev => prev.map((f, i) =>
      i === index ? { ...f, [field]: field === 'calories' ? Number(value) || 0 : value } : f
    ));
  };

  const removeFood = (index: number) => {
    setEditableFoods(prev => prev.filter((_, i) => i !== index));
  };

  const addFood = () => {
    setEditableFoods(prev => [...prev, { name: '', portion: '1 serving', calories: 0 }]);
  };

  const handleConfirmAnalysis = async () => {
    if (!analysis && editableFoods.length === 0) return;

    const validFoods = editableFoods.filter(f => f.name.trim() && f.calories > 0);
    if (validFoods.length === 0) {
      toast.error('Please add at least one food item with calories');
      return;
    }

    // Exactly the macro numbers shown in the pre-confirm breakdown, so what the
    // user reviews is what gets saved.
    const { protein: totalProtein, carbs: totalCarbs, fat: totalFat, fiber: totalFiber, sugar: totalSugar, sodium: totalSodium } = pendingMacros;

    try {
      await addMeal({
        meal_type: selectedMealType,
        food_name: analysis?.description || validFoods.map(f => f.name).join(', '),
        calories: editableTotal,
        photo_url: uploadedPhotoUrl || undefined,
        ai_detected_food: validFoods.map(f => f.name).join(', '),
        ai_confidence: analysis?.confidence,
        is_confirmed: true,
        protein: totalProtein || undefined,
        carbs: totalCarbs || undefined,
        fat: totalFat || undefined,
        fiber: totalFiber || undefined,
        sugar: totalSugar || undefined,
        sodium: totalSodium || undefined,
        food_quality: analysis?.food_quality,
      });
      toast.success(`Meal logged${mealDateSuffix}`);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save meal');
    }
  };

  const handleManualSave = async () => {
    if (!manualData.food_name || !manualData.calories) {
      toast.error('Please enter food name and calories');
      return;
    }

    try {
      await addMeal({
        meal_type: selectedMealType,
        food_name: manualData.food_name,
        calories: parseInt(manualData.calories),
        photo_url: uploadedPhotoUrl || undefined,
        is_confirmed: true,
      });
      toast.success(`Meal logged${mealDateSuffix}`);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save meal');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      await deleteMeal(id);
      toast.success('Meal deleted');
    } catch (error) {
      toast.error('Failed to delete meal');
    }
  };

  const progressPercent = Math.min((totalCalories / cap) * 100, 100);
  const overCap = totalCalories > cap + totalBurned;
  // netDeficit = maintenance - eaten + burned, so with nothing logged yet
  // today it equals the FULL maintenance figure — mathematically a "deficit,"
  // but showing that as an already-hit green goal before a single meal is
  // logged rewards not tracking rather than actually hitting the target.
  const hitDeficit = netDeficit >= deficitTarget && meals.length > 0;
  // Workout calories are calculated from duration when no burn entry was persisted yet.
  const hasPersistedWorkoutBurn = burns.some(b => b.source === 'workout');
  const showCalculatedWorkout = !hasPersistedWorkoutBurn && !!todayWorkout && todayWorkout.calculatedCalories > 0;

  const handleSaveCalorieGoal = async () => {
    try {
      await setGoal('daily_calorie_goal', editGoal, dailyGoal);
      setIsEditingGoal(false);
      toast.success('Calorie goal updated');
    } catch {
      toast.error('Failed to update goal');
    }
  };

  return (
    <>
      {/* File inputs - outside Dialog so always rendered */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="h-full flex flex-col flex-1">
        <div className="card-brutalist h-full flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="section-header mb-0">
                {viewingToday
                  ? (deficitMode ? "DEFICIT TODAY" : "TODAY'S CALORIES")
                  : `${format(logDate, 'MMM d').toUpperCase()} · ${deficitMode ? 'DEFICIT' : 'CALORIES'}`}
              </h3>
              <button
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors rounded-lg"
                title="Edit goal"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </div>

          {deficitMode ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground tracking-wider">NET</div>
                  <div className={cn(
                    "text-xl font-bold tabular-nums leading-tight",
                    hitDeficit ? "text-[#DAF1DC]" : netDeficit > 0 ? "text-foreground" : "text-[#ff9b9b]"
                  )}>
                    {netDeficit >= 0 ? `-${netDeficit}` : `+${Math.abs(netDeficit)}`}
                  </div>
                  <div className="text-[10px] text-muted-foreground">of -{deficitTarget}</div>
                </div>
                <div className="p-2.5 rounded-xl border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground tracking-wider">IN</div>
                  <div className="text-xl font-bold tabular-nums leading-tight text-foreground">{totalCalories.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">calories eaten</div>
                </div>
                <div className="p-2.5 rounded-xl border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground tracking-wider">OUT</div>
                  <div className="text-xl font-bold tabular-nums leading-tight text-foreground">{totalBurned.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">calories burned</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProteinOpen(true)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left transition-colors",
                    proteinTotal >= proteinGoal
                      ? "border-energy/30 bg-energy-soft/70 hover:bg-energy-soft"
                      : "border-border bg-muted/20 hover:bg-muted/40"
                  )}
                >
                  <div className="text-[10px] text-muted-foreground tracking-wider">PROTEIN</div>
                  <div className={cn(
                    "text-xl font-bold tabular-nums leading-tight",
                    proteinTotal >= proteinGoal ? "text-energy-ink" : "text-foreground"
                  )}>
                    {Math.round(proteinTotal)}g
                  </div>
                  <div className="text-[10px] text-muted-foreground">of {proteinGoal}g | breakdown</div>
                </button>
                {autoMaintenance.isAvailable && (preferences?.show_bmr_on_dashboard ?? true) && (
                  <BmrBreakdownTile
                    bmr={autoMaintenance.bmr}
                    maintenance={maintenance}
                    isOverride={maintenanceOverride != null}
                    totalBurnedToday={viewingToday ? totalBurned : 0}
                    isToday={viewingToday}
                  />
                )}
              </div>

              <CollapsibleTrigger className="mt-1.5 flex w-full justify-center" aria-label={isExpanded ? 'Hide details' : 'Show details'}>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </CollapsibleTrigger>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                <span className="text-4xl font-bold tabular-nums">
                  {totalCalories.toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground">
                  / {dailyGoal.toLocaleString()}
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
              </CollapsibleTrigger>
            </div>
          )}

          {isEditingGoal && (
            <div className="mt-3 p-3 border border-border rounded-xl bg-muted/30 space-y-3 animate-fade-in">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Daily goal</span>
                <span className="font-bold">{editGoal.toLocaleString()} cal</span>
              </div>
              <Slider
                value={[editGoal]}
                onValueChange={([v]) => setEditGoal(v)}
                min={1200}
                max={4000}
                step={50}
                className="w-full"
              />
              <button
                onClick={handleSaveCalorieGoal}
                className="w-full btn-brutalist flex items-center justify-center gap-2 py-2 text-sm"
              >
                <Check className="h-3 w-3" />
                SAVE
              </button>
            </div>
          )}

          {!deficitMode && (
            <div className="progress-bar mt-4">
              <div
                className={cn(
                  "progress-bar-fill bg-fuel transition-all duration-500",
                  overCap && "bg-[hsl(var(--insight-coral))]"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {!deficitMode && meals.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs text-muted-foreground">RECENT</h4>
              {[...meals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3).map((meal) => (
                <div key={meal.id} className="flex justify-between text-sm">
                  <span className="tabular-nums text-muted-foreground">{format(new Date(meal.created_at), 'HH:mm')}</span>
                  <span className="tabular-nums shrink-0">{meal.calories} cal</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-auto pt-3">
            <button
              onClick={(e) => { e.stopPropagation(); handleGalleryClick(); }}
              className="border border-border px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDescribeClick(); }}
              className="border border-border px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-colors text-sm font-medium"
            >
              <Utensils className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCameraClick(); }}
              className="btn-brutalist flex-1 flex items-center justify-center gap-2"
            >
              <Camera className="h-4 w-4" />
              TAKE PHOTO
            </button>
          </div>

          <CollapsibleContent className="animate-accordion-down overflow-hidden">
            <div className="mt-4 pt-4 border-t border-border space-y-3 overflow-hidden">
              {(burns.length > 0 || showCalculatedWorkout) && (
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <Flame className="h-3 w-3 shrink-0" />
                      <span className="truncate">Burned</span>
                    </div>
                    <span className="tabular-nums shrink-0">{totalBurned} cal</span>
                  </div>
                  {showCalculatedWorkout && (
                    <div className="flex items-start justify-between text-sm pl-5 min-w-0 gap-2">
                      <span className="break-words min-w-0 flex-1 leading-snug">
                        {todayWorkout.day_name}{todayWorkout.calculatedDuration ? ` · ${todayWorkout.calculatedDuration} min` : ''}
                      </span>
                      <span className="tabular-nums text-muted-foreground shrink-0">{todayWorkout.calculatedCalories}</span>
                    </div>
                  )}
                  {burns.map((burn) => (
                    <div key={burn.id} className="flex items-start justify-between text-sm pl-5 min-w-0 gap-2">
                      <span className="break-words min-w-0 flex-1 leading-snug capitalize">
                        {(burn.activity_type || burn.source).replace(/_/g, ' ')}
                        {burn.duration_minutes ? ` · ${burn.duration_minutes} min` : ''}
                      </span>
                      <span className="tabular-nums text-muted-foreground shrink-0">{burn.calories}</span>
                    </div>
                  ))}
                </div>
              )}

              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                const Icon = MEAL_ICONS[type];
                const mealsOfType = mealsByType[type];
                const typeCalories = mealsOfType.reduce((sum, m) => sum + (m.calories || 0), 0);

                if (mealsOfType.length === 0) return null;

                return (
                  <div key={type} className="space-y-1 overflow-hidden">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{MEAL_LABELS[type]}</span>
                      </div>
                      <span className="tabular-nums shrink-0">{typeCalories} cal</span>
                    </div>
                    {mealsOfType.map((meal) => (
                      <div key={meal.id} className="flex items-start justify-between text-sm pl-5 group min-w-0 gap-2">
                        <span className="break-words min-w-0 flex-1 leading-snug">{meal.food_name || 'Unnamed'}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="tabular-nums text-muted-foreground">{meal.calories}</span>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            aria-label={`Delete ${meal.food_name || 'meal'}`}
                            title="Delete"
                            className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {meals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No meals yet. Tap the camera to snap your food.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-border bg-background max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">ADD MEAL{mealDateSuffix.toUpperCase()}</DialogTitle>
          </DialogHeader>

          {/* Meal type selector - always visible */}
          <div className="flex gap-1 flex-wrap">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
              const Icon = MEAL_ICONS[type];
              return (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedMealType === type
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {MEAL_LABELS[type]}
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {/* Image Mode: Show preview and analysis */}
            {imageMode && !analysis && !manualMode && (
              <>
                {previewUrls.length > 0 && (
                  <div className={cn(
                    "grid gap-2",
                    previewUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {previewUrls.map((url, i) => (
                      <div key={i} className="aspect-video bg-muted overflow-hidden rounded-xl relative">
                        <img src={url} alt={`Food ${i + 1}`} className="w-full h-full object-cover" />
                        {previewUrls.length > 1 && (
                          <span className="absolute top-1 left-1 bg-background/80 text-[10px] px-1.5 py-0.5 rounded tabular-nums">
                            {i + 1}/{previewUrls.length}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Context hint input - shown before analysis starts or while analyzing */}
                {!isAnalyzing && !analysisError && (
                  <div>
                    <Label className="text-xs text-muted-foreground">CONTEXT (OPTIONAL)</Label>
                    <Input
                      placeholder="e.g., restaurant, home cooked, meal prep"
                      value={contextHint}
                      onChange={(e) => setContextHint(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                )}

                {isAnalyzing && (
                  <div className="space-y-2">
                    <AnalysisProgress currentStep={analysisStep} />
                    {analysisProgressText && (
                      <p className="text-xs text-muted-foreground text-center tabular-nums">{analysisProgressText}</p>
                    )}
                  </div>
                )}

                {analysisError && !isAnalyzing && (
                  <div className="space-y-3">
                    <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-4">
                      <p className="text-sm text-destructive">{analysisError}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setManualMode(true); setImageMode(false); setAnalysisError(null); }}
                        className="border border-border p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-colors text-sm"
                      >
                        <Pencil className="h-4 w-4" />
                        ENTER MANUALLY
                      </button>
                      <button
                        onClick={() => { if (lastFiles.length) runAnalysis(lastFiles, contextHint || undefined); }}
                        disabled={lastFiles.length === 0}
                        className="btn-brutalist flex items-center justify-center gap-2 text-sm"
                      >
                        <Camera className="h-4 w-4" />
                        RETRY
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {textMode && !analysis && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">WHAT DID YOU EAT?</Label>
                  <textarea
                    placeholder="e.g., 2 eggs, toast with butter, and a glass of orange juice"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full mt-1 p-3 border border-border bg-background text-sm min-h-[100px] resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    AI will estimate calories and macros
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setTextMode(false); setTextInput(''); setIsDialogOpen(false); }}
                    className="border border-border p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                    CANCEL
                  </button>
                  <button
                    onClick={handleTextAnalyze}
                    disabled={isAnalyzing || !textInput.trim()}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    ESTIMATE CALORIES
                  </button>
                </div>

                <div className="border-t border-border pt-3">
                  <button
                    onClick={() => { setTextMode(false); setManualMode(true); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    or type calories manually →
                  </button>
                </div>
              </div>
            )}

            {/* Editable analysis results */}
            {analysis && !manualMode && (
              <div className="space-y-4">
                {previewUrls.length > 0 && (
                  <div className={cn(
                    "grid gap-2",
                    previewUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {previewUrls.map((url, i) => (
                      <div key={i} className="aspect-video bg-muted overflow-hidden rounded-xl">
                        <img src={url} alt={`Food ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">DETECTED ITEMS — tap to edit</Label>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(analysis.confidence * 100)}% confidence
                    </span>
                  </div>

                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {editableFoods.map((food, i) => (
                      <div key={i} className="p-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Input
                            value={food.name}
                            onChange={(e) => updateFood(i, 'name', e.target.value)}
                            placeholder="Food name"
                            className="h-7 text-xs flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                          <button
                            onClick={() => removeFood(i)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={food.portion}
                            onChange={(e) => updateFood(i, 'portion', e.target.value)}
                            placeholder="Portion"
                            className="h-6 text-xs flex-1 border-0 bg-transparent p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              value={food.calories || ''}
                              onChange={(e) => updateFood(i, 'calories', e.target.value)}
                              className="h-6 w-16 text-xs text-right border border-border/50 bg-muted/30 rounded px-1.5 focus-visible:ring-0"
                            />
                            <span className="text-xs text-muted-foreground">cal</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addFood}
                      className="w-full p-2.5 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      ADD ITEM
                    </button>
                  </div>

                  <div className="flex justify-between pt-1 px-1">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold tabular-nums">{editableTotal} cal</span>
                  </div>
                </div>

                {/* Macro breakdown, shown before confirming so nothing is saved blind */}
                <div>
                  <Label className="text-xs text-muted-foreground">MACRO BREAKDOWN</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {([
                      { key: 'protein', label: 'Protein', unit: 'g' },
                      { key: 'carbs', label: 'Carbs', unit: 'g' },
                      { key: 'fat', label: 'Fat', unit: 'g' },
                      { key: 'fiber', label: 'Fiber', unit: 'g' },
                      { key: 'sugar', label: 'Sugar', unit: 'g' },
                      { key: 'sodium', label: 'Sodium', unit: 'mg' },
                    ] as const).map(m => (
                      <div key={m.key} className="p-2 rounded-xl border border-border bg-muted/20 text-center">
                        <div className="text-sm font-bold tabular-nums">
                          {Math.round(pendingMacros[m.key])}{m.unit}
                        </div>
                        <div className="text-[10px] text-muted-foreground tracking-wide">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setAnalysis(null); setEditableFoods([]); setPreviewUrls([]); }}
                    className="border border-border p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-colors text-sm"
                  >
                    <X className="h-4 w-4" />
                    RETRY
                  </button>
                  <button
                    onClick={handleConfirmAnalysis}
                    disabled={isAdding || editableFoods.filter(f => f.name.trim() && f.calories > 0).length === 0}
                    className="btn-brutalist flex items-center justify-center gap-2 text-sm"
                  >
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    LOG {editableTotal} CAL
                  </button>
                </div>
              </div>
            )}

            {manualMode && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">FOOD NAME</Label>
                  <Input
                    placeholder="e.g., Chicken salad"
                    value={manualData.food_name}
                    onChange={(e) => setManualData(prev => ({ ...prev, food_name: e.target.value }))}
                    className="input-terminal mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CALORIES</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 450"
                    value={manualData.calories}
                    onChange={(e) => setManualData(prev => ({ ...prev, calories: e.target.value }))}
                    className="input-terminal mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setManualMode(false); setTextMode(true); setManualData({ food_name: '', calories: '' }); }}
                    className="border border-border p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                    CANCEL
                  </button>
                  <button
                    onClick={handleManualSave}
                    disabled={isAdding}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    SAVE
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Protein breakdown */}
      <Dialog open={isProteinOpen} onOpenChange={setIsProteinOpen}>
        <DialogContent className="z-[1400] max-w-md rounded-3xl border-border bg-background p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              PROTEIN BREAKDOWN{mealDateSuffix.toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          <div className="min-w-0 space-y-4">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="min-w-0">
                <div className="text-3xl font-bold tabular-nums">{Math.round(proteinTotal)}g</div>
                <div className="text-xs text-muted-foreground">of {proteinGoal}g goal</div>
              </div>
              <div className="max-w-[8rem] text-right text-sm leading-snug text-muted-foreground tabular-nums">
                {proteinTotal >= proteinGoal
                  ? `+${Math.round(proteinTotal - proteinGoal)}g over`
                  : `${Math.round(proteinGoal - proteinTotal)}g left`}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">BY MEAL</Label>
              {proteinRows.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">No meals logged yet.</p>
              ) : (
                <div className="min-w-0 border border-border rounded-xl divide-y divide-border overflow-hidden mt-1.5">
                  {proteinRows.map(row => (
                    <div key={row.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-xs leading-snug">{row.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {row.type} · {Math.round(row.calories)} cal
                        </div>
                      </div>
                      <div className="text-sm font-bold tabular-nums shrink-0">{Math.round(row.protein)}g</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">OTHER MACROS TODAY</Label>
              <div className="grid min-w-0 grid-cols-2 gap-2 mt-1.5 sm:grid-cols-3">
                {([
                  { key: 'carbs', label: 'Carbs', unit: 'g' },
                  { key: 'fat', label: 'Fat', unit: 'g' },
                  { key: 'fiber', label: 'Fiber', unit: 'g' },
                  { key: 'sugar', label: 'Sugar', unit: 'g' },
                  { key: 'sodium', label: 'Sodium', unit: 'mg' },
                ] as const).map(m => (
                  <div key={m.key} className="min-w-0 p-2 rounded-xl border border-border bg-muted/20 text-center">
                    <div className="text-sm font-bold tabular-nums">{Math.round(dayMacros[m.key])}{m.unit}</div>
                    <div className="text-[10px] text-muted-foreground tracking-wide">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
