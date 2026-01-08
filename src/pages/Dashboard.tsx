import { MainLayout } from '@/components/layout/MainLayout';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useWorkouts } from '@/hooks/useWorkouts';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { workouts, isLoading } = useWorkouts();
  const lastWorkout = workouts[0];

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <StatsGrid />

        <QuickActions />

        <WaterTracker />

        {lastWorkout && (
          <Link 
            to="/history" 
            className="flex items-center justify-between p-4 border border-border rounded-lg"
          >
            <div>
              <div className="font-medium">{lastWorkout.day_name}</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(lastWorkout.date), 'MMM d')} · Week {lastWorkout.week_number}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </Link>
        )}

        <Heatmap />

        {!isLoading && workouts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              No workouts yet. Start your first session.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}