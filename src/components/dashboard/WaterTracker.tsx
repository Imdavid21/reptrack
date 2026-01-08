import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Droplets, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const DAILY_GOAL = 3.5;

export function WaterTracker() {
  const { waterLogs, totalToday, addWaterLog, isAdding } = useWaterLogs();

  const handleLogWater = async () => {
    try {
      await addWaterLog(0.25);
      toast.success('Water logged: 250ml');
    } catch (error) {
      toast.error('Failed to log water');
    }
  };

  const progressPercent = Math.min((totalToday / DAILY_GOAL) * 100, 100);

  return (
    <div className="card-brutalist">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">TODAY'S WATER</h3>
        <Droplets className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="text-4xl font-bold tabular-nums">
        {totalToday.toFixed(2)}L
        <span className="text-lg text-muted-foreground"> / {DAILY_GOAL}L</span>
      </div>

      <div className="progress-bar mt-4">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {waterLogs.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs text-muted-foreground">RECENT</h4>
          {waterLogs.slice(0, 3).map((log) => (
            <div key={log.id} className="flex justify-between text-sm">
              <span>{format(new Date(log.timestamp), 'HH:mm')}</span>
              <span>{log.amount}L</span>
              <span className="text-muted-foreground">
                {log.method === 'automation' ? '📞' : '✍️'}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleLogWater}
        disabled={isAdding}
        className="btn-brutalist w-full mt-4 flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        LOG 250ML
      </button>
    </div>
  );
}
