import { useWorkouts } from '@/hooks/useWorkouts';
import { TrendingUp, Flame, Moon, Zap } from 'lucide-react';

export function StatsGrid() {
  const { workouts } = useWorkouts();

  const totalSessions = workouts.length;
  const currentWeek = Math.ceil(totalSessions / 6) || 1;
  
  // Calculate streak (consecutive days with workouts)
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
        // Allow for yesterday if today hasn't been logged yet
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  const stats = [
    { label: 'WEEK', value: currentWeek, icon: TrendingUp },
    { label: 'SESSIONS', value: totalSessions, icon: Flame },
    { label: 'STREAK', value: streak, icon: Zap },
    { label: 'REMAINING', value: Math.max(72 - totalSessions, 0), icon: Moon },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="stat-block">
          <div className="flex items-center justify-between">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="stat-value tabular-nums">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
