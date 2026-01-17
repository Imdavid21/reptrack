import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';
import { WeeklyProgress } from '@/components/dashboard/WeeklyProgress';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PersonalRecords } from '@/components/dashboard/PersonalRecords';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in pb-20">
        {/* Main Progress */}
        <ProgressHeader />

        {/* Weekly Overview */}
        <WeeklyProgress />

        {/* Personal Records */}
        <PersonalRecords />

        {/* Water Tracking */}
        <WaterTracker />

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
