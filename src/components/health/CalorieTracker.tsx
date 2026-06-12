import { useState, useRef, useEffect, useMemo } from 'react';
import { useMeals } from '@/hooks/useMeals';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { analyzeFoodImage, FoodAnalysisError, type AnalysisStep, type FoodAnalysis } from '@/lib/analyzeFoodImage';
import { AnalysisProgress } from './AnalysisProgress';
import { 
  Utensils, Camera, Plus, Loader2, Check, X, 
  Coffee, Sun, Sunset, Cookie, Trash2, Image 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';

const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Sunset,
  snack: Cookie,
};

const MEAL_LABELS = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
  snack: 'SNACK',
};

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type EditableFood = {
  name: string;
  portion: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
};

export function CalorieTracker() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { meals, mealsByType, totalCalories, addMeal, deleteMeal, isAdding } = useMeals();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [editableFoods, setEditableFoods] = useState<EditableFood[]>([]);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('compressing');
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({ food_name: '', calories: '' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [contextHint, setContextHint] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Sync editable foods from analysis
  useEffect(() => {
    if (analysis) {
      setEditableFoods(analysis.foods.map(f => ({ ...f })));
    }
  }, [analysis]);

  const editableTotal = useMemo(
    () => editableFoods.reduce((sum, f) => sum + (Number(f.calories) || 0), 0),
    [editableFoods]
  );

  const handleOpenDialog = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setIsDialogOpen(true);
    setAnalysis(null);
    setEditableFoods([]);
    setManualMode(false);
    setManualData({ food_name: '', calories: '' });
    setPreviewUrl(null);
    setUploadedPhotoUrl(null);
    setAnalysisError(null);
    setLastFile(null);
    setContextHint('');
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

    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    setLastFile(file);
    await runAnalysis(file, contextHint || undefined);
    e.target.value = '';
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
      toast.success('Meal logged');
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
      toast.success('Meal logged');
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

  const dailyGoal = preferences?.daily_calorie_goal || 2000;
  const progressPercent = Math.min((totalCalories / dailyGoal) * 100, 100);

  return (
    <>
      <div className="card-brutalist">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-header mb-0">TODAY'S CALORIES</h3>
          <Utensils className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="text-4xl font-bold tabular-nums">
          {totalCalories.toLocaleString()}
          <span className="text-lg text-muted-foreground"> / {dailyGoal}</span>
        </div>

        <div className="progress-bar mt-4">
          <div
            className="progress-bar-fill bg-fuel"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
            const Icon = MEAL_ICONS[type];
            const mealsOfType = mealsByType[type];
            const typeCalories = mealsOfType.reduce((sum, m) => sum + (m.calories || 0), 0);

            return (
              <div key={type} className="border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{MEAL_LABELS[type]}</span>
                  </div>
                  <button
                    onClick={() => handleOpenDialog(type)}
                    className="p-1 hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {mealsOfType.length > 0 ? (
                  <div className="space-y-1">
                    {mealsOfType.map((meal) => (
                      <div key={meal.id} className="flex items-center justify-between text-sm group">
                        <span className="truncate">{meal.food_name || 'Unnamed'}</span>
                        <div className="flex items-center gap-1">
                          <span className="tabular-nums">{meal.calories}</span>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                      Total: {typeCalories} cal
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No meals yet</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-border bg-background max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              LOG {MEAL_LABELS[selectedMealType]}
            </DialogTitle>
          </DialogHeader>

          {/* Meal type selector */}
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
            {!analysis && !manualMode && (
              <>
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

                {previewUrl && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
                  </div>
                )}

                {isAnalyzing ? (
                  <AnalysisProgress currentStep={analysisStep} />
                ) : analysisError ? (
                  <div className="space-y-3">
                    <div className="border border-destructive/30 bg-destructive/5 p-4">
                      <p className="text-sm text-destructive">{analysisError}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setManualMode(true); setAnalysisError(null); }}
                        className="border border-border p-3 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        ENTER MANUALLY
                      </button>
                      <button
                        onClick={() => { if (lastFile) runAnalysis(lastFile, contextHint || undefined); }}
                        disabled={!lastFile}
                        className="btn-brutalist flex items-center justify-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        RETRY
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Context hint */}
                    <div>
                      <Label className="text-xs text-muted-foreground">CONTEXT (OPTIONAL)</Label>
                      <Input
                        placeholder="e.g., restaurant, home cooked, meal prep"
                        value={contextHint}
                        onChange={(e) => setContextHint(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="btn-brutalist flex items-center justify-center gap-2 py-6"
                      >
                        <Camera className="h-5 w-5" />
                        TAKE PHOTO
                      </button>
                      <button
                        onClick={() => galleryInputRef.current?.click()}
                        className="btn-brutalist flex items-center justify-center gap-2 py-6"
                      >
                        <Image className="h-5 w-5" />
                        CHOOSE PHOTO
                      </button>
                    </div>
                    <button
                      onClick={() => setManualMode(true)}
                      className="w-full border border-border p-3 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      TYPE IT IN
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Editable analysis results */}
            {analysis && !manualMode && (
              <div className="space-y-4">
                {previewUrl && (
                  <div className="aspect-video bg-muted overflow-hidden">
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

                  <div className="border border-border divide-y divide-border overflow-hidden">
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
                    onClick={() => {
                      setAnalysis(null);
                      setEditableFoods([]);
                      setPreviewUrl(null);
                    }}
                    className="border border-border p-3 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                    TRY AGAIN
                  </button>
                  <button
                    onClick={handleConfirmAnalysis}
                    disabled={isAdding || editableFoods.filter(f => f.name.trim() && f.calories > 0).length === 0}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
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
                    onClick={() => {
                      setManualMode(false);
                      setManualData({ food_name: '', calories: '' });
                    }}
                    className="border border-border p-3 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                    CANCEL
                  </button>
                  <button
                    onClick={handleManualSave}
                    disabled={isAdding}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
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
