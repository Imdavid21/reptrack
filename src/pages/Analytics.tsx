import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkouts } from '@/hooks/useWorkouts';
import { StrengthOverviewChart } from '@/components/analytics/StrengthOverviewChart';
import { SleepEnergyChart } from '@/components/analytics/SleepEnergyChart';
import { BodyweightChart } from '@/components/analytics/BodyweightChart';
import { PullupAccumulator } from '@/components/analytics/PullupAccumulator';
import { HydrationChart } from '@/components/analytics/HydrationChart';
import { VolumeChart } from '@/components/analytics/VolumeChart';
import { SupplementAdherence } from '@/components/analytics/SupplementAdherence';
import { AICoachInsights } from '@/components/analytics/AICoachInsights';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { DateRangeProvider } from '@/contexts/DateRangeContext';
import { TrendingUp, Target, Percent } from 'lucide-react';

function AnalyticsContent() {
  const { workouts } = useWorkouts();

  // Calculate metrics
  const totalSessions = workouts.length;
  const progressPercent = Math.round((totalSessions / 72) * 100);
  const currentWeek = Math.ceil(totalSessions / 6) || 1;

  const stats = [
    { 
      label: 'PROGRESS', 
      value: `${progressPercent}%`, 
      icon: Percent,
      description: 'of 12-week program'
    },
    { 
      label: 'CURRENT WEEK', 
      value: currentWeek, 
      icon: Target,
      description: 'of 12 weeks'
    },
    { 
      label: 'SESSIONS', 
      value: totalSessions, 
      icon: TrendingUp,
      description: 'total logged'
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">DATE RANGE</h2>
        <DateRangeSelector />
      </div>

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

      {/* AI Coach Insights */}
      <AICoachInsights />


      {/* Strength Overview Chart */}
      <StrengthOverviewChart />

      {/* Volume Analytics */}
      <VolumeChart />

      {/* Habit Trends Section */}
      <div className="space-y-4">
        <h2 className="section-header">HABIT TRENDS</h2>
        
        <SleepEnergyChart />
        <BodyweightChart />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PullupAccumulator />
          <HydrationChart />
        </div>
      </div>

      {/* Supplement Adherence */}
      <SupplementAdherence />
    </div>
  );
}

export default function Analytics() {
  return (
    <DateRangeProvider>
      <MainLayout title="ANALYTICS">
        <AnalyticsContent />
      </MainLayout>
    </DateRangeProvider>
  );
}
