import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';
import { DailyRitualCard } from '@/components/dashboard/DailyRitualCard';
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar';
import { TodayStats } from '@/components/dashboard/TodayStats';
import { WeeklyProgress } from '@/components/dashboard/WeeklyProgress';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { CalorieTracker } from '@/components/health/CalorieTracker';
import { SupplementCard } from '@/components/dashboard/SupplementCard';
import { PersonalRecords } from '@/components/dashboard/PersonalRecords';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { HealthReadingsCard } from '@/components/health/HealthReadingsCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  const [showMore, setShowMore] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in pb-20">
        {/* Progress Overview */}
        <ProgressHeader />

        {/* Quick Actions Bar */}
        <QuickActionsBar />

        {/* Today's Stats (horizontal scroll) */}
        <TodayStats />

        {/* Time-Aware Daily Ritual Card */}
        <DailyRitualCard />

        {/* Weekly Progress Grid */}
        <WeeklyProgress />

        {/* Core Trackers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WaterTracker />
          <CalorieTracker />
        </div>

        {/* Supplements - Standalone Card */}
        <SupplementCard />

        {/* Collapsible More Section */}
        <Collapsible open={showMore} onOpenChange={setShowMore}>
          <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border bg-card">
            <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
            {showMore ? 'SHOW LESS' : 'MORE'}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Personal Records */}
            <PersonalRecords />

            {/* Health Readings (BP/Sugar) */}
            <HealthReadingsCard />

            {/* Recent Activity */}
            <RecentActivity />

            {/* Activity Heatmap */}
            <Heatmap />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Floating Action Button */}
      <Link
        to="/log"
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
        aria-label="Log workout"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </MainLayout>
  );
}
