import { Habits } from '@/hooks/useWorkouts';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Droplets } from 'lucide-react';

interface HabitsFormProps {
  habits: Habits;
  onChange: (habits: Habits) => void;
}

export function HabitsForm({ habits, onChange }: HabitsFormProps) {
  const { totalToday } = useWaterLogs();

  return (
    <div className="space-y-6">
      <h3 className="section-header">DAILY SUMMARY</h3>

      {/* Today's Stats (Read-only from other sources) */}
      <div className="card-brutalist p-4 space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Data</p>
        <div className="flex items-center gap-3 text-lg">
          <Droplets className="h-5 w-5 text-primary" />
          <span className="text-muted-foreground">Water:</span>
          <span className="font-bold tabular-nums">{totalToday.toFixed(2)}L</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Ready to complete your workout!
      </p>
    </div>
  );
}
