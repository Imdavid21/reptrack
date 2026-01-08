import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkouts } from '@/hooks/useWorkouts';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Target, Percent } from 'lucide-react';

export default function Analytics() {
  const { workouts } = useWorkouts();

  // Calculate metrics
  const totalSessions = workouts.length;
  const progressPercent = Math.round((totalSessions / 72) * 100);
  const currentWeek = Math.ceil(totalSessions / 6) || 1;

  // Mock data for strength progression (would come from actual logged weights)
  const strengthData = Array.from({ length: Math.min(currentWeek, 12) }, (_, i) => ({
    week: `W${i + 1}`,
    'Bench': 60 + i * 2.5,
    'Squat': 80 + i * 5,
    'Deadlift': 100 + i * 5,
  }));

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
        {strengthData.length > 1 && (
          <div className="card-brutalist">
            <h3 className="section-header">STRENGTH PROGRESSION (KG)</h3>
            <div className="h-[250px] -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={strengthData}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="week" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 0,
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Bench"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Squat"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Deadlift"
                    stroke="hsl(var(--heat-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-foreground" />
                Bench
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-muted-foreground" />
                Squat
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-heat-2" />
                Deadlift
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {workouts.length < 2 && (
          <div className="card-brutalist text-center py-8">
            <p className="text-muted-foreground">
              Log more workouts to see progression charts
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
