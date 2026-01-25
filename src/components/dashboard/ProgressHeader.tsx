import { useWorkouts } from '@/hooks/useWorkouts';
import { Progress } from '@/components/ui/progress';
import { Flame, Target, Calendar } from 'lucide-react';
import { startOfWeek, format } from 'date-fns';

export function ProgressHeader() {
  const { workouts } = useWorkouts();

  const totalSessions = workouts.length;
  const targetSessions = 72; // 12 weeks × 6 days
  const progressPercent = Math.min((totalSessions / targetSessions) * 100, 100);
  const currentWeek = Math.ceil(totalSessions / 6) || 1;
  
  // Count sessions this calendar week (Mon-Sun)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const sessionsThisWeek = workouts.filter(w => w.date >= weekStartStr).length;

  // Calculate current streak
  const calculateStreak = () => {
    if (workouts.length === 0) return 0;
    
    const sortedDates = [...new Set(workouts.map(w => w.date))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
      const workoutDate = new Date(sortedDates[i]);
      workoutDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (workoutDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && workoutDate.getTime() === today.getTime() - 86400000) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  return (
    <div className="card-brutalist">
      {/* Main progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">12-WEEK PROGRAM</span>
          <span className="text-xs font-mono">
            {totalSessions}/{targetSessions} SESSIONS
          </span>
        </div>
        
        <Progress value={progressPercent} className="h-3" />
        
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">WEEK {currentWeek}</span>
          <span className="text-muted-foreground">{Math.round(progressPercent)}% COMPLETE</span>
        </div>
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Calendar className="h-3 w-3" />
          </div>
          <div className="text-xl font-bold tabular-nums">{sessionsThisWeek}/6</div>
          <div className="text-[10px] text-muted-foreground uppercase">THIS WEEK</div>
        </div>
        
        <div className="text-center border-x border-border">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Flame className="h-3 w-3" />
          </div>
          <div className="text-xl font-bold tabular-nums">{streak}</div>
          <div className="text-[10px] text-muted-foreground uppercase">DAY STREAK</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Target className="h-3 w-3" />
          </div>
          <div className="text-xl font-bold tabular-nums">{Math.max(targetSessions - totalSessions, 0)}</div>
          <div className="text-[10px] text-muted-foreground uppercase">TO GO</div>
        </div>
      </div>
    </div>
  );
}
