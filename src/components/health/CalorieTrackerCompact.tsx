import { useState, useRef, useEffect, useMemo } from 'react';
import { useMeals } from '@/hooks/useMeals';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useCalorieBurn } from '@/hooks/useCalorieBurn';
import { supabase } from '@/integrations/supabase/client';
import { analyzeFoodImage, FoodAnalysisError, type AnalysisStep, type FoodAnalysis } from '@/lib/analyzeFoodImage';
import { AnalysisProgress } from './AnalysisProgress';
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
  const { preferences, updatePreferences } = useUserPreferences();
  const { totalBurned, burns, todayWorkout } = useCalorieBurn(mealsDate);

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoal, setEditGoal] = useState(2000);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const deficitMode = preferences?.deficit_mode_enabled ?? false;
  const deficitTarget = preferences?.daily_deficit_target ?? 500;
  const dailyGoal = preferences?.daily_calorie_goal ?? 2000;
  // Maintenance baseline: explicit override, otherwise infer (cap + target)
  const maintenance = preferences?.maintenance_calories ?? (dailyGoal + deficitTarget);
  // In deficit mode the cap is maintenance minus target; otherwise the plain calorie goal
  const cap = deficitMode ? Math.max(maintenance - deficitTarget, 800) : dailyGoal;
  const proteinGoal = preferences?.daily_protein_goal ?? 180;
  const proteinTotal = useMemo(
    () => meals.reduce((sum, m) => sum + Number(m.protein || 0), 0),
    [meals]
  );
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

  const resetDialogState = () => {
    setAnalysis(null);
    setEditableFoods([]);
    setManualMode(false);
    setTextMode(false);
    setImageMode(false);
    setTextInput('');
    setContextHint('');
    setManualData({ food_name: '', calories: '' });
    setPreviewUrl(null);
    setUploadedPhotoUrl(null);
    setAnalysisError(null);
    setLastFile(null);
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

  const runAnalysis = async (file: File, hint?: string) => {
    if (!user) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setEditableFoods([]);
    setAnalysisError(null);
    setAnalysisStep('compressing');

    try {
      const result = await analyzeFoodImage(file, user.id, setAnalysisStep, hint);
      setUploadedPhotoUrl(result.publicUrl);
      setAnalysis(result.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      const message = error instanceof FoodAnalysisError
        ? error.userMessage
        : (error instanceof Error ? error.message : 'Could not analyze image.');
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsDialogOpen(true);

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setLastFile(file);
    await runAnalysis(file, contextHint || undefined);
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

    const totalProtein = validFoods.reduce((s, f) => s + (f.protein || 0), 0);
    const totalCarbs = validFoods.reduce((s, f) => s + (f.carbs || 0), 0);
    const totalFat = validFoods.reduce((s, f) => s + (f.fat || 0), 0);
    const totalFiber = validFoods.reduce((s, f) => s + (f.fiber || 0), 0);

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
  const hitDeficit = netDeficit >= deficitTarget;
  // Workout calories are calculated from duration when no burn entry was persisted yet.
  const hasPersistedWorkoutBurn = burns.some(b => b.source === 'workout');
  const showCalculatedWorkout = !hasPersistedWorkoutBurn && !!todayWorkout && todayWorkout.calculatedCalories > 0;

  const handleSaveCalorieGoal = async () => {
    try {
      await updatePreferences.mutateAsync({ daily_calorie_goal: editGoal });
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
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
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
            <CollapsibleTrigger className="block w-full text-left">
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
                <div className="p-2.5 rounded-xl border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground tracking-wider">PROTEIN</div>
                  <div className={cn(
                    "text-xl font-bold tabular-nums leading-tight",
                    proteinTotal >= proteinGoal ? "text-[hsl(var(--insight-mint))]" : "text-foreground"
                  )}>
                    {Math.round(proteinTotal)}g
                  </div>
                  <div className="text-[10px] text-muted-foreground">of {proteinGoal}g</div>
                </div>
              </div>
              <div className="flex justify-center mt-1.5">
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CollapsibleTrigger>
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
                {previewUrl && (
                  <div className="aspect-video bg-muted overflow-hidden rounded-xl">
                    <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
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
                  <AnalysisProgress currentStep={analysisStep} />
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
                        onClick={() => { if (lastFile) runAnalysis(lastFile, contextHint || undefined); }}
                        disabled={!lastFile}
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
                {previewUrl && (
                  <div className="aspect-video bg-muted overflow-hidden rounded-xl">
                    <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setAnalysis(null); setEditableFoods([]); setPreviewUrl(null); }}
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
    </>
  );
}
