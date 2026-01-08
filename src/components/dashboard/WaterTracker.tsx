import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Droplets, Plus, Clock } from 'lucide-react';
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
    <div className="card-premium">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold">Hydration</h3>
            <p className="text-xs text-muted-foreground">Daily goal: {DAILY_GOAL}L</p>
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-display-md tabular-nums text-gradient">
          {totalToday.toFixed(1)}
        </span>
        <span className="text-lg text-muted-foreground font-medium">/ {DAILY_GOAL}L</span>
      </div>

      <div className="progress-bar mb-5">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {waterLogs.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="h-3 w-3" />
            <span>Recent logs</span>
          </div>
          {waterLogs.slice(0, 3).map((log) => (
            <div 
              key={log.id} 
              className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-secondary/50"
            >
              <span className="font-medium">{format(new Date(log.timestamp), 'h:mm a')}</span>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{(log.amount * 1000).toFixed(0)}ml</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {log.method === 'automation' ? 'Auto' : 'Manual'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleLogWater}
        disabled={isAdding}
        className="btn-premium btn-secondary w-full flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add 250ml
      </button>
    </div>
  );
}