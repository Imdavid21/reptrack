import { useState, useRef } from 'react';
import { useMeals } from '@/hooks/useMeals';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { analyzeFoodImage, type AnalysisStep, type FoodAnalysis } from '@/lib/analyzeFoodImage';
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

// FoodAnalysis type imported from analyzeFoodImage

export function CalorieTracker() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { meals, mealsByType, totalCalories, addMeal, deleteMeal, isAdding } = useMeals();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('compressing');
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({ food_name: '', calories: '' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setSelectedMealType(mealType);
    setIsDialogOpen(true);
    setAnalysis(null);
    setManualMode(false);
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
    setAnalysisStep('compressing');

    try {
      const result = await analyzeFoodImage(file, user.id, setAnalysisStep);
      setUploadedPhotoUrl(result.publicUrl);
      setAnalysis(result.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Could not analyze image. Try manual entry.');
      setManualMode(true);
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
            className="progress-bar-fill"
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
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              LOG {MEAL_LABELS[selectedMealType].toUpperCase()}
            </DialogTitle>
          </DialogHeader>

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
                ) : (
                  <div className="space-y-2">
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

                  <p className="text-xs text-muted-foreground mt-2">
                    Confidence: {Math.round(analysis.confidence * 100)}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setAnalysis(null);
                      setPreviewUrl(null);
                    }}
                    className="border border-border p-3 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                    TRY AGAIN
                  </button>
                  <button
                    onClick={handleConfirmAnalysis}
                    disabled={isAdding}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
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
