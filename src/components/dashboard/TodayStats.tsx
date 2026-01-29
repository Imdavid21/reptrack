import { useState, useEffect, useRef } from 'react';
import { Box, ButtonBase, Dialog, DialogTitle, DialogContent, CircularProgress } from '@mui/material';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { useMeals } from '@/hooks/useMeals';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Droplets, Flame, Scale, Camera, Plus, Check, X, Loader2, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';

const WATER_GOAL = 3.5;
const CALORIE_GOAL = 2000;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

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

export function TodayStats() {
  const { user } = useAuth();
  const { totalToday: waterTotal, addWaterLog, isAdding: isAddingWater } = useWaterLogs();
  const { totalCalories, addMeal, isAdding: isAddingMeal } = useMeals();
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dateRange = { from: new Date(), to: new Date() };
  const { data: metricsData, upsertMetrics, isUpserting: isUpdatingWeight } = useDailyMetrics(dateRange);
  
  const todayMetrics = metricsData?.dataPoints.find(d => d.date === todayStr);
  const currentWeight = todayMetrics?.bodyweight ?? null;

  // Weight dialog state
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [weightInput, setWeightInput] = useState<number>(currentWeight ?? 70);

  // Meal dialog state
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({ food_name: '', calories: '' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync weight input when data loads
  useEffect(() => {
    if (currentWeight !== null) {
      setWeightInput(currentWeight);
    }
  }, [currentWeight]);

  // Handlers
  const handleWaterTap = async () => {
    try {
      await addWaterLog(0.25);
      toast.success('+250ml');
    } catch {
      toast.error('Failed to log water');
    }
  };

  const handleCalorieTap = () => {
    setSelectedMealType(getMealTypeByTime());
    setShowMealDialog(true);
    setAnalysis(null);
    setManualMode(false);
    setManualData({ food_name: '', calories: '' });
    setPreviewUrl(null);
    setUploadedPhotoUrl(null);
  };

  const handleWeightTap = () => {
    setWeightInput(currentWeight ?? 70);
    setShowWeightDialog(true);
  };

  const handleSaveWeight = async () => {
    try {
      await upsertMetrics({ date: todayStr, bodyweight: weightInput });
      toast.success(`Weight: ${weightInput}kg`);
      setShowWeightDialog(false);
    } catch {
      toast.error('Failed to log weight');
    }
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
    } catch {
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
    } catch {
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
    } catch {
      toast.error('Failed to save meal');
    }
  };

  const stats = [
    {
      key: 'water',
      icon: Droplets,
      value: `${waterTotal.toFixed(1)}L`,
      goal: WATER_GOAL,
      current: waterTotal,
      label: '+WATER',
      onClick: handleWaterTap,
      isLoading: isAddingWater,
    },
    {
      key: 'calories',
      icon: Flame,
      value: totalCalories.toLocaleString(),
      goal: CALORIE_GOAL,
      current: totalCalories,
      label: '+MEAL',
      onClick: handleCalorieTap,
      isLoading: false,
    },
    {
      key: 'weight',
      icon: Scale,
      value: currentWeight !== null ? `${currentWeight}kg` : '-',
      goal: 1,
      current: currentWeight !== null ? 1 : 0,
      label: '+WEIGHT',
      onClick: handleWeightTap,
      isBoolean: true,
      isActive: false,
      isLoading: isUpdatingWeight,
    },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, mx: -2, px: 2 }}>
        {stats.map(({ key, icon: Icon, value, goal, current, label, onClick, isBoolean, isActive, isLoading }) => {
          const progress = isBoolean ? (current ? 100 : 0) : Math.min((current / goal) * 100, 100);
          const isComplete = progress >= 100;

          return (
            <ButtonBase
              key={key}
              onClick={onClick}
              disabled={isLoading}
              sx={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                minWidth: 100,
                borderRadius: 2,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
            >
              <Box sx={{ position: 'relative', display: 'flex' }}>
                {isLoading ? (
                  <CircularProgress size={18} />
                ) : (
                  <Icon 
                    size={18} 
                    style={{ 
                      color: isComplete ? 'var(--primary)' : 'var(--muted-foreground)' 
                    }} 
                  />
                )}
                {isActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      bgcolor: 'primary.main',
                      borderRadius: '50%',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Box sx={{ fontSize: '0.875rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </Box>
                <Box sx={{ fontSize: '0.625rem', color: 'text.secondary', textTransform: 'uppercase' }}>
                  {label}
                </Box>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Meal Dialog */}
      <Dialog 
        open={showMealDialog} 
        onClose={() => setShowMealDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '0.875rem', fontWeight: 500, pb: 1 }}>
          LOG {selectedMealType.toUpperCase()}
        </DialogTitle>
        <DialogContent>
          {/* Meal Type Selector */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
              <ButtonBase
                key={type}
                onClick={() => setSelectedMealType(type)}
                sx={{
                  flex: 1,
                  py: 1,
                  fontSize: '0.75rem',
                  border: 1,
                  borderColor: selectedMealType === type ? 'primary.main' : 'divider',
                  bgcolor: selectedMealType === type ? 'primary.main' : 'transparent',
                  color: selectedMealType === type ? 'primary.contrastText' : 'text.primary',
                  borderRadius: 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </ButtonBase>
            ))}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!analysis && !manualMode && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {previewUrl && (
                  <Box sx={{ aspectRatio: '16/9', bgcolor: 'action.hover', overflow: 'hidden', borderRadius: 1 }}>
                    <img src={previewUrl} alt="Food" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                )}

                {isAnalyzing ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
                      Analyzing food...
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <ButtonBase
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        py: 3,
                        border: 2,
                        borderColor: 'primary.main',
                        borderRadius: 1,
                      }}
                    >
                      <Camera size={20} />
                      PHOTO
                    </ButtonBase>
                    <ButtonBase
                      onClick={() => setManualMode(true)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        py: 3,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Plus size={20} />
                      MANUAL
                    </ButtonBase>
                  </Box>
                )}
              </>
            )}

            {analysis && !manualMode && (
              <>
                {previewUrl && (
                  <Box sx={{ aspectRatio: '16/9', bgcolor: 'action.hover', overflow: 'hidden', borderRadius: 1 }}>
                    <img src={previewUrl} alt="Food" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                )}

                <Box sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
                  <Box sx={{ fontSize: '0.875rem', mb: 1.5 }}>{analysis.description}</Box>
                  
                  {analysis.foods.map((food, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', mb: 0.5 }}>
                      <span>{food.name} <span style={{ opacity: 0.6 }}>({food.portion})</span></span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{food.calories} cal</span>
                    </Box>
                  ))}

                  <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 1.5, pt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>Total</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{analysis.total_calories} cal</span>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <ButtonBase
                    onClick={() => { setAnalysis(null); setPreviewUrl(null); }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      py: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <X size={16} />
                    RETRY
                  </ButtonBase>
                  <ButtonBase
                    onClick={handleConfirmAnalysis}
                    disabled={isAddingMeal}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      py: 1.5,
                      border: 2,
                      borderColor: 'primary.main',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: 1,
                    }}
                  >
                    {isAddingMeal ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    CONFIRM
                  </ButtonBase>
                </Box>
              </>
            )}

            {manualMode && (
              <>
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

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <ButtonBase
                    onClick={() => { setManualMode(false); setManualData({ food_name: '', calories: '' }); }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      py: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <X size={16} />
                    CANCEL
                  </ButtonBase>
                  <ButtonBase
                    onClick={handleManualSave}
                    disabled={isAddingMeal}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      py: 1.5,
                      border: 2,
                      borderColor: 'primary.main',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: 1,
                    }}
                  >
                    {isAddingMeal ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    SAVE
                  </ButtonBase>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Weight Dialog */}
      <Dialog 
        open={showWeightDialog} 
        onClose={() => setShowWeightDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '0.875rem', fontWeight: 500, pb: 1 }}>
          LOG WEIGHT
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
            {/* Weight input with +/- buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <ButtonBase
                onClick={() => setWeightInput(prev => Math.max(30, prev - 0.5))}
                sx={{
                  width: 48,
                  height: 48,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Minus size={20} />
              </ButtonBase>
              
              <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                <Box sx={{ fontSize: '2rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {weightInput.toFixed(1)}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>kg</Box>
              </Box>
              
              <ButtonBase
                onClick={() => setWeightInput(prev => Math.min(300, prev + 0.5))}
                sx={{
                  width: 48,
                  height: 48,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Plus size={20} />
              </ButtonBase>
            </Box>

            {/* Quick increment buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              {[-1, -0.5, 0.5, 1].map((delta) => (
                <ButtonBase
                  key={delta}
                  onClick={() => setWeightInput(prev => Math.max(30, Math.min(300, prev + delta)))}
                  sx={{
                    px: 2,
                    py: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {delta > 0 ? '+' : ''}{delta}kg
                </ButtonBase>
              ))}
            </Box>

            {/* Save button */}
            <ButtonBase
              onClick={handleSaveWeight}
              disabled={isUpdatingWeight}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 1.5,
                border: 2,
                borderColor: 'primary.main',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 1,
              }}
            >
              {isUpdatingWeight ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              SAVE
            </ButtonBase>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
