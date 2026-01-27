import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, Calendar, Edit2, Clock } from 'lucide-react';
import { BackfillDialog } from '@/components/dashboard/BackfillDialog';

export default function History() {
  const { workouts, isLoading } = useWorkouts();
  const navigate = useNavigate();

  // Group workouts by week
  const workoutsByWeek = workouts.reduce((acc, workout) => {
    const week = `Week ${workout.week_number}`;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(workout);
    return acc;
  }, {} as Record<string, typeof workouts>);

  return (
    <MainLayout title="HISTORY">
      <div className="space-y-6 animate-fade-in">
        {/* Backfill Action */}
        <div className="flex justify-end">
          <BackfillDialog />
        </div>

        {workouts.length === 0 ? (
          <div className="card-brutalist text-center py-8">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No workouts logged yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start logging to build your history
            </p>
          </div>
        ) : (
          Object.entries(workoutsByWeek).map(([week, weekWorkouts]) => (
            <div key={week}>
              <h3 className="section-header">{week.toUpperCase()}</h3>
              <div className="space-y-2">
                {weekWorkouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => navigate(`/history/${workout.id}`)}
                    className="card-brutalist flex items-center justify-between w-full text-left hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-bold">{workout.day_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(workout.date), 'EEEE, MMM d')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-brutalist">{workout.day}</span>
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Stats summary */}
        {workouts.length > 0 && (
          <div className="stat-block">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value tabular-nums">{workouts.length}</div>
                <div className="stat-label">TOTAL SESSIONS</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">
                  {Math.max(...workouts.map((w) => w.week_number))}
                </div>
                <div className="text-xs text-muted-foreground">WEEKS COMPLETED</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
