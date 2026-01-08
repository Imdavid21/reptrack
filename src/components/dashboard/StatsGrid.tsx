import { useWorkouts } from '@/hooks/useWorkouts';
import { TrendingUp, Flame, Zap, Target } from 'lucide-react';

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
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  const stats = [
    { 
      label: 'Week', 
      value: currentWeek, 
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      label: 'Sessions', 
      value: totalSessions, 
      icon: Flame,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10'
    },
    { 
      label: 'Streak', 
      value: streak, 
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10'
    },
    { 
      label: 'Remaining', 
      value: Math.max(72 - totalSessions, 0), 
      icon: Target,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10'
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(({ label, value, icon: Icon, color, bgColor }, index) => (
        <div 
          key={label} 
          className="stat-card hover-lift"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
            <Icon className={`h-4.5 w-4.5 ${color}`} />
          </div>
          <div className="stat-value tabular-nums">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}