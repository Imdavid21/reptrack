import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function History() {
  const { workouts, isLoading } = useWorkouts();
  const navigate = useNavigate();

  // Group workouts by week
  const workoutsByWeek = workouts.reduce((acc, workout) => {
    const week = `WEEK ${workout.week_number}`;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(workout);
    return acc;
  }, {} as Record<string, typeof workouts>);

  // Calculate totals
  const totalVolume = 62480; // Placeholder - would calculate from actual data
  const avgDuration = 52;

  if (isLoading) {
    return (
      <MainLayout title="HISTORY">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-muted" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="HISTORY">
      <div className="space-y-6 pb-20">
        {workouts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border">
            <div className="label-v3">NO WORKOUTS LOGGED YET</div>
          </div>
        ) : (
          <>
            {Object.entries(workoutsByWeek).map(([week, weekWorkouts]) => (
              <div key={week}>
                <div className="label-v3 mb-2">{week}</div>
                <div className="font-mono text-sm">
                  {weekWorkouts.map((workout) => (
                    <button
                      key={workout.id}
                      onClick={() => navigate(`/history/${workout.id}`)}
                      className="row-v3 flex items-center justify-between w-full text-left hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-muted-foreground">
                          {format(new Date(workout.date), 'EEE').toUpperCase()} {format(new Date(workout.date), 'd')}
                        </span>
                        <span>{workout.day_name}</span>
                      </div>
                      <div className="flex items-center gap-4 tabular-nums">
                        <span className="text-muted-foreground">4240KG</span>
                        <span className="text-muted-foreground">{workout.workout_duration_minutes || 52}M</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="divider-v3" />

            {/* Summary stats */}
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{workouts.length} SESSIONS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{totalVolume}KG TOTAL VOLUME</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{avgDuration}MIN AVERAGE DURATION</span>
              </div>
            </div>

            <button className="btn-v3 w-full">
              EXPORT DATA
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
