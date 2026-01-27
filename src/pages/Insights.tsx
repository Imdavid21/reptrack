import { useState } from 'react';
import { Box, Typography, Chip, LinearProgress, Skeleton, useTheme, IconButton, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Dumbbell, 
  Activity, 
  Moon, 
  Flame,
  Target,
  Zap,
  Heart,
  BarChart3,
  Calendar,
  Brain,
  Settings,
} from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedTabs } from '@/components/ui/AnimatedTabs';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { StrengthProgressionChart } from '@/components/analytics/StrengthProgressionChart';
import { VolumeChart } from '@/components/analytics/VolumeChart';
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
import { BodyVisualization2D } from '@/components/insights/BodyVisualization2D';
import { GoalsEditor } from '@/components/insights/GoalsEditor';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useHealthAnalytics } from '@/hooks/useHealthAnalytics';
import { useVolumeData } from '@/hooks/useVolumeData';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useCorrelationAnalysis } from '@/hooks/useCorrelationAnalysis';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useSearchParams } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';

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
  if (loading) {
    return (
      <motion.div variants={staggerItem}>
        <MuiCard sx={{ 
          minWidth: 130,
          bgcolor: '#f8f9fa',
          border: '1px solid #e9ecef',
        }}>
          <Skeleton variant="circular" width={36} height={36} sx={{ mb: 1.5 }} />
          <Skeleton variant="text" width={60} height={32} />
          <Skeleton variant="text" width={80} height={16} />
        </MuiCard>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerItem}>
      <MuiCard sx={{ 
        minWidth: 130,
        bgcolor: '#f8f9fa',
        border: '1px solid #e9ecef',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: '#d8f3dc',
            color: '#081c15',
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
                bgcolor: trend > 0 ? '#d8f3dc' : 'rgba(255, 138, 101, 0.15)',
                color: trend > 0 ? '#081c15' : '#ff8a65',
                '& .MuiChip-icon': {
                  color: 'inherit',
                  fontSize: 10,
                },
              }}
            />
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#081c15', fontVariantNumeric: 'tabular-nums' }}>
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
      </MuiCard>
    </motion.div>
  );
}

function SummaryStats() {
  const { workouts, isLoading } = useWorkouts();
  const { dateRange } = useDateRange();
  const { data: metrics, isLoading: metricsLoading } = useDailyMetrics(dateRange);
  const { data: volumeData } = useVolumeData(60);
  const { preferences } = useUserPreferences();

  const totalSessions = workouts.length;
  const weeklyGoal = preferences?.weekly_workout_goal || 4;
  const progressPercent = Math.round((totalSessions / (weeklyGoal * 12)) * 100);
  
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
          description={preferences?.sleep_goal ? `Goal: ${preferences.sleep_goal}h` : undefined}
          loading={metricsLoading}
        />
        <StatCard
          icon={<Target size={16} />}
          label="Progress"
          value={`${Math.min(progressPercent, 100)}%`}
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
        {/* Body Muscle Map */}
        <motion.div variants={staggerItem}>
          <BodyVisualization2D />
        </motion.div>

        {/* Monthly Summary */}
        <motion.div variants={staggerItem}>
          <Typography variant="caption" sx={{ color: '#6c757d', mb: 1, display: 'block', letterSpacing: '0.1em' }}>
            MONTHLY OVERVIEW
          </Typography>
          {isLoading ? (
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2, bgcolor: '#e9ecef' }} />
          ) : data?.monthlySummary ? (
            <MonthlySummaryCard summary={data.monthlySummary} />
          ) : null}
        </motion.div>

        {/* Weekly Summaries */}
        <motion.div variants={staggerItem}>
          <Typography variant="caption" sx={{ color: '#6c757d', mb: 1, display: 'block', letterSpacing: '0.1em' }}>
            WEEKLY BREAKDOWN
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {isLoading ? (
              <>
                <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2, bgcolor: '#e9ecef' }} />
                <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2, bgcolor: '#e9ecef' }} />
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
          <Typography variant="caption" sx={{ color: '#6c757d', mb: 1, display: 'block', letterSpacing: '0.1em' }}>
            KEY INSIGHTS
          </Typography>
          {isLoading ? (
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2, bgcolor: '#e9ecef' }} />
          ) : data?.correlations.length ? (
            <RealCorrelationCard correlation={data.correlations[0]} />
          ) : (
            <MuiCard sx={{ bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
              <Typography variant="body2" sx={{ color: '#6c757d', textAlign: 'center', py: 2 }}>
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
          <StrengthProgressionChart />
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

function VitalsTab() {
  const { dateRange } = useDateRange();
  const days = differenceInDays(dateRange.to, dateRange.from) || 30;
  const { vitals } = useHealthAnalytics(days);

  const heartRateData = vitals
    .filter(v => v.heartRate !== null || v.oxygenLevel !== null)
    .map(v => ({
      date: format(new Date(v.date), 'MMM d'),
      heartRate: v.heartRate,
      oxygen: v.oxygenLevel,
    }));

  const stepsData = vitals
    .filter(v => v.steps !== null && v.steps > 0)
    .map(v => ({
      date: format(new Date(v.date), 'MMM d'),
      steps: v.steps,
    }));

  const renderTooltip = () => ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <Box sx={{ 
        bgcolor: 'background.paper', 
        borderRadius: 2, 
        boxShadow: 2, 
        border: '1px solid #e9ecef',
        p: 1.5,
      }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>{label}</Typography>
        {payload.map((p: any, i: number) => (
          <Typography key={i} variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {p.name}: <strong style={{ color: '#081c15' }}>{p.value}</strong>
          </Typography>
        ))}
      </Box>
    );
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Heart Rate Chart */}
        <motion.div variants={staggerItem}>
          <MuiCard sx={{ bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#d8f3dc' }}>
                <Heart size={14} style={{ color: '#081c15' }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
                Heart Rate & SpO2
              </Typography>
            </Box>
            {heartRateData.length > 0 ? (
              <Box sx={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={heartRateData}>
                    <defs>
                      <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#95d5b2" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#95d5b2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6c757d' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[50, 120]} tick={{ fontSize: 10, fill: '#6c757d' }} axisLine={false} tickLine={false} />
                    <Tooltip content={renderTooltip()} />
                    <Area
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#95d5b2"
                      strokeWidth={2}
                      fill="url(#heartGradient)"
                      name="Heart Rate"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
                No heart rate data yet
              </Typography>
            )}
          </MuiCard>
        </motion.div>

        {/* Steps Chart */}
        <motion.div variants={staggerItem}>
          <MuiCard sx={{ bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#d8f3dc' }}>
                <Activity size={14} style={{ color: '#081c15' }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
                Daily Steps
              </Typography>
            </Box>
            {stepsData.length > 0 ? (
              <Box sx={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stepsData}>
                    <defs>
                      <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#95d5b2" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#95d5b2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6c757d' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6c757d' }} axisLine={false} tickLine={false} />
                    <Tooltip content={renderTooltip()} />
                    <Area
                      type="monotone"
                      dataKey="steps"
                      stroke="#95d5b2"
                      strokeWidth={2}
                      fill="url(#stepsGradient)"
                      name="Steps"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
                No steps data yet
              </Typography>
            )}
          </MuiCard>
        </motion.div>
      </Box>
    </motion.div>
  );
}

function CorrelationsTab() {
  const { data, isLoading } = useCorrelationAnalysis(60);
  
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
            <MuiCard sx={{ bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Brain size={32} style={{ color: '#95d5b2', marginBottom: 8 }} />
                <Typography variant="body2" sx={{ color: '#081c15', fontWeight: 600, mb: 0.5 }}>
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

function InsightsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [goalsOpen, setGoalsOpen] = useState(false);
  
  const tabs = [
    { label: 'Overview', value: 'overview', icon: <BarChart3 size={12} /> },
    { label: 'Perf', value: 'performance', icon: <Dumbbell size={12} /> },
    { label: 'Body', value: 'body', icon: <Activity size={12} /> },
    { label: 'Insights', value: 'insights', icon: <Brain size={12} /> },
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h2" sx={{ color: '#081c15', fontWeight: 700 }}>
              Analytics
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setGoalsOpen(true)}
              sx={{ 
                bgcolor: '#f8f9fa', 
                border: '1px solid #e9ecef',
                '&:hover': { bgcolor: '#e9ecef' },
              }}
            >
              <Settings size={16} style={{ color: '#6c757d' }} />
            </IconButton>
          </Box>
          <DateRangeSelector />
        </Box>
        
        {/* Summary Stats */}
        <SummaryStats />
        
        {/* Tabs */}
        <AnimatedTabs tabs={tabs} value={activeTab} onChange={handleTabChange}>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'performance' && <PerformanceTab />}
          {activeTab === 'body' && <BodyTab />}
          {activeTab === 'insights' && <CorrelationsTab />}
        </AnimatedTabs>
      </Box>
      
      {/* Goals Editor Modal */}
      <GoalsEditor open={goalsOpen} onClose={() => setGoalsOpen(false)} />
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
