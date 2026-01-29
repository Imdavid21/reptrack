import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Brain,
} from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { StrengthOverviewChart } from '@/components/analytics/StrengthOverviewChart';
import { VolumeSankeyChart } from '@/components/analytics/VolumeSankeyChart';
import { BodyweightChart } from '@/components/analytics/BodyweightChart';
import { HydrationChart } from '@/components/analytics/HydrationChart';
import { MLCoachInsights } from '@/components/analytics/MLCoachInsights';
import { EnergyBalanceCard } from '@/components/health/EnergyBalanceCard';
import { EfficiencyChart } from '@/components/analytics/EfficiencyChart';
import { useCorrelationAnalysis } from '@/hooks/useCorrelationAnalysis';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { SleepChart } from '@/components/analytics/SleepChart';

// Week comparison card
function WeekComparisonCard() {
  const theme = useTheme();
  const { dateRange } = useDateRange();
  const { data, isLoading } = useCorrelationAnalysis(dateRange);

  if (isLoading) {
    return <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />;
  }

  const thisWeek = data?.weeklySummaries?.[0];
  const lastWeek = data?.weeklySummaries?.[1];

  if (!thisWeek) {
    return (
      <MuiCard>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
          Log workouts to see weekly comparison
        </Typography>
      </MuiCard>
    );
  }

  const workoutChange = lastWeek 
    ? ((thisWeek.workouts - lastWeek.workouts) / Math.max(lastWeek.workouts, 1)) * 100
    : 0;
  const volumeChange = lastWeek?.totalVolume && lastWeek.totalVolume > 0
    ? ((thisWeek.totalVolume - lastWeek.totalVolume) / lastWeek.totalVolume) * 100
    : 0;
  const sleepChange = lastWeek?.avgSleep && lastWeek.avgSleep > 0
    ? ((thisWeek.avgSleep || 0) - lastWeek.avgSleep) / lastWeek.avgSleep * 100
    : 0;

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
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1.5, display: 'block' }}>
        THIS WEEK VS LAST WEEK
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        <StatItem 
          label="SESSIONS" 
          thisVal={thisWeek.workouts} 
          lastVal={lastWeek?.workouts || 0}
          changeVal={workoutChange}
        />
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
    </MuiCard>
  );
}

// Monthly goals card
function MonthlyGoalsCard() {
  const theme = useTheme();
  const { dateRange } = useDateRange();
  const { data, isLoading } = useCorrelationAnalysis(dateRange);
  const { preferences } = useUserPreferences();
  
  const workoutGoal = preferences?.weekly_workout_goal 
    ? preferences.weekly_workout_goal * 4 
    : 16; // Default 4 weeks × 4 sessions
  const sleepGoal = preferences?.sleep_goal || 7;
  const waterGoal = preferences?.daily_water_goal || 3.5;

  if (isLoading) {
    return <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />;
  }

  const summary = data?.monthlySummary;
  if (!summary) {
    return (
      <MuiCard>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
          Log data to see monthly goals
        </Typography>
      </MuiCard>
    );
  }

  const workoutProgress = Math.round((summary.workouts / workoutGoal) * 100);
  const sleepProgress = summary.avgSleep ? Math.round((summary.avgSleep / sleepGoal) * 100) : 0;

  const GoalItem = ({ label, current, goal, unit, progress }: {
    label: string;
    current: string | number;
    goal: number;
    unit: string;
    progress: number;
  }) => (
    <Box sx={{ 
      p: 1.5, 
      bgcolor: 'action.hover', 
      borderRadius: 2,
      border: 1,
      borderColor: 'divider',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ 
          fontWeight: 600, 
          fontSize: '0.6rem',
          color: progress >= 100 ? 'success.main' : progress >= 75 ? 'text.primary' : 'warning.main',
        }}>
          {Math.min(progress, 100)}%
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
        {current} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>/ {goal}{unit}</Typography>
      </Typography>
      <Box sx={{ 
        height: 4, 
        bgcolor: 'divider', 
        borderRadius: 2, 
        mt: 0.5,
        overflow: 'hidden',
      }}>
        <Box sx={{ 
          height: '100%', 
          width: `${Math.min(progress, 100)}%`,
          bgcolor: progress >= 100 ? 'success.main' : 'text.primary',
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </Box>
    </Box>
  );

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Target size={14} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          MONTHLY GOALS — {summary.month?.toUpperCase()}
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
        <GoalItem 
          label="WORKOUTS" 
          current={summary.workouts} 
          goal={workoutGoal}
          unit=""
          progress={workoutProgress}
        />
        <GoalItem 
          label="AVG SLEEP" 
          current={summary.avgSleep?.toFixed(1) || '—'} 
          goal={sleepGoal}
          unit="h"
          progress={sleepProgress}
        />
      </Box>
    </MuiCard>
  );
}

function InsightsContent() {
  return (
    <AnimatedPage>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 10 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: 2,
          mb: 1,
        }}>
          <Typography variant="h2" sx={{ color: 'text.primary', fontWeight: 700 }}>
            Analytics
          </Typography>
          <DateRangeSelector />
        </Box>
        
        {/* Main content - single scroll view */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Week vs Week Comparison */}
            <motion.div variants={staggerItem}>
              <WeekComparisonCard />
            </motion.div>

            {/* Monthly Goals */}
            <motion.div variants={staggerItem}>
              <MonthlyGoalsCard />
            </motion.div>

            {/* Workout Efficiency */}
            <motion.div variants={staggerItem}>
              <EfficiencyChart />
            </motion.div>

            {/* Strength Overview */}
            <motion.div variants={staggerItem}>
              <StrengthOverviewChart />
            </motion.div>

            {/* Volume Breakdown */}
            <motion.div variants={staggerItem}>
              <VolumeSankeyChart />
            </motion.div>

            {/* Energy (Calories In vs Out) */}
            <motion.div variants={staggerItem}>
              <EnergyBalanceCard />
            </motion.div>

            {/* Bodyweight Chart */}
            <motion.div variants={staggerItem}>
              <BodyweightChart />
            </motion.div>

            {/* Sleep Chart (no energy) */}
            <motion.div variants={staggerItem}>
              <SleepChart />
            </motion.div>

            {/* Hydration Chart */}
            <motion.div variants={staggerItem}>
              <HydrationChart />
            </motion.div>

            {/* ML Tips at the bottom */}
            <motion.div variants={staggerItem}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Brain size={14} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  ML INSIGHTS
                </Typography>
              </Box>
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
    <MainLayout>
      <DateRangeProvider>
        <InsightsContent />
      </DateRangeProvider>
    </MainLayout>
  );
}
