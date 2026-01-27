import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { X, Target, Droplets, Moon, Flame, Dumbbell, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from '@/lib/toast';

interface GoalsEditorProps {
  open: boolean;
  onClose: () => void;
}

export function GoalsEditor({ open, onClose }: GoalsEditorProps) {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [saving, setSaving] = useState(false);
  
  // Local form state
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(2000);
  const [dailyWaterGoal, setDailyWaterGoal] = useState(8);
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState(4);
  const [sleepGoal, setSleepGoal] = useState(8);
  const [weightGoal, setWeightGoal] = useState<number | null>(null);
  const [weightGoalType, setWeightGoalType] = useState<'lose' | 'gain' | 'maintain' | null>('maintain');

  // Sync with preferences when loaded
  useEffect(() => {
    if (preferences) {
      setDailyCalorieGoal(preferences.daily_calorie_goal || 2000);
      setDailyWaterGoal(preferences.daily_water_goal || 8);
      setWeeklyWorkoutGoal(preferences.weekly_workout_goal || 4);
      setSleepGoal(preferences.sleep_goal || 8);
      setWeightGoal(preferences.weight_goal);
      setWeightGoalType(preferences.weight_goal_type as any || 'maintain');
    }
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences.mutateAsync({
        daily_calorie_goal: dailyCalorieGoal,
        daily_water_goal: dailyWaterGoal,
        weekly_workout_goal: weeklyWorkoutGoal,
        sleep_goal: sleepGoal,
        weight_goal: weightGoal,
        weight_goal_type: weightGoalType,
      });
      toast.success('Goals updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update goals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: '#ffffff',
          maxHeight: '85vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid #e9ecef',
        pb: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#d8f3dc' }}>
            <Target size={18} style={{ color: '#081c15' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#081c15' }}>
            Edit Goals
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: '#95d5b2' }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Daily Calorie Goal */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Flame size={16} style={{ color: '#95d5b2' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
                  Daily Calorie Goal
                </Typography>
              </Box>
              <TextField
                fullWidth
                type="number"
                value={dailyCalorieGoal}
                onChange={(e) => setDailyCalorieGoal(parseInt(e.target.value) || 0)}
                InputProps={{
                  endAdornment: <Typography variant="caption" sx={{ color: '#6c757d' }}>kcal</Typography>,
                }}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': { borderColor: '#e9ecef' },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#6c757d', mt: 0.5, display: 'block' }}>
                Standard: 2000-2500 for maintenance
              </Typography>
            </Box>

            {/* Daily Water Goal */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Droplets size={16} style={{ color: '#95d5b2' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
                  Daily Water Goal
                </Typography>
              </Box>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={dailyWaterGoal}
                  onChange={(_, value) => setDailyWaterGoal(value as number)}
                  min={4}
                  max={16}
                  step={1}
                  marks={[
                    { value: 4, label: '4' },
                    { value: 8, label: '8' },
                    { value: 12, label: '12' },
                    { value: 16, label: '16' },
                  ]}
                  valueLabelDisplay="on"
                  valueLabelFormat={(v) => `${v} glasses`}
                  sx={{
                    color: '#95d5b2',
                    '& .MuiSlider-thumb': { bgcolor: '#081c15' },
                    '& .MuiSlider-markLabel': { fontSize: '0.65rem', color: '#6c757d' },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                Standard: 8 glasses (2L) per day
              </Typography>
            </Box>

            {/* Weekly Workout Goal */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Dumbbell size={16} style={{ color: '#95d5b2' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
                  Weekly Workouts
                </Typography>
              </Box>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={weeklyWorkoutGoal}
                  onChange={(_, value) => setWeeklyWorkoutGoal(value as number)}
                  min={1}
                  max={7}
                  step={1}
                  marks
                  valueLabelDisplay="on"
                  valueLabelFormat={(v) => `${v} sessions`}
                  sx={{
                    color: '#95d5b2',
                    '& .MuiSlider-thumb': { bgcolor: '#081c15' },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                Standard: 3-5 sessions for optimal recovery
              </Typography>
            </Box>

            {/* Sleep Goal */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Moon size={16} style={{ color: '#95d5b2' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
                  Sleep Goal
                </Typography>
              </Box>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={sleepGoal}
                  onChange={(_, value) => setSleepGoal(value as number)}
                  min={5}
                  max={10}
                  step={0.5}
                  marks={[
                    { value: 6, label: '6h' },
                    { value: 8, label: '8h' },
                    { value: 10, label: '10h' },
                  ]}
                  valueLabelDisplay="on"
                  valueLabelFormat={(v) => `${v}h`}
                  sx={{
                    color: '#95d5b2',
                    '& .MuiSlider-thumb': { bgcolor: '#081c15' },
                    '& .MuiSlider-markLabel': { fontSize: '0.65rem', color: '#6c757d' },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                Standard: 7-9 hours for adults
              </Typography>
            </Box>

            {/* Weight Goal */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Scale size={16} style={{ color: '#95d5b2' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
                  Weight Goal
                </Typography>
              </Box>
              
              <ToggleButtonGroup
                value={weightGoalType}
                exclusive
                onChange={(_, value) => value && setWeightGoalType(value)}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              >
                <ToggleButton 
                  value="lose"
                  sx={{ 
                    textTransform: 'none',
                    '&.Mui-selected': { bgcolor: '#d8f3dc', color: '#081c15' },
                  }}
                >
                  Lose
                </ToggleButton>
                <ToggleButton 
                  value="maintain"
                  sx={{ 
                    textTransform: 'none',
                    '&.Mui-selected': { bgcolor: '#d8f3dc', color: '#081c15' },
                  }}
                >
                  Maintain
                </ToggleButton>
                <ToggleButton 
                  value="gain"
                  sx={{ 
                    textTransform: 'none',
                    '&.Mui-selected': { bgcolor: '#d8f3dc', color: '#081c15' },
                  }}
                >
                  Gain
                </ToggleButton>
              </ToggleButtonGroup>

              {weightGoalType !== 'maintain' && (
                <TextField
                  fullWidth
                  type="number"
                  placeholder="Target weight"
                  value={weightGoal || ''}
                  onChange={(e) => setWeightGoal(parseFloat(e.target.value) || null)}
                  InputProps={{
                    endAdornment: <Typography variant="caption" sx={{ color: '#6c757d' }}>kg</Typography>,
                  }}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': { borderColor: '#e9ecef' },
                    },
                  }}
                />
              )}
              
              <Typography variant="caption" sx={{ color: '#6c757d', mt: 1, display: 'block' }}>
                Safe rate: 0.5-1kg per week for weight changes
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e9ecef' }}>
        <Button onClick={onClose} sx={{ color: '#6c757d' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
          sx={{
            bgcolor: '#081c15',
            '&:hover': { bgcolor: '#1a3a2a' },
            borderRadius: 2,
          }}
        >
          Save Goals
        </Button>
      </DialogActions>
    </Dialog>
  );
}
