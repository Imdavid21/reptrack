import { useWorkouts } from '@/hooks/useWorkouts';

export function StatsGrid() {
  const { workouts } = useWorkouts();

  const totalSessions = workouts.length;
  const currentWeek = Math.ceil(totalSessions / 6) || 1;
  
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
    { label: 'Week', value: currentWeek },
    { label: 'Sessions', value: totalSessions },
    { label: 'Streak', value: streak },
    { label: 'Left', value: Math.max(72 - totalSessions, 0) },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(({ label, value }) => (
        <div key={label} className="text-center">
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}