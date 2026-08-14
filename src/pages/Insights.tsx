import { ReactNode, useState, useEffect } from 'react';
import { Box, Typography, Skeleton, TextField, Collapse, IconButton, Button } from '@mui/material';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Edit3,
  Check,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';

import { VolumeSankeyChart } from '@/components/analytics/VolumeSankeyChart';
import { DailyVitalsChart } from '@/components/analytics/DailyVitalsChart';
import { HydrationChart } from '@/components/analytics/HydrationChart';
import { CalorieChart } from '@/components/health/CalorieChart';
import { MacroChart } from '@/components/health/MacroChart';
import { EfficiencyChart } from '@/components/analytics/EfficiencyChart';
import { ExerciseProgressionChart } from '@/components/analytics/ExerciseProgressionChart';
import { BodyOverviewCard } from '@/components/analytics/BodyOverviewCard';
import { BodyScoreTrendCard } from '@/components/analytics/BodyScoreTrendCard';
import { NextStepsCard } from '@/components/analytics/NextStepsCard';
import { MuscleBalanceCard } from '@/components/analytics/MuscleBalanceCard';
import { GrowthInsightsCard } from '@/components/analytics/GrowthInsightsCard';
import { PersonalRecordsCard } from '@/components/analytics/PersonalRecordsCard';
import { useBodyOverview } from '@/hooks/useBodyOverview';
import { useMuscleIntelligence } from '@/hooks/useMuscleIntelligence';
import { useCorrelationAnalysis } from '@/hooks/useCorrelationAnalysis';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useGoalHistory } from '@/hooks/useGoalHistory';
import { normalizeWaterGoalLiters } from '@/lib/bodyScore';
import { toast } from '@/lib/toast';

function InsightSection({ label, count, dotClass, initiallyOpen = false, children }: { label: string; count: number; dotClass: string; initiallyOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: open ? 2 : 1 }}>
      <Box component="button" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} sx={{ width: '100%', border: 0, bgcolor: 'transparent', px: 1, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'text.primary', textAlign: 'left', '&:hover': { bgcolor: 'action.hover', borderRadius: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}><span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden /><Box><Typography variant="body2" fontWeight={600}>{label}</Typography><Typography variant="caption" color="text.secondary">{count} {count === 1 ? 'view' : 'views'}</Typography></Box></Box>
        <ChevronDown size={18} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} />
      </Box>
      <Collapse in={open}><Box sx={{ display: 'grid', gap: 2, mt: 1.5 }}>{children}</Box></Collapse>
    </Box>
  );
}

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_health', label: 'Improve Health' },
  { value: 'increase_strength', label: 'Increase Strength' },
];

// Unified Progress Card using global date range + inline editing
function ProgressCard() {
  const { preferences, updatePreferences, isLoading: prefsLoading } = useUserPreferences();
  const { recordGoalHistory } = useGoalHistory();
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
        daily_calorie_goal: preferences.daily_calorie_goal?.toString() || '',
        // This field collects/displays ml (see the "ml" adornment below), but
        // daily_water_goal is stored in LITERS everywhere else in the app
        // (WaterTracker's slider, HydrationChart, the body-score hydration
        // pillar) — convert on the way in and out so this is the only place
        // that ever deals with the ml scale.
        daily_water_goal: preferences.daily_water_goal
          ? String(Math.round(normalizeWaterGoalLiters(preferences.daily_water_goal) * 1000))
          : '',
        weekly_workout_goal: preferences.weekly_workout_goal?.toString() || '4',
        sleep_goal: preferences.sleep_goal?.toString() || '8',
        weight_goal: preferences.weight_goal?.toString() || '',
        weight_goal_type: preferences.weight_goal_type || 'maintain',
        fitness_goal: preferences.fitness_goal || '',
      });
    }
  }, [preferences]);

  const workoutGoal = preferences?.weekly_workout_goal || 4;
  const monthlyWorkoutGoal = workoutGoal * 4;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const calorieGoal = goals.daily_calorie_goal ? parseInt(goals.daily_calorie_goal) : null;
      const calorieGoalChanged = calorieGoal != null && calorieGoal !== preferences?.daily_calorie_goal;
      // Field collects ml; daily_water_goal is stored in liters (see note above).
      const waterGoal = goals.daily_water_goal ? parseInt(goals.daily_water_goal) / 1000 : null;
      const workoutGoalValue = goals.weekly_workout_goal ? parseInt(goals.weekly_workout_goal) : 4;
      const sleepGoalValue = goals.sleep_goal ? parseFloat(goals.sleep_goal) : 8;

      await updatePreferences.mutateAsync({
        daily_calorie_goal: calorieGoal,
        calorie_target_locked: calorieGoalChanged ? true : preferences?.calorie_target_locked,
        daily_water_goal: waterGoal,
        weekly_workout_goal: workoutGoalValue,
        sleep_goal: sleepGoalValue,
        weight_goal: goals.weight_goal ? parseFloat(goals.weight_goal) : null,
        weight_goal_type: (goals.weight_goal_type as 'lose' | 'gain' | 'maintain') || null,
        fitness_goal: goals.fitness_goal || null,
      });

      // Layer point-in-time tracking on top for the goals judged against
      // historical data (see useGoalHistory) — weight_goal/fitness_goal
      // aren't per-day targets, so they don't get a history entry.
      const historyWrites: Promise<void>[] = [];
      if (calorieGoal != null) {
        historyWrites.push(recordGoalHistory('daily_calorie_goal', calorieGoal, preferences?.daily_calorie_goal));
      }
      if (waterGoal != null) {
        historyWrites.push(recordGoalHistory('daily_water_goal', waterGoal, preferences?.daily_water_goal));
      }
      historyWrites.push(recordGoalHistory('weekly_workout_goal', workoutGoalValue, preferences?.weekly_workout_goal));
      historyWrites.push(recordGoalHistory('sleep_goal', sleepGoalValue, preferences?.sleep_goal));
      await Promise.all(historyWrites);

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
              WORKOUTS THIS MONTH

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
  const { dateRange } = useDateRange();
  const { overview, trend, isLoading: overviewLoading } = useBodyOverview(dateRange);
  const { data: muscleData, isLoading: muscleLoading } = useMuscleIntelligence();

  return (
    <AnimatedPage>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, pb: .5 }}>
          <Box>
            <Typography variant="h1">Insights</Typography>
          </Box>
          <DateRangeSelector />
        </Box>

        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* North star: composite body overview + trend + what to do about it */}
            <motion.div variants={staggerItem}>
              <BodyOverviewCard overview={overview} isLoading={overviewLoading} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <BodyScoreTrendCard trend={trend} isLoading={overviewLoading} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <NextStepsCard overview={overview} isLoading={overviewLoading} />
            </motion.div>

            {/* Goals editor + week-over-week summary */}
            <motion.div variants={staggerItem}>
              <ProgressCard />
            </motion.div>

            <InsightSection label="Training" count={6} dotClass="bg-energy" initiallyOpen>
              <motion.div variants={staggerItem}>
              <PersonalRecordsCard />
              </motion.div>
              <motion.div variants={staggerItem}>
              <GrowthInsightsCard data={muscleData} isLoading={muscleLoading} />
              </motion.div>
              <motion.div variants={staggerItem}>
              <MuscleBalanceCard data={muscleData} isLoading={muscleLoading} />
              </motion.div>
              <motion.div variants={staggerItem}>
              <EfficiencyChart />
              </motion.div>
              <motion.div variants={staggerItem}>
              <VolumeSankeyChart />
              </motion.div>
              <motion.div variants={staggerItem}>
              <ExerciseProgressionChart />
              </motion.div>
            </InsightSection>

            <InsightSection label="Fuel" count={7} dotClass="bg-fuel">
              <motion.div variants={staggerItem}>
              <CalorieChart />
              </motion.div>
              <motion.div variants={staggerItem}>
              <MacroChart macro="protein" />
              </motion.div>
              <motion.div variants={staggerItem}>
              <MacroChart macro="carbs" />
              </motion.div>
              <motion.div variants={staggerItem}>
              <MacroChart macro="fat" />
              </motion.div>
              <motion.div variants={staggerItem}>
              <MacroChart macro="fiber" />
              </motion.div>
              <motion.div variants={staggerItem}>
              <MacroChart macro="sugar" />
              </motion.div>
              <motion.div variants={staggerItem}>
              <MacroChart macro="sodium" />
              </motion.div>
            </InsightSection>

            <InsightSection label="Recovery & body" count={2} dotClass="bg-recover">
              <motion.div variants={staggerItem}>
              <DailyVitalsChart />
              </motion.div>
              <motion.div variants={staggerItem}>
              <HydrationChart />
              </motion.div>
            </InsightSection>

          </Box>
        </motion.div>
      </Box>
    </AnimatedPage>
  );
}

export default function Insights() {
  return (
    <MainLayout>
      <DateRangeProvider>
        <InsightsContent />
      </DateRangeProvider>
    </MainLayout>
  );
}
