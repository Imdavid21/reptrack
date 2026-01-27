import { Box, Typography, Chip, LinearProgress, useTheme } from '@mui/material';
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
  Percent,
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
import { useWorkouts } from '@/hooks/useWorkouts';
import { useHealthAnalytics } from '@/hooks/useHealthAnalytics';
import { useVolumeData } from '@/hooks/useVolumeData';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';

// Color palette - minimal pastels
const colorMap = {
  mint: { bg: 'rgba(46, 196, 143, 0.15)', icon: 'hsl(158, 64%, 52%)' },
  lavender: { bg: 'rgba(179, 136, 255, 0.15)', icon: 'hsl(263, 70%, 76%)' },
  coral: { bg: 'rgba(255, 138, 101, 0.15)', icon: 'hsl(15, 80%, 68%)' },
  blue: { bg: 'rgba(100, 181, 246, 0.15)', icon: 'hsl(210, 80%, 70%)' },
  yellow: { bg: 'rgba(255, 213, 79, 0.15)', icon: 'hsl(48, 95%, 76%)' },
  pink: { bg: 'rgba(240, 98, 146, 0.15)', icon: 'hsl(330, 70%, 76%)' },
};

// Stat card component for the summary row
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  color: keyof typeof colorMap;
  description?: string;
}

function StatCard({ icon, label, value, trend, color, description }: StatCardProps) {
  const colors = colorMap[color];
  
  return (
    <motion.div variants={staggerItem}>
      <MuiCard sx={{ minWidth: 130 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: colors.bg,
            color: colors.icon,
            display: 'flex',
          }}>
            {icon}
          </Box>
          {trend !== undefined && trend !== 0 && (
            <Chip
              size="small"
              icon={trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              label={`${Math.abs(trend)}%`}
              sx={{
                height: 22,
                fontSize: '0.65rem',
                bgcolor: trend > 0 ? colorMap.mint.bg : colorMap.coral.bg,
                color: trend > 0 ? colorMap.mint.icon : colorMap.coral.icon,
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />
          )}
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
            {description}
          </Typography>
        )}
      </MuiCard>
    </motion.div>
  );
}

// Correlation insight card
interface CorrelationCardProps {
  title: string;
  insight: string;
  strength: number;
  positive: boolean;
}

function CorrelationCard({ title, insight, strength, positive }: CorrelationCardProps) {
  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Zap size={16} style={{ color: positive ? colorMap.mint.icon : colorMap.coral.icon }} />
        <Typography variant="body2" fontWeight={600}>{title}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {insight}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress 
          variant="determinate" 
          value={strength} 
          sx={{ 
            flex: 1, 
            height: 6, 
            borderRadius: 3,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              bgcolor: positive ? colorMap.mint.icon : colorMap.coral.icon,
              borderRadius: 3,
            },
          }} 
        />
        <Typography variant="caption" color="text.secondary">
          {strength}%
        </Typography>
      </Box>
    </MuiCard>
  );
}

function SummaryStats() {
  const { workouts } = useWorkouts();
  const { dateRange } = useDateRange();
  const { data: metrics } = useDailyMetrics(dateRange);

  const totalSessions = workouts.length;
  const progressPercent = Math.round((totalSessions / 72) * 100);
  
  const totalVolume = workouts.reduce((sum, w) => {
    return sum + (w.workout_duration_minutes || 45) * 100;
  }, 0);
  
  const avgSleep = metrics?.totals?.avgSleep?.toFixed(1) || '—';

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 1.5,
        mb: 3,
      }}>
        <StatCard
          icon={<Dumbbell size={18} />}
          label="Sessions"
          value={totalSessions}
          trend={12}
          color="lavender"
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Volume"
          value={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(0)}k` : totalVolume}
          trend={8}
          color="coral"
        />
        <StatCard
          icon={<Moon size={18} />}
          label="Avg Sleep"
          value={`${avgSleep}h`}
          color="blue"
        />
        <StatCard
          icon={<Target size={18} />}
          label="Progress"
          value={`${progressPercent}%`}
          color="mint"
          description="of 12-week program"
        />
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
        <motion.div variants={staggerItem}>
          <AICoachInsights />
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
        border: 1, 
        borderColor: 'divider',
        p: 1.5,
      }}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        {payload.map((p: any, i: number) => (
          <Typography key={i} variant="caption" color="text.secondary">
            {p.name}: <strong>{p.value}</strong>
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
          <Card className="rounded-2xl shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: colorMap.pink.bg }}>
                  <Heart size={16} style={{ color: colorMap.pink.icon }} />
                </Box>
                Heart Rate & SpO2
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heartRateData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={heartRateData}>
                      <defs>
                        <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colorMap.pink.icon} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={colorMap.pink.icon} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[50, 120]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={renderTooltip()} />
                      <Area
                        type="monotone"
                        dataKey="heartRate"
                        stroke={colorMap.pink.icon}
                        strokeWidth={2}
                        fill="url(#heartGradient)"
                        name="Heart Rate"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No heart rate data yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Steps Chart */}
        <motion.div variants={staggerItem}>
          <Card className="rounded-2xl shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: colorMap.mint.bg }}>
                  <Activity size={16} style={{ color: colorMap.mint.icon }} />
                </Box>
                Daily Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stepsData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stepsData}>
                      <defs>
                        <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colorMap.mint.icon} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={colorMap.mint.icon} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={renderTooltip()} />
                      <Area
                        type="monotone"
                        dataKey="steps"
                        stroke={colorMap.mint.icon}
                        strokeWidth={2}
                        fill="url(#stepsGradient)"
                        name="Steps"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No steps data yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </motion.div>
  );
}

function CorrelationsTab() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <motion.div variants={staggerItem}>
          <CorrelationCard
            title="Sleep → Performance"
            insight="You lift 12% more volume on days following 7+ hours of sleep."
            strength={78}
            positive={true}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <CorrelationCard
            title="Protein → Recovery"
            insight="Higher protein days correlate with better next-day energy scores."
            strength={65}
            positive={true}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <CorrelationCard
            title="Hydration → Energy"
            insight="Hitting water goals increases average energy by 0.8 points."
            strength={52}
            positive={true}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <CorrelationCard
            title="Late Workouts → Sleep"
            insight="Evening workouts after 8pm reduce sleep quality by ~15%."
            strength={41}
            positive={false}
          />
        </motion.div>
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
  const initialTab = searchParams.get('tab') || 'performance';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const tabs = [
    { label: 'Perf', value: 'performance', icon: <Dumbbell size={14} /> },
    { label: 'Body', value: 'body', icon: <Activity size={14} /> },
    { label: 'Vitals', value: 'vitals', icon: <Heart size={14} /> },
    { label: 'AI', value: 'ai', icon: <Target size={14} /> },
  ];

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue });
  };

  return (
    <AnimatedPage>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 10 }}>
        {/* Date Range Selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">DATE RANGE</Typography>
          <DateRangeSelector />
        </Box>
        
        {/* Summary Stats */}
        <SummaryStats />
        
        {/* Tabs */}
        <AnimatedTabs tabs={tabs} value={activeTab} onChange={handleTabChange}>
          {activeTab === 'performance' && <PerformanceTab />}
          {activeTab === 'body' && <BodyTab />}
          {activeTab === 'vitals' && <VitalsTab />}
          {activeTab === 'ai' && <AITab />}
        </AnimatedTabs>
      </Box>
    </AnimatedPage>
  );
}

export default function Insights() {
  return (
    <DateRangeProvider>
      <MainLayout title="INSIGHTS">
        <InsightsContent />
      </MainLayout>
    </DateRangeProvider>
  );
}
