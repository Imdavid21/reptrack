import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Collapse, IconButton } from '@mui/material';
import { Target, ChevronRight, Loader2, Check } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from '@/lib/toast';

interface GoalsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function GoalsSection({ isExpanded, onToggle }: GoalsSectionProps) {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [isSaving, setIsSaving] = useState(false);
  
  const [goals, setGoals] = useState({
    daily_calorie_goal: '',
    daily_water_goal: '',
    weekly_workout_goal: '',
    sleep_goal: '',
    weight_goal: '',
    weight_goal_type: 'maintain',
  });

  useEffect(() => {
    if (preferences) {
      setGoals({
        daily_calorie_goal: (preferences as any).daily_calorie_goal?.toString() || '',
        daily_water_goal: (preferences as any).daily_water_goal?.toString() || '',
        weekly_workout_goal: (preferences as any).weekly_workout_goal?.toString() || '',
        sleep_goal: (preferences as any).sleep_goal?.toString() || '',
        weight_goal: (preferences as any).weight_goal?.toString() || '',
        weight_goal_type: (preferences as any).weight_goal_type || 'maintain',
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences.mutateAsync({
        daily_calorie_goal: goals.daily_calorie_goal ? parseInt(goals.daily_calorie_goal) : null,
        daily_water_goal: goals.daily_water_goal ? parseInt(goals.daily_water_goal) : null,
        weekly_workout_goal: goals.weekly_workout_goal ? parseInt(goals.weekly_workout_goal) : null,
        sleep_goal: goals.sleep_goal ? parseFloat(goals.sleep_goal) : null,
        weight_goal: goals.weight_goal ? parseFloat(goals.weight_goal) : null,
        weight_goal_type: goals.weight_goal_type || null,
      } as any);
      toast.success('Goals updated');
    } catch (error) {
      toast.error('Failed to save goals');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 3, p: 2 }}>
      <Box
        onClick={onToggle}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Target size={18} />
          <Typography variant="body1" fontWeight={600}>Goals</Typography>
        </Box>
        <ChevronRight 
          size={18} 
          style={{ 
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }} 
        />
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Set your daily and weekly targets
      </Typography>
      
      <Collapse in={isExpanded}>
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Loader2 className="animate-spin" size={24} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    DAILY CALORIES
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="2500"
                    value={goals.daily_calorie_goal}
                    onChange={(e) => setGoals(g => ({ ...g, daily_calorie_goal: e.target.value }))}
                    InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">kcal</Typography> }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    DAILY WATER
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="3000"
                    value={goals.daily_water_goal}
                    onChange={(e) => setGoals(g => ({ ...g, daily_water_goal: e.target.value }))}
                    InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">ml</Typography> }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    WEEKLY WORKOUTS
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="5"
                    value={goals.weekly_workout_goal}
                    onChange={(e) => setGoals(g => ({ ...g, weekly_workout_goal: e.target.value }))}
                    InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">days</Typography> }}
                  />
                </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  SLEEP GOAL
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  placeholder="8"
                  value={goals.sleep_goal}
                  onChange={(e) => setGoals(g => ({ ...g, sleep_goal: e.target.value }))}
                  InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">hrs</Typography> }}
                  inputProps={{ step: '0.5' }}
                />
              </Box>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  WEIGHT GOAL
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="75"
                    value={goals.weight_goal}
                    onChange={(e) => setGoals(g => ({ ...g, weight_goal: e.target.value }))}
                    InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">kg</Typography> }}
                    inputProps={{ step: '0.1' }}
                    sx={{ flex: 1 }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {['lose', 'maintain', 'gain'].map((type) => (
                      <Button
                        key={type}
                        size="small"
                        variant={goals.weight_goal_type === type ? 'contained' : 'outlined'}
                        onClick={() => setGoals(g => ({ ...g, weight_goal_type: type }))}
                        sx={{
                          minWidth: 'auto',
                          px: 1.5,
                          textTransform: 'capitalize',
                          fontSize: '0.65rem',
                        }}
                      >
                        {type}
                      </Button>
                    ))}
                  </Box>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="contained"
                disabled={isSaving}
                startIcon={isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                onClick={handleSave}
                sx={{ mt: 1 }}
              >
                Save Goals
              </Button>
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
