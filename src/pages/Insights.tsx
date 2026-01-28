import { Box, Typography, Chip, Skeleton, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Dumbbell, 
  Activity, 
  Moon, 
  Flame,
  Target,
  Brain,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedTabs } from '@/components/ui/AnimatedTabs';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { StrengthOverviewChart } from '@/components/analytics/StrengthOverviewChart';
import { SleepEnergyChart } from '@/components/analytics/SleepEnergyChart';
import { BodyweightChart } from '@/components/analytics/BodyweightChart';
import { HydrationChart } from '@/components/analytics/HydrationChart';
import { PullupAccumulator } from '@/components/analytics/PullupAccumulator';
import { AICoachInsights } from '@/components/analytics/AICoachInsights';
import { SupplementAdherence } from '@/components/analytics/SupplementAdherence';
import { EnergyBalanceCard } from '@/components/health/EnergyBalanceCard';
import { NutritionInsights } from '@/components/health/NutritionInsights';
import { HealthInsightsCard } from '@/components/health/HealthInsightsCard';
import { WeeklySummaryCard } from '@/components/analytics/WeeklySummaryCard';
import { MonthlySummaryCard } from '@/components/analytics/MonthlySummaryCard';
import { RealCorrelationCard } from '@/components/analytics/RealCorrelationCard';
import { VolumeChart } from '@/components/analytics/VolumeChart';
import { EfficiencyChart } from '@/components/analytics/EfficiencyChart';
import { BodyPartsSpline } from '@/components/analytics/BodyPartsSpline';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useVolumeData } from '@/hooks/useVolumeData';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useCorrelationAnalysis } from '@/hooks/useCorrelationAnalysis';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

// Stat card component for the summary row
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  description?: string;
  loading?: boolean;
}

function StatCard({ icon, label, value, trend, description, loading }: StatCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (loading) {
    return (
      <motion.div variants={staggerItem}>
        <MuiCard>
          <Skeleton variant="circular" width={36} height={36} sx={{ mb: 1.5 }} />
          <Skeleton variant="text" width={60} height={32} />
          <Skeleton variant="text" width={80} height={16} />
        </MuiCard>
      </motion.div>
    );
  }

  const positiveBg = theme.palette.action.selected;
  const negativeBg = theme.palette.action.hover;

  return (
    <motion.div variants={staggerItem} style={{ height: '100%' }}>
      <MuiCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: 'success.light',
            color: 'text.primary',
            display: 'flex',
          }}>
            {icon}
          </Box>
          {trend !== undefined && trend !== 0 && (
            <Chip
              size="small"
              icon={trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              label={`${Math.abs(trend)}%`}
              sx={{
                height: 20,
                fontSize: '0.6rem',
                bgcolor: trend > 0 ? positiveBg : negativeBg,
                color: trend > 0 ? 'text.primary' : 'error.main',
                '& .MuiChip-icon': {
                  color: 'inherit',
                  fontSize: 10,
                },
              }}
            />
          )}
        </Box>
        <Box sx={{ mt: 'auto' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.6rem' }}>
            {label}
          </Typography>
          {description && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7, color: 'text.secondary', fontSize: '0.55rem' }}>
              {description}
            </Typography>
          )}
        </Box>
      </MuiCard>
    </motion.div>
  );
}

function SummaryStats() {
  const { workouts, isLoading } = useWorkouts();
  const { dateRange } = useDateRange();
  const { data: metrics, isLoading: metricsLoading } = useDailyMetrics(dateRange);
  const { data: volumeData } = useVolumeData(60);

  const totalSessions = workouts.length;
  const progressPercent = Math.round((totalSessions / 72) * 100);
  
  const totalVolume = volumeData?.totals?.totalVolume || 0;
  const avgSleep = metrics?.totals?.avgSleep?.toFixed(1) || '—';

  // Calculate trends (compare to prior period)
  const midPoint = Math.floor(workouts.length / 2);
  const recentWorkouts = workouts.slice(0, midPoint).length;
  const priorWorkouts = workouts.slice(midPoint).length;
  const sessionsTrend = priorWorkouts > 0 ? Math.round(((recentWorkouts - priorWorkouts) / priorWorkouts) * 100) : 0;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 1.5,
        mb: 3,
      }}>
        <StatCard
          icon={<Dumbbell size={16} />}
          label="Sessions"
          value={totalSessions}
          trend={sessionsTrend}
          loading={isLoading}
        />
        <StatCard
          icon={<Flame size={16} />}
          label="Volume"
          value={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(0)}k` : totalVolume}
          loading={isLoading}
        />
        <StatCard
          icon={<Moon size={16} />}
          label="Avg Sleep"
          value={`${avgSleep}h`}
          loading={metricsLoading}
        />
        <StatCard
          icon={<Target size={16} />}
          label="Progress"
          value={`${progressPercent}%`}
          description="of 12-week program"
          loading={isLoading}
        />
      </Box>
    </motion.div>
  );
}

function OverviewTab() {
  const { data, isLoading } = useCorrelationAnalysis(60);
  
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Monthly Summary */}
        <motion.div variants={staggerItem}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            MONTHLY OVERVIEW
          </Typography>
          {isLoading ? (
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
          ) : data?.monthlySummary ? (
            <MonthlySummaryCard summary={data.monthlySummary} />
          ) : null}
        </motion.div>

        {/* Weekly Summaries */}
        <motion.div variants={staggerItem}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            WEEKLY BREAKDOWN
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {isLoading ? (
              <>
                <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />
                <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />
              </>
            ) : (
              data?.weeklySummaries.slice(0, 2).map((summary, i) => (
                <WeeklySummaryCard 
                  key={summary.weekStart} 
                  summary={summary} 
                  isCurrentWeek={i === 0}
                />
              ))
            )}
          </Box>
        </motion.div>

        {/* Key Correlations Preview */}
        <motion.div variants={staggerItem}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            KEY INSIGHTS
          </Typography>
          {isLoading ? (
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
          ) : data?.correlations.length ? (
            <RealCorrelationCard correlation={data.correlations[0]} />
          ) : (
            <MuiCard>
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                Log more data to unlock insights
              </Typography>
            </MuiCard>
          )}
        </motion.div>
      </Box>
    </motion.div>
  );
}

function PerformanceTab() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <motion.div variants={staggerItem}>
          <EfficiencyChart />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StrengthOverviewChart />
        </motion.div>
        <motion.div variants={staggerItem}>
          <VolumeChart />
        </motion.div>
        <motion.div variants={staggerItem}>
          <PullupAccumulator />
        </motion.div>
      </Box>
    </motion.div>
  );
}

function BodyTab() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <motion.div variants={staggerItem}>
          <BodyPartsSpline />
        </motion.div>
        <motion.div variants={staggerItem}>
          <EnergyBalanceCard />
        </motion.div>
        <motion.div variants={staggerItem}>
          <NutritionInsights />
        </motion.div>
        <motion.div variants={staggerItem}>
          <BodyweightChart />
        </motion.div>
        <motion.div variants={staggerItem}>
          <SleepEnergyChart />
        </motion.div>
        <motion.div variants={staggerItem}>
          <HydrationChart />
        </motion.div>
        <motion.div variants={staggerItem}>
          <SupplementAdherence />
        </motion.div>
      </Box>
    </motion.div>
  );
}

function AITab() {
  const { dateRange } = useDateRange();
  const days = differenceInDays(dateRange.to, dateRange.from) + 1;
  
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <motion.div variants={staggerItem}>
          <HealthInsightsCard days={days} />
        </motion.div>
        <motion.div variants={staggerItem}>
          <AICoachInsights />
        </motion.div>
      </Box>
    </motion.div>
  );
}

function CorrelationsTab() {
  const { data, isLoading } = useCorrelationAnalysis(60);
  const theme = useTheme();
  
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isLoading ? (
          <>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
          </>
        ) : data?.correlations.length ? (
          data.correlations.map(correlation => (
            <motion.div key={correlation.id} variants={staggerItem}>
              <RealCorrelationCard correlation={correlation} />
            </motion.div>
          ))
        ) : (
          <motion.div variants={staggerItem}>
            <MuiCard>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Brain size={32} style={{ color: theme.palette.secondary.main, marginBottom: 8 }} />
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
                  Building Your Insights
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Log more workouts, sleep, and nutrition data to unlock personalized correlations
                </Typography>
              </Box>
            </MuiCard>
          </motion.div>
        )}

        <motion.div variants={staggerItem}>
          <HealthInsightsCard />
        </motion.div>
      </Box>
    </motion.div>
  );
}

function InsightsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const tabs = [
    { label: 'Overview', value: 'overview', icon: <BarChart3 size={12} /> },
    { label: 'Perf', value: 'performance', icon: <Dumbbell size={12} /> },
    { label: 'Body', value: 'body', icon: <Activity size={12} /> },
    { label: 'AI', value: 'ai', icon: <Sparkles size={12} /> },
  ];

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue });
  };

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
        
        {/* Summary Stats */}
        <SummaryStats />
        
        {/* Tabs */}
        <AnimatedTabs tabs={tabs} value={activeTab} onChange={handleTabChange}>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'performance' && <PerformanceTab />}
          {activeTab === 'body' && <BodyTab />}
          {activeTab === 'ai' && <AITab />}
        </AnimatedTabs>
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
