import { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setSelectedMealType(mealType);
    setIsDialogOpen(true);
    setAnalysis(null);
    setManualMode(false);
    setTextMode(false);
    setTextInput('');
    setManualData({ food_name: '', calories: '' });
    setPreviewUrl(null);
    setUploadedPhotoUrl(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
    } finally {
      setIsAnalyzing(false);
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
      } as any);
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
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="card-brutalist">
          {/* Compact Header - Always Visible */}
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Utensils className="h-4 w-4 text-muted-foreground" />
                <span className="section-header mb-0">CALORIES</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums">
                  {totalCalories.toLocaleString()}
                  <span className="text-sm text-muted-foreground font-normal"> / {DAILY_GOAL}</span>
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Progress Bar - Always Visible */}
          <div className="progress-bar mt-3">
            <div
              className="progress-bar-fill transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Add Button Row - Always Visible */}
          <div className="flex gap-2 mt-3">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
              const Icon = MEAL_ICONS[type];
              const count = mealsByType[type].length;
              
              return (
                <button
                  key={type}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog(type);
                  }}
                  className="flex-1 border border-border p-2 flex items-center justify-center gap-1 hover:bg-muted transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Expanded Detail View */}
          <CollapsibleContent className="animate-accordion-down">
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                const Icon = MEAL_ICONS[type];
                const mealsOfType = mealsByType[type];
                const typeCalories = mealsOfType.reduce((sum, m) => sum + (m.calories || 0), 0);

                if (mealsOfType.length === 0) return null;

                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3" />
                        <span>{MEAL_LABELS[type]}</span>
                      </div>
                      <span className="tabular-nums">{typeCalories} cal</span>
                    </div>
                    {mealsOfType.map((meal) => (
                      <div key={meal.id} className="flex items-center justify-between text-sm pl-5 group">
                        <span className="truncate">{meal.food_name || 'Unnamed'}</span>
                        <div className="flex items-center gap-2">
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
                  No meals logged yet. Tap a meal type to add.
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
            <DialogTitle className="text-sm font-medium">
              LOG {MEAL_LABELS[selectedMealType].toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
          {!analysis && !manualMode && !textMode && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrl && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
                  </div>
                )}

                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Analyzing food...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-brutalist flex items-center justify-center gap-2 py-6"
                      >
                        <Camera className="h-5 w-5" />
                        PHOTO
                      </button>
                      <button
                        onClick={() => setTextMode(true)}
                        className="border border-border p-4 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                        DESCRIBE
                      </button>
                    </div>
                    <button
                      onClick={() => setManualMode(true)}
                      className="w-full border border-dashed border-border p-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Manual entry (food + calories)
                    </button>
                  </div>
                )}
              </>
            )}

            {textMode && !analysis && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">DESCRIBE YOUR MEAL</Label>
                  <textarea
                    placeholder="e.g., 2 eggs, toast with butter, and a glass of orange juice"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full mt-1 p-3 border border-border bg-background text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    AI will estimate calories and macros
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setTextMode(false); setTextInput(''); }}
                    className="border border-border p-3 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
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
                    ANALYZE
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

                <div className="border border-border p-4">
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
                    className="border border-border p-3 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
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
                    onClick={() => { setManualMode(false); setManualData({ food_name: '', calories: '' }); }}
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
