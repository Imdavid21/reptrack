import { MainLayout } from '@/components/layout/MainLayout';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useWorkouts } from '@/hooks/useWorkouts';
import { format } from 'date-fns';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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
          <Link to="/history" className="card-premium flex items-center justify-between hover-lift press-effect block">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <span className="font-semibold">{lastWorkout.day_name}</span>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(lastWorkout.date), 'EEEE, MMM d')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums text-gradient">
                  W{lastWorkout.week_number}
                </div>
                <div className="text-xs text-muted-foreground">
                  {lastWorkout.day}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
        )}

        {/* Activity Heatmap */}
        <Heatmap />

        {/* Empty state */}
        {!isLoading && workouts.length === 0 && (
          <div className="card-premium text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏋️</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Start Your Journey</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Log your first workout to begin your 12-week transformation.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}