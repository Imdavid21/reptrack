import { useWorkouts } from '@/hooks/useWorkouts';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';

export function RecentActivity() {
  const { workouts, isLoading } = useWorkouts();
  
  const recentWorkouts = workouts.slice(0, 3);

  if (isLoading) {
    return (
      <div className="card-brutalist animate-pulse">
        <div className="h-4 bg-muted w-24 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (recentWorkouts.length === 0) {
    return (
      <div className="card-brutalist">
        <h3 className="section-header">RECENT ACTIVITY</h3>
        <div className="text-center py-6 text-muted-foreground">
          <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No workouts yet</p>
          <p className="text-xs mt-1">Start your first session!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-brutalist">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-header mb-0">RECENT ACTIVITY</h3>
        <Link 
          to="/history" 
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          VIEW ALL <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="space-y-2">
        {recentWorkouts.map((workout) => (
          <div
            key={workout.id}
            className="flex items-center justify-between p-3 border border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-primary/30 flex items-center justify-center text-xs font-bold">
                W{workout.week_number}
              </div>
              <div>
                <div className="font-medium text-sm">{workout.day_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(workout.date), { addSuffix: true })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">{workout.day}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
