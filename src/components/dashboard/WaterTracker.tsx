import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const DAILY_GOAL = 3.5;

export function WaterTracker() {
  const { waterLogs, totalToday, addWaterLog, isAdding } = useWaterLogs();

  const handleLogWater = async () => {
    try {
      await addWaterLog(0.25);
      toast.success('250ml logged');
    } catch (error) {
      toast.error('Failed to log water');
    }
  };

  const progressPercent = Math.min((totalToday / DAILY_GOAL) * 100, 100);

  return (
    <div className="border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">Water</span>
        <span className="text-sm text-muted-foreground">{DAILY_GOAL}L goal</span>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-semibold tabular-nums">
          {totalToday.toFixed(1)}
        </span>
        <span className="text-muted-foreground">L</span>
      </div>

      <div className="progress-bar mb-4">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {waterLogs.length > 0 && (
        <div className="space-y-2 mb-4">
          {waterLogs.slice(0, 3).map((log) => (
            <div 
              key={log.id} 
              className="flex items-center justify-between text-sm text-muted-foreground"
            >
              <span>{format(new Date(log.timestamp), 'h:mm a')}</span>
              <span>{(log.amount * 1000).toFixed(0)}ml</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleLogWater}
        disabled={isAdding}
        className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-lg text-sm font-medium active:opacity-70 transition-opacity"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        Add 250ml
      </button>
    </div>
  );
}