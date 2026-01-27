import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { differenceInDays } from 'date-fns';

// Performance tab components
import { useWorkouts } from '@/hooks/useWorkouts';
import { StrengthProgressionChart } from '@/components/analytics/StrengthProgressionChart';
import { VolumeChart } from '@/components/analytics/VolumeChart';
import { InsightStatCard } from '@/components/analytics/InsightStatCard';

import { AICoachInsights } from '@/components/analytics/AICoachInsights';

// Body tab components
import { SleepEnergyChart } from '@/components/analytics/SleepEnergyChart';
import { BodyweightChart } from '@/components/analytics/BodyweightChart';
import { HydrationChart } from '@/components/analytics/HydrationChart';
import { PullupAccumulator } from '@/components/analytics/PullupAccumulator';
import { SupplementAdherence } from '@/components/analytics/SupplementAdherence';
import { EnergyBalanceCard } from '@/components/health/EnergyBalanceCard';
import { NutritionInsights } from '@/components/health/NutritionInsights';
import { HealthInsightsCard } from '@/components/health/HealthInsightsCard';

// Vitals tab components
import { useHealthAnalytics } from '@/hooks/useHealthAnalytics';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { Dumbbell, TrendingUp, Moon, Percent, Heart, Activity } from 'lucide-react';

function SummaryStats() {
  const { workouts } = useWorkouts();
  const { dateRange } = useDateRange();
  const { data: metrics } = useDailyMetrics(dateRange);

  const totalSessions = workouts.length;
  const progressPercent = Math.round((totalSessions / 72) * 100);
  
  // Calculate total volume
  const totalVolume = workouts.reduce((sum, w) => {
    // Simple estimation if we don't have detailed data
    return sum + (w.workout_duration_minutes || 45) * 100;
  }, 0);
  
  const avgSleep = metrics?.totals?.avgSleep?.toFixed(1) || '—';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <InsightStatCard
        icon={Dumbbell}
        label="Sessions"
        value={totalSessions}
        trend={12}
        color="lavender"
      />
      <InsightStatCard
        icon={TrendingUp}
        label="Total Volume"
        value={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(0)}k` : totalVolume}
        trend={8}
        color="mint"
      />
      <InsightStatCard
        icon={Moon}
        label="Avg Sleep"
        value={`${avgSleep}h`}
        color="yellow"
      />
      <InsightStatCard
        icon={Percent}
        label="Progress"
        value={`${progressPercent}%`}
        color="coral"
        description="of 12-week program"
      />
    </div>
  );
}

function PerformanceTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <StrengthProgressionChart />
        <VolumeChart />
      </div>
      <AICoachInsights />
    </div>
  );
}

function BodyTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <EnergyBalanceCard />
        <NutritionInsights />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SleepEnergyChart />
        <BodyweightChart />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PullupAccumulator />
        <HydrationChart />
      </div>
      <SupplementAdherence />
    </div>
  );
}

function VitalsTab() {
  const { dateRange } = useDateRange();
  const days = differenceInDays(dateRange.to, dateRange.from) || 30;
  const { vitals, isLoading } = useHealthAnalytics(days);

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

  const renderTooltip = (color: string) => ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 p-3 text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-muted-foreground">
            {p.name}: <span className="font-medium text-foreground">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Heart Rate Chart */}
        <Card className="rounded-2xl shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-2 rounded-xl bg-insight-pink/15">
                <Heart className="h-4 w-4 text-insight-pink" />
              </div>
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
                        <stop offset="5%" stopColor="hsl(var(--insight-pink))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--insight-pink))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[50, 120]} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={renderTooltip('pink')} />
                    <Area
                      type="monotone"
                      dataKey="heartRate"
                      stroke="hsl(var(--insight-pink))"
                      strokeWidth={2}
                      fill="url(#heartGradient)"
                      name="Heart Rate"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No heart rate data yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Steps Chart */}
        <Card className="rounded-2xl shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-2 rounded-xl bg-insight-mint/15">
                <Activity className="h-4 w-4 text-insight-mint" />
              </div>
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
                        <stop offset="5%" stopColor="hsl(var(--insight-mint))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--insight-mint))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={renderTooltip('mint')} />
                    <Area
                      type="monotone"
                      dataKey="steps"
                      stroke="hsl(var(--insight-mint))"
                      strokeWidth={2}
                      fill="url(#stepsGradient)"
                      name="Steps"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No steps data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {heartRateData.length === 0 && stepsData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed border-border/50 bg-card/50">
          <p>No vitals data yet.</p>
          <p className="text-xs mt-1">Log your morning check-ins to see trends here.</p>
        </div>
      )}
    </div>
  );
}

function AITab() {
  const { dateRange } = useDateRange();
  const days = differenceInDays(dateRange.to, dateRange.from) + 1;
  
  return (
    <div className="space-y-4">
      <HealthInsightsCard days={days} />
      <AICoachInsights />
    </div>
  );
}

function InsightsContent() {
  return (
    <div className="space-y-4 animate-fade-in pb-20">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">DATE RANGE</h2>
        <DateRangeSelector />
      </div>

      {/* Summary Stats */}
      <SummaryStats />

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/30 rounded-full gap-1">
          <TabsTrigger 
            value="performance" 
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-full text-xs py-2 transition-all"
          >
            Performance
          </TabsTrigger>
          <TabsTrigger 
            value="body" 
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-full text-xs py-2 transition-all"
          >
            Body
          </TabsTrigger>
          <TabsTrigger 
            value="vitals" 
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-full text-xs py-2 transition-all"
          >
            Vitals
          </TabsTrigger>
          <TabsTrigger 
            value="ai" 
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-full text-xs py-2 transition-all"
          >
            AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-4">
          <PerformanceTab />
        </TabsContent>

        <TabsContent value="body" className="mt-4">
          <BodyTab />
        </TabsContent>

        <TabsContent value="vitals" className="mt-4">
          <VitalsTab />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AITab />
        </TabsContent>
      </Tabs>
    </div>
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
