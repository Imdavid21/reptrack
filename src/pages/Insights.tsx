import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { differenceInDays } from 'date-fns';

// Performance tab components
import { useWorkouts } from '@/hooks/useWorkouts';
import { StrengthProgressionChart } from '@/components/analytics/StrengthProgressionChart';
import { VolumeChart } from '@/components/analytics/VolumeChart';

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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Target, Percent, Heart, Activity } from 'lucide-react';

function PerformanceTab() {
  const { workouts } = useWorkouts();

  const totalSessions = workouts.length;
  const progressPercent = Math.round((totalSessions / 72) * 100);
  const currentWeek = Math.ceil(totalSessions / 6) || 1;

  const stats = [
    { label: 'PROGRESS', value: `${progressPercent}%`, icon: Percent, description: 'of 12-week program' },
    { label: 'CURRENT WEEK', value: currentWeek, icon: Target, description: 'of 12 weeks' },
    { label: 'SESSIONS', value: totalSessions, icon: TrendingUp, description: 'total logged' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-2">
        {stats.map(({ label, value, icon: Icon, description }) => (
          <div key={label} className="stat-block flex items-center justify-between">
            <div>
              <div className="stat-value tabular-nums">{value}</div>
              <div className="stat-label">{label}</div>
              <div className="text-xs text-muted-foreground mt-1">{description}</div>
            </div>
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        ))}
      </div>

      <AICoachInsights />
      <StrengthProgressionChart />
      <VolumeChart />
    </div>
  );
}

function BodyTab() {
  return (
    <div className="space-y-4">
      <EnergyBalanceCard />
      <NutritionInsights />
      <SleepEnergyChart />
      <BodyweightChart />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PullupAccumulator />
        <HydrationChart />
      </div>
      <SupplementAdherence />
    </div>
  );
}

function VitalsTab() {
  const { dateRange } = useDateRange();
  // Calculate days from date range
  const days = differenceInDays(dateRange.to, dateRange.from) || 30;
  const { vitals, isLoading } = useHealthAnalytics(days);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading vitals...</div>;
  }

  // Transform vitals data for heart rate and steps charts
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

  return (
    <div className="space-y-4">
      {/* Heart Rate & Oxygen Chart */}
      {heartRateData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4" />
              HEART RATE & OXYGEN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={heartRateData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="hr" domain={[50, 120]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="o2" orientation="right" domain={[90, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 0,
                    }}
                  />
                  <Line yAxisId="hr" type="monotone" dataKey="heartRate" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Heart Rate" />
                  <Line yAxisId="o2" type="monotone" dataKey="oxygen" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="SpO2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps Chart */}
      {stepsData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              DAILY STEPS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stepsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 0,
                    }}
                  />
                  <Area type="monotone" dataKey="steps" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Steps" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {heartRateData.length === 0 && stepsData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border">
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

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-transparent gap-1">
          <TabsTrigger 
            value="performance" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border text-xs py-2"
          >
            PERF
          </TabsTrigger>
          <TabsTrigger 
            value="body" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border text-xs py-2"
          >
            BODY
          </TabsTrigger>
          <TabsTrigger 
            value="vitals" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border text-xs py-2"
          >
            VITALS
          </TabsTrigger>
          <TabsTrigger 
            value="ai" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border text-xs py-2"
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
