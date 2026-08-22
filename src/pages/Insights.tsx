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
import { CaffeineChart } from '@/components/analytics/CaffeineChart';
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

function ProgressCard() {
  const { preferences, updatePreferences, isLoading: prefsLoading } = useUserPreferences();
  const { recordGoalHistory } = useGoalHistory();
  const { dateRange } = useDateRange();
  const { data, isLoading } = useCorrelationAnalysis(dateRange);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [goals, setGoals] = useState({
    weekly_workout_goal: '',
    sleep_goal: '',
    daily_caffeine_limit: '',
    weight_goal: '',
    weight_goal_type: 'maintain',
  });

  useEffect(() => {
    if (preferences) {
      setGoals({
        weekly_workout_goal: preferences.weekly_workout_goal?.toString() || '4',
        sleep_goal: preferences.sleep_goal?.toString() || '8',
        daily_caffeine_limit: preferences.daily_caffeine_limit?.toString() || '400',
        weight_goal: preferences.weight_goal?.toString() || '',
        weight_goal_type: preferences.weight_goal_type || 'maintain',
      });
    }
  }, [preferences]);

  const workoutGoal = preferences?.weekly_workout_goal || 4;
  const monthlyWorkoutGoal = workoutGoal * 4;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const workoutGoalValue = goals.weekly_workout_goal ? parseInt(goals.weekly_workout_goal) : 4;
      const sleepGoalValue = goals.sleep_goal ? parseFloat(goals.sleep_goal) : 8;
      const caffeineLimitValue = goals.daily_caffeine_limit ? Math.round(parseFloat(goals.daily_caffeine_limit)) : 400;
      if (!Number.isFinite(caffeineLimitValue) || caffeineLimitValue <= 0 || caffeineLimitValue > 2000) throw new Error('INVALID_CAFFEINE_LIMIT');

      await updatePreferences.mutateAsync({
        weekly_workout_goal: workoutGoalValue,
        sleep_goal: sleepGoalValue,
        daily_caffeine_limit: caffeineLimitValue,
        weight_goal: goals.weight_goal ? parseFloat(goals.weight_goal) : null,
        weight_goal_type: (goals.weight_goal_type as 'lose' | 'gain' | 'maintain') || null,
      });

      await Promise.all([
        recordGoalHistory('weekly_workout_goal', workoutGoalValue, preferences?.weekly_workout_goal),
        recordGoalHistory('sleep_goal', sleepGoalValue, preferences?.sleep_goal),
        recordGoalHistory('daily_caffeine_limit', caffeineLimitValue, preferences?.daily_caffeine_limit),
      ]);

      toast.success('Goals updated');
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'INVALID_CAFFEINE_LIMIT' ? 'Caffeine limit must be between 1 and 2000 mg' : 'Failed to save goals');
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

  const volumeChange = lastWeek?.totalVolume && lastWeek.totalVolume > 0
    ? ((thisWeek!.totalVolume - lastWeek.totalVolume) / lastWeek.totalVolume) * 100
    : 0;
  const sleepChange = lastWeek?.avgSleep && lastWeek.avgSleep > 0
    ? ((thisWeek!.avgSleep || 0) - lastWeek.avgSleep) / lastWeek.avgSleep * 100
    : 0;

  const workoutProgress = summary ? Math.round((summary.workouts / monthlyWorkoutGoal) * 100) : 0;

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
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
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
              color: isPositive ? 'text.primary' : isNegative ? 'error.main' : 'text.secondary',
            }}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {isPositive ? '+' : ''}{Math.round(changeVal)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          vs {lastVal}{suffix} last week
        </Typography>
      </Box>
    );
  };

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Target size={14} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Goals and progress
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
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                Weekly workouts
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
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                Sleep goal
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
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                Caffeine daily limit
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={goals.daily_caffeine_limit}
                onChange={(e) => setGoals(g => ({ ...g, daily_caffeine_limit: e.target.value }))}
                InputProps={{
                  endAdornment: <Typography variant="caption" color="text.secondary">mg/day</Typography>,
                  sx: { fontSize: '0.875rem' }
                }}
                inputProps={{ min: 1, max: 2000, step: '10' }}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              Weight goal
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
                      fontSize: '0.75rem',
                    }}
                  >
                    {type}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Collapse>

      {thisWeek && (
        <>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            This week vs last week
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.5 }}>
            <StatItem
              label="Volume"
              thisVal={thisWeek.totalVolume >= 1000 ? `${(thisWeek.totalVolume / 1000).toFixed(1)}k` : thisWeek.totalVolume}
              lastVal={lastWeek?.totalVolume ? (lastWeek.totalVolume >= 1000 ? `${(lastWeek.totalVolume / 1000).toFixed(1)}k` : lastWeek.totalVolume) : 0}
              changeVal={volumeChange}
            />
            <StatItem
              label="Sleep"
              thisVal={thisWeek.avgSleep?.toFixed(1) || '-'}
              lastVal={lastWeek?.avgSleep?.toFixed(1) || '-'}
              suffix="h"
              changeVal={sleepChange}
            />
          </Box>
        </>
      )}

      {summary && (
        <Box sx={{
          p: 1.5,
          bgcolor: 'action.hover',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Workouts this month
            </Typography>
            <Typography variant="caption" sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
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
          <Typography variant="h1">Insights</Typography>
          <DateRangeSelector />
        </Box>

        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <motion.div variants={staggerItem}>
              <BodyOverviewCard overview={overview} isLoading={overviewLoading} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <BodyScoreTrendCard trend={trend} isLoading={overviewLoading} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <NextStepsCard overview={overview} isLoading={overviewLoading} />
            </motion.div>

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

            <InsightSection label="Fuel" count={9} dotClass="bg-fuel">
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
              <motion.div variants={staggerItem}>
                <MacroChart macro="potassium" />
              </motion.div>
              <motion.div variants={staggerItem}>
                <CaffeineChart />
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
