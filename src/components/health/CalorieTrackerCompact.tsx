import { useState, useRef, useMemo } from 'react';
import { useMeals } from '@/hooks/useMeals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Utensils, Camera, Plus, Loader2, Check, X, 
  Coffee, Sun, Sunset, Cookie, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';

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

function getMealTypeByTime(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 20) return 'dinner';
  return 'snack';
}

interface FoodAnalysis {
  foods: { name: string; portion: string; calories: number; protein?: number; carbs?: number; fat?: number }[];
  total_calories: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  confidence: number;
  description: string;
  food_quality?: string;
}

export function CalorieTrackerCompact() {
  const { user } = useAuth();
  const { meals, mealsByType, totalCalories, addMeal, deleteMeal, isAdding } = useMeals();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [manualData, setManualData] = useState({ food_name: '', calories: '' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageMode, setImageMode] = useState(false); // NEW: Track when we're in image upload mode
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const resetDialogState = () => {
    setAnalysis(null);
    setManualMode(false);
    setTextMode(false);
    setImageMode(false);
    setTextInput('');
    setManualData({ food_name: '', calories: '' });
    setPreviewUrl(null);
    setUploadedPhotoUrl(null);
  };

  const handleCameraClick = () => {
    setSelectedMealType(getMealTypeByTime());
    resetDialogState();
    setImageMode(true);
    // Directly trigger camera without opening dialog first
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    setSelectedMealType(getMealTypeByTime());
    resetDialogState();
    setImageMode(true);
    // Directly trigger gallery without opening dialog first
    galleryInputRef.current?.click();
  };

  const handleDescribeClick = () => {
    setSelectedMealType(getMealTypeByTime());
    resetDialogState();
    setTextMode(true);
    setIsDialogOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Open dialog now that we have a file
    setIsDialogOpen(true);

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meal-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meal-photos')
        .getPublicUrl(fileName);

      setUploadedPhotoUrl(publicUrl);

      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { imageUrl: publicUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data as FoodAnalysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Could not analyze image. Try manual entry.');
      setManualMode(true);
      setImageMode(false);
    } finally {
      setIsAnalyzing(false);
      // Reset file input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleTextAnalyze = async () => {
    if (!textInput.trim()) {
      toast.error('Please describe your meal');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

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

  const handleConfirmAnalysis = async () => {
    if (!analysis) return;

    try {
      await addMeal({
        meal_type: selectedMealType,
        food_name: analysis.description,
        calories: analysis.total_calories,
        photo_url: uploadedPhotoUrl || undefined,
        ai_detected_food: analysis.foods.map(f => f.name).join(', '),
        ai_confidence: analysis.confidence,
        is_confirmed: true,
        protein: analysis.total_protein,
        carbs: analysis.total_carbs,
        fat: analysis.total_fat,
        food_quality: analysis.food_quality,
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

  const DAILY_GOAL = 2000;
  const progressPercent = Math.min((totalCalories / DAILY_GOAL) * 100, 100);

  return (
    <>
      {/* File inputs - MUST be outside Dialog so they're always rendered */}
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
          {/* Header - Matches WaterTracker */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-header mb-0">TODAY'S CALORIES</h3>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Value Display - Matches WaterTracker */}
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold tabular-nums">
                {totalCalories.toLocaleString()}
              </span>
              <span className="text-lg text-muted-foreground">/ {DAILY_GOAL}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </div>
          </CollapsibleTrigger>

          {/* Progress Bar */}
          <div className="progress-bar mt-4">
            <div
              className="progress-bar-fill transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Recent Meals - matches Water tracker style */}
          {meals.length > 0 && (
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

          {/* Action buttons - matches Water tracker layout */}
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

          {/* Expanded Detail View */}
          <CollapsibleContent className="animate-accordion-down overflow-hidden">
            <div className="mt-4 pt-4 border-t border-border space-y-3 overflow-hidden">
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
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
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

      {/* Dialog - Same as before */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">ADD MEAL</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Mode: Show preview and analysis */}
            {imageMode && !analysis && !manualMode && (
              <>
                {previewUrl && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
                  </div>
                )}

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Estimating calories...</p>
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

                {/* Manual fallback */}
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

            {analysis && !manualMode && (
              <div className="space-y-4">
                {previewUrl && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="border border-border rounded-xl p-4">
                  <p className="text-sm mb-3">{analysis.description}</p>
                  
                  <div className="space-y-2">
                    {analysis.foods.map((food, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{food.name} <span className="text-muted-foreground">({food.portion})</span></span>
                        <span className="tabular-nums">{food.calories} cal</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border mt-3 pt-3 flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold tabular-nums">{analysis.total_calories} cal</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setAnalysis(null); setPreviewUrl(null); }}
                    className="border border-border p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                    RETRY
                  </button>
                  <button
                    onClick={handleConfirmAnalysis}
                    disabled={isAdding}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    CONFIRM
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
