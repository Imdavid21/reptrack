import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { useMeals } from '@/hooks/useMeals';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Droplets, Utensils, Dumbbell, Loader2, Camera, Plus, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

interface FoodAnalysis {
  foods: { name: string; portion: string; calories: number }[];
  total_calories: number;
  confidence: number;
  description: string;
}

function getMealTypeByTime(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 20) return 'dinner';
  return 'snack';
}

export function QuickActionsBar() {
  const { user } = useAuth();
  const { addWaterLog, isAdding: isAddingWater } = useWaterLogs();
  const { addMeal, isAdding: isAddingMeal } = useMeals();
  
  const [showMealDialog, setShowMealDialog] = useState(false);
  
  // Meal dialog state
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({ food_name: '', calories: '' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQuickWater = async () => {
    try {
      await addWaterLog(0.25);
      toast.success('+250ml');
    } catch (error) {
      toast.error('Failed to log water');
    }
  };

  const handleOpenMealDialog = () => {
    setSelectedMealType(getMealTypeByTime());
    setShowMealDialog(true);
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
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
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
      setShowMealDialog(false);
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
      setShowMealDialog(false);
    } catch (error) {
      toast.error('Failed to save meal');
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleQuickWater}
          disabled={isAddingWater}
          className="flex flex-col items-center justify-center gap-1 p-3 border border-border bg-card hover:bg-muted transition-colors"
        >
          {isAddingWater ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Droplets className="h-5 w-5" />
          )}
          <span className="text-2xs text-muted-foreground">+WATER</span>
        </button>

        <Link
          to="/log"
          className="flex flex-col items-center justify-center gap-1 p-3 border border-border bg-card hover:bg-muted transition-colors"
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-2xs text-muted-foreground">WORKOUT</span>
        </Link>

        <button
          onClick={handleOpenMealDialog}
          className="flex flex-col items-center justify-center gap-1 p-3 border border-border bg-card hover:bg-muted transition-colors"
        >
          <Utensils className="h-5 w-5" />
          <span className="text-2xs text-muted-foreground">MEAL</span>
        </button>
      </div>

      {/* Meal Dialog */}
      <Dialog open={showMealDialog} onOpenChange={setShowMealDialog}>
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              LOG {MEAL_LABELS[selectedMealType].toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          {/* Meal Type Selector */}
          <div className="flex gap-1 mb-2">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedMealType(type)}
                className={`flex-1 py-2 text-xs border transition-colors ${
                  selectedMealType === type 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'border-border hover:bg-muted'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {!analysis && !manualMode && (
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-brutalist flex items-center justify-center gap-2 py-6"
                    >
                      <Camera className="h-5 w-5" />
                      PHOTO
                    </button>
                    <button
                      onClick={() => setManualMode(true)}
                      className="border border-border p-4 flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      MANUAL
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
                    disabled={isAddingMeal}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    {isAddingMeal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
                    disabled={isAddingMeal}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    {isAddingMeal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
