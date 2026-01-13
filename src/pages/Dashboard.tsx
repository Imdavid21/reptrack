import { MainLayout } from '@/components/layout/MainLayout';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useWorkouts } from '@/hooks/useWorkouts';
import { format } from 'date-fns';

export default function Dashboard() {
  const { workouts, isLoading } = useWorkouts();
  const lastWorkout = workouts[0];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Hero Stats */}
        <StatsGrid />

        {/* Quick Actions */}
        <QuickActions />

        {/* Water Tracking */}
        <WaterTracker />

        {/* Last Workout */}
        {lastWorkout && (
          <div className="card-brutalist">
            <h3 className="section-header">LAST SESSION</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{lastWorkout.day_name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(lastWorkout.date), 'EEEE, MMM d')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">
                  W{lastWorkout.week_number}
                </div>
                <div className="text-xs text-muted-foreground">
                  {lastWorkout.day}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Heatmap */}
        <Heatmap />

        {/* Empty state */}
        {!isLoading && workouts.length === 0 && (
          <div className="card-brutalist text-center py-8">
            <p className="text-muted-foreground">
              No workouts logged yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Start your 12-week transformation today!
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
