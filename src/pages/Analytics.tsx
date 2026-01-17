import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkouts } from '@/hooks/useWorkouts';
import { StrengthProgressionChart } from '@/components/analytics/StrengthProgressionChart';
import { TrendingUp, Target, Percent } from 'lucide-react';

export default function Analytics() {
  const { workouts } = useWorkouts();

  // Calculate metrics
  const totalSessions = workouts.length;
  const progressPercent = Math.round((totalSessions / 72) * 100);
  const currentWeek = Math.ceil(totalSessions / 6) || 1;

  const stats = [
    { 
      label: 'PROGRESS', 
      value: `${progressPercent}%`, 
      icon: Percent,
      description: 'of 12-week program'
    },
    { 
      label: 'CURRENT WEEK', 
      value: currentWeek, 
      icon: Target,
      description: 'of 12 weeks'
    },
    { 
      label: 'SESSIONS', 
      value: totalSessions, 
      icon: TrendingUp,
      description: 'total logged'
    },
  ];

  return (
    <MainLayout title="ANALYTICS">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid gap-2">
          {stats.map(({ label, value, icon: Icon, description }) => (
            <div key={label} className="stat-block flex items-center justify-between">
              <div>
                <div className="stat-value tabular-nums">{value}</div>
                <div className="stat-label">{label}</div>
                <div className="text-xs text-muted-foreground mt-1">{description}</div>
              </div>
              <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
          ))}
        </div>

        {/* Strength Progression Chart */}
        <StrengthProgressionChart />
      </div>
    </MainLayout>
  );
}
