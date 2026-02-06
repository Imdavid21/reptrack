import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, TextField, Collapse, IconButton, Button } from '@mui/material';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Edit3,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { StrengthOverviewChart } from '@/components/analytics/StrengthOverviewChart';
import { VolumeSankeyChart } from '@/components/analytics/VolumeSankeyChart';
import { DailyVitalsChart } from '@/components/analytics/DailyVitalsChart';
import { HydrationChart } from '@/components/analytics/HydrationChart';
import { MLCoachInsights } from '@/components/analytics/MLCoachInsights';
import { PersonalRecords } from '@/components/dashboard/PersonalRecords';
import { CalorieChart } from '@/components/health/CalorieChart';
import { EfficiencyChart } from '@/components/analytics/EfficiencyChart';
import { useCorrelationAnalysis } from '@/hooks/useCorrelationAnalysis';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_health', label: 'Improve Health' },
  { value: 'increase_strength', label: 'Increase Strength' },
];

// Unified Progress Card using global date range + inline editing
function ProgressCard() {
  const theme = useTheme();
  const { preferences, updatePreferences, isLoading: prefsLoading } = useUserPreferences();
  const { dateRange } = useDateRange();

  // Use the global date range for data
  const { data, isLoading } = useCorrelationAnalysis(dateRange);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [goals, setGoals] = useState({
    daily_calorie_goal: '',
    daily_water_goal: '',
    weekly_workout_goal: '',
    sleep_goal: '',
    weight_goal: '',
    weight_goal_type: 'maintain',
    fitness_goal: '',
  });

  useEffect(() => {
    if (preferences) {
      setGoals({
        daily_calorie_goal: (preferences as any).daily_calorie_goal?.toString() || '',
        daily_water_goal: (preferences as any).daily_water_goal?.toString() || '',
        weekly_workout_goal: (preferences as any).weekly_workout_goal?.toString() || '4',
        sleep_goal: (preferences as any).sleep_goal?.toString() || '8',
        weight_goal: (preferences as any).weight_goal?.toString() || '',
        weight_goal_type: (preferences as any).weight_goal_type || 'maintain',
        fitness_goal: (preferences as any).fitness_goal || '',
      });
    }
  }, [preferences]);

  const workoutGoal = preferences?.weekly_workout_goal || 4;
  const monthlyWorkoutGoal = workoutGoal * 4;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences.mutateAsync({
        daily_calorie_goal: goals.daily_calorie_goal ? parseInt(goals.daily_calorie_goal) : null,
        daily_water_goal: goals.daily_water_goal ? parseInt(goals.daily_water_goal) : null,
        weekly_workout_goal: goals.weekly_workout_goal ? parseInt(goals.weekly_workout_goal) : 4,
        sleep_goal: goals.sleep_goal ? parseFloat(goals.sleep_goal) : 8,
        weight_goal: goals.weight_goal ? parseFloat(goals.weight_goal) : null,
        weight_goal_type: goals.weight_goal_type || null,
        fitness_goal: goals.fitness_goal || null,
      } as any);
      toast.success('Goals updated');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save goals');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || prefsLoading) {
    return <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />;
  }

  const thisWeek = data?.weeklySummaries?.[0];
  const lastWeek = data?.weeklySummaries?.[1];
  const summary = data?.monthlySummary;

  if (!thisWeek && !summary) {
    return (
      <MuiCard>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
          Log workouts to see progress
        </Typography>
      </MuiCard>
    );
  }

  // Week-over-week changes (only volume and sleep, not sessions to avoid overlap)
  const volumeChange = lastWeek?.totalVolume && lastWeek.totalVolume > 0
    ? ((thisWeek!.totalVolume - lastWeek.totalVolume) / lastWeek.totalVolume) * 100
    : 0;
  const sleepChange = lastWeek?.avgSleep && lastWeek.avgSleep > 0
    ? ((thisWeek!.avgSleep || 0) - lastWeek.avgSleep) / lastWeek.avgSleep * 100
    : 0;

  const workoutProgress = summary ? Math.round((summary.workouts / monthlyWorkoutGoal) * 100) : 0;
  const volumeFormatted = summary?.totalVolume
    ? (summary.totalVolume >= 1000 ? `${(summary.totalVolume / 1000).toFixed(1)}k` : summary.totalVolume)
    : '—';

  const StatItem = ({ label, thisVal, lastVal, suffix = '', changeVal }: {
    label: string;
    thisVal: string | number;
    lastVal: string | number;
    suffix?: string;
    changeVal: number;
  }) => {
    const isPositive = changeVal > 0;
    const isNegative = changeVal < 0;

    return (
      <Box sx={{
        p: 1.5,
        bgcolor: 'action.hover',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', mb: 0.5, display: 'block' }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {thisVal}{suffix}
          </Typography>
          {changeVal !== 0 && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              color: isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.secondary',
            }}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem' }}>
                {isPositive ? '+' : ''}{Math.round(changeVal)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.55rem' }}>
          vs {lastVal}{suffix} last week
        </Typography>
      </Box>
    );
  };

  return (
    <MuiCard>
      {/* Header with title and edit button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Target size={14} />
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
            GOALS & PROGRESS
          </Typography>
        </Box>
        {!isEditing ? (
          <IconButton size="small" onClick={() => setIsEditing(true)} sx={{ p: 0.5 }}>
            <Edit3 size={14} />
          </IconButton>
        ) : (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={handleSave}
              disabled={isSaving}
              sx={{ p: 0.5, color: 'success.main' }}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setIsEditing(false)}
              sx={{ p: 0.5, color: 'error.main' }}
            >
              <X size={14} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Goals editing inline */}
      <Collapse in={isEditing}>
        <Box sx={{
          p: 1.5,
          bgcolor: 'action.hover',
          borderRadius: 2,
          mb: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', mb: 0.5, display: 'block' }}>
                WEEKLY WORKOUTS
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={goals.weekly_workout_goal}
                onChange={(e) => setGoals(g => ({ ...g, weekly_workout_goal: e.target.value }))}
                InputProps={{
                  endAdornment: <Typography variant="caption" color="text.secondary">/wk</Typography>,
                  sx: { fontSize: '0.875rem' }
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', mb: 0.5, display: 'block' }}>
                SLEEP GOAL
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={goals.sleep_goal}
                onChange={(e) => setGoals(g => ({ ...g, sleep_goal: e.target.value }))}
                InputProps={{
                  endAdornment: <Typography variant="caption" color="text.secondary">hrs</Typography>,
                  sx: { fontSize: '0.875rem' }
                }}
                inputProps={{ step: '0.5' }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', mb: 0.5, display: 'block' }}>
                DAILY CALORIES
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                placeholder="2500"
                value={goals.daily_calorie_goal}
                onChange={(e) => setGoals(g => ({ ...g, daily_calorie_goal: e.target.value }))}
                InputProps={{
                  endAdornment: <Typography variant="caption" color="text.secondary">kcal</Typography>,
                  sx: { fontSize: '0.875rem' }
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', mb: 0.5, display: 'block' }}>
                DAILY WATER
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                placeholder="3000"
                value={goals.daily_water_goal}
                onChange={(e) => setGoals(g => ({ ...g, daily_water_goal: e.target.value }))}
                InputProps={{
                  endAdornment: <Typography variant="caption" color="text.secondary">ml</Typography>,
                  sx: { fontSize: '0.875rem' }
                }}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', mb: 0.5, display: 'block' }}>
              WEIGHT GOAL
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                type="number"
                placeholder="75"
                value={goals.weight_goal}
                onChange={(e) => setGoals(g => ({ ...g, weight_goal: e.target.value }))}
                InputProps={{
                  endAdornment: <Typography variant="caption" color="text.secondary">kg</Typography>,
                  sx: { fontSize: '0.875rem' }
                }}
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
                      px: 1,
                      textTransform: 'capitalize',
                      fontSize: '0.6rem',
                    }}
                  >
                    {type}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', mb: 0.5, display: 'block' }}>
              FITNESS GOAL
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
              {FITNESS_GOALS.map((goal) => (
                <Button
                  key={goal.value}
                  size="small"
                  variant={goals.fitness_goal === goal.value ? 'contained' : 'outlined'}
                  onClick={() => setGoals(g => ({ ...g, fitness_goal: goal.value }))}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.7rem',
                    py: 0.75,
                  }}
                >
                  {goal.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>
      </Collapse>

      {/* Week vs Week comparison - just volume and sleep to avoid overlap with monthly workouts */}
      {thisWeek && (
        <>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.55rem', mb: 1, display: 'block' }}>
            THIS WEEK VS LAST WEEK
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.5 }}>
            <StatItem
              label="VOLUME"
              thisVal={thisWeek.totalVolume >= 1000 ? `${(thisWeek.totalVolume / 1000).toFixed(1)}k` : thisWeek.totalVolume}
              lastVal={lastWeek?.totalVolume ? (lastWeek.totalVolume >= 1000 ? `${(lastWeek.totalVolume / 1000).toFixed(1)}k` : lastWeek.totalVolume) : 0}
              changeVal={volumeChange}
            />
            <StatItem
              label="SLEEP"
              thisVal={thisWeek.avgSleep?.toFixed(1) || '—'}
              lastVal={lastWeek?.avgSleep?.toFixed(1) || '—'}
              suffix="h"
              changeVal={sleepChange}
            />
          </Box>
        </>
      )}

      {/* Monthly progress bar */}
      {summary && (
        <Box sx={{
          p: 1.5,
          bgcolor: 'action.hover',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
              WORKOUTS
            </Typography>
            <Typography variant="caption" sx={{
              fontWeight: 600,
              fontSize: '0.6rem',
              color: workoutProgress >= 100 ? 'success.main' : workoutProgress >= 75 ? 'text.primary' : 'warning.main',
            }}>
              {Math.min(workoutProgress, 100)}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              {summary.workouts} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>/ {monthlyWorkoutGoal}</Typography>
            </Typography>
          </Box>
          <Box sx={{
            height: 4,
            bgcolor: 'divider',
            borderRadius: 2,
            mt: 0.5,
            overflow: 'hidden',
          }}>
            <Box sx={{
              height: '100%',
              width: `${Math.min(workoutProgress, 100)}%`,
              bgcolor: workoutProgress >= 100 ? 'success.main' : 'text.primary',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </Box>
        </Box>
      )}
    </MuiCard>
  );
}

function InsightsContent() {
  return (
    <AnimatedPage>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 10 }}>
        {/* Date range selector */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <DateRangeSelector />
        </Box>

        {/* Main content - single scroll view */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Unified Progress Card */}
            <motion.div variants={staggerItem}>
              <ProgressCard />
            </motion.div>


            {/* Workout Efficiency */}
            <motion.div variants={staggerItem}>
              <EfficiencyChart />
            </motion.div>

            {/* Volume Breakdown */}
            <motion.div variants={staggerItem}>
              <VolumeSankeyChart />
            </motion.div>

            {/* Strength Overview */}
            <motion.div variants={staggerItem}>
              <StrengthOverviewChart />
            </motion.div>

            {/* Energy Balance + Calorie Trends (merged) */}
            <motion.div variants={staggerItem}>
              <CalorieChart />
            </motion.div>

            {/* Daily Vitals (Weight + Sleep merged) */}
            <motion.div variants={staggerItem}>
              <DailyVitalsChart />
            </motion.div>

            {/* Hydration Chart */}
            <motion.div variants={staggerItem}>
              <HydrationChart />
            </motion.div>



            {/* AI Coach Insights */}
            <motion.div variants={staggerItem}>
              <MLCoachInsights />
            </motion.div>
          </Box>
        </motion.div>
      </Box>
    </AnimatedPage>
  );
}

export default function Insights() {
  return (
    <MainLayout title="INSIGHTS">
      <DateRangeProvider>
        <InsightsContent />
      </DateRangeProvider>
    </MainLayout>
  );
}
