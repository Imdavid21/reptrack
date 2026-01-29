import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, TextField, Collapse, IconButton, MenuItem, Select, SelectChangeEvent } from '@mui/material';
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
import { toast } from '@/lib/toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Generate months for current year only (2026)
function getMonthOptions() {
  const options = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  
  // Only show months from current year, starting from January up to current month
  for (let month = currentMonth; month >= 0; month--) {
    const date = new Date(currentYear, month, 1);
    options.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    });
  }
  return options;
}

// Unified Progress Card with month selection + weekly comparison + inline editing
function ProgressCard() {
  const theme = useTheme();
  const { dateRange } = useDateRange();
  const { data, isLoading } = useCorrelationAnalysis(dateRange);
  const { preferences, updatePreferences, isLoading: prefsLoading } = useUserPreferences();
  
  // Month selection - default to current month, persist in localStorage
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('insights-selected-month');
    return saved || format(new Date(), 'yyyy-MM');
  });
  
  const monthOptions = useMemo(() => getMonthOptions(), []);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [goals, setGoals] = useState({
    weekly_workout_goal: '',
    sleep_goal: '',
  });

  useEffect(() => {
    if (preferences) {
      setGoals({
        weekly_workout_goal: (preferences as any).weekly_workout_goal?.toString() || '4',
        sleep_goal: (preferences as any).sleep_goal?.toString() || '8',
      });
    }
  }, [preferences]);
  
  // Persist month selection
  useEffect(() => {
    localStorage.setItem('insights-selected-month', selectedMonth);
  }, [selectedMonth]);
  
  const handleMonthChange = (event: SelectChangeEvent<string>) => {
    setSelectedMonth(event.target.value);
  };

  const workoutGoal = preferences?.weekly_workout_goal || 4;
  const monthlyWorkoutGoal = workoutGoal * 4;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences.mutateAsync({
        weekly_workout_goal: goals.weekly_workout_goal ? parseInt(goals.weekly_workout_goal) : 4,
        sleep_goal: goals.sleep_goal ? parseFloat(goals.sleep_goal) : 8,
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
  
  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || summary?.month || 'This Month';

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
      {/* Header with month selector and edit button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Target size={14} />
          <Select
            value={selectedMonth}
            onChange={handleMonthChange}
            variant="standard"
            disableUnderline
            IconComponent={() => <ChevronDown size={14} style={{ marginLeft: 4 }} />}
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'text.secondary',
              '& .MuiSelect-select': {
                py: 0,
                pr: '20px !important',
              },
            }}
          >
            {monthOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.75rem' }}>
                {opt.label.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
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
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1.5,
        }}>
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
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {volumeFormatted} kg vol
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
