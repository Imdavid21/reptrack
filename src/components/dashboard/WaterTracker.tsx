import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Droplets, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

const DAILY_GOAL = 3.5;
const MILESTONES = [0.5, 1];

export function WaterTracker() {
  const { waterLogs, totalToday, addWaterLog, isAdding } = useWaterLogs();
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTotalRef = useRef(totalToday);

  const progressPercent = Math.min((totalToday / DAILY_GOAL) * 100, 100);
  const progressRatio = totalToday / DAILY_GOAL;

  // Subtle haptic on milestone
  useEffect(() => {
    const prevRatio = prevTotalRef.current / DAILY_GOAL;
    
    for (const milestone of MILESTONES) {
      if (prevRatio < milestone && progressRatio >= milestone) {
        haptic('light');
        break;
      }
    }
    
    prevTotalRef.current = totalToday;
  }, [totalToday, progressRatio]);

  const handleLogWater = async () => {
    try {
      setIsAnimating(true);
      haptic('light');
      
      await addWaterLog(0.25);
      toast.success('+250ml');
      
      setTimeout(() => setIsAnimating(false), 150);
    } catch (error) {
      setIsAnimating(false);
      toast.error('Failed to log water');
    }
  };

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
          className="progress-bar-fill transition-all duration-300"
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
              <span className="text-xs text-muted-foreground uppercase">
                {log.method === 'automation' ? 'auto' : 'manual'}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleLogWater}
        disabled={isAdding}
        className={cn(
          "btn-brutalist w-full mt-4 flex items-center justify-center gap-2 transition-opacity",
          isAnimating && "opacity-70"
        )}
      >
        <Plus className="h-4 w-4" />
        LOG 250ML
      </button>
    </div>
  );
}
