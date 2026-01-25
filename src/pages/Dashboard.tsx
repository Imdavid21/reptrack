import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';
import { WeeklyProgress } from '@/components/dashboard/WeeklyProgress';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PersonalRecords } from '@/components/dashboard/PersonalRecords';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { MorningCheckinCard } from '@/components/health/MorningCheckinCard';
import { NightCheckinCard } from '@/components/health/NightCheckinCard';
import { CalorieTracker } from '@/components/health/CalorieTracker';
import { HealthReadingsCard } from '@/components/health/HealthReadingsCard';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in pb-20">
        {/* Main Progress */}
        <ProgressHeader />

        {/* Morning & Night Check-ins */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MorningCheckinCard />
          <NightCheckinCard />
        </div>

        {/* Calorie Tracking */}
        <CalorieTracker />

        {/* Water Tracking */}
        <WaterTracker />

        {/* Health Readings */}
        <HealthReadingsCard />

        {/* Weekly Overview */}
        <WeeklyProgress />

        {/* Personal Records */}
        <PersonalRecords />

        {/* Recent Activity */}
        <RecentActivity />

        {/* Activity Heatmap */}
        <Heatmap />
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
