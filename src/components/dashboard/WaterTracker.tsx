import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Droplets, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

const DAILY_GOAL = 3.5;
const MILESTONES = [0.25, 0.5, 0.75, 1];

export function WaterTracker() {
  const { waterLogs, totalToday, addWaterLog, isAdding } = useWaterLogs();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevTotalRef = useRef(totalToday);

  const progressPercent = Math.min((totalToday / DAILY_GOAL) * 100, 100);
  const progressRatio = totalToday / DAILY_GOAL;

  // Check for milestone celebrations
  useEffect(() => {
    const prevRatio = prevTotalRef.current / DAILY_GOAL;
    
    for (const milestone of MILESTONES) {
      if (prevRatio < milestone && progressRatio >= milestone) {
        haptic('success');
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 1500);
        break;
      }
    }
    
    prevTotalRef.current = totalToday;
  }, [totalToday, progressRatio]);

  const handleLogWater = async () => {
    try {
      setIsAnimating(true);
      haptic('medium');
      
      await addWaterLog(0.25);
      toast.success('Water logged: 250ml');
      
      setTimeout(() => setIsAnimating(false), 300);
    } catch (error) {
      setIsAnimating(false);
      toast.error('Failed to log water');
    }
  };

  return (
    <div className="card-brutalist relative overflow-hidden">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center animate-fade-in z-10 pointer-events-none">
          <div className="text-center">
            <div className="text-4xl mb-2">💧</div>
            <div className="text-sm font-bold text-primary">
              {Math.round(progressRatio * 100)}% Complete!
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">TODAY'S WATER</h3>
        <Droplets className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="text-4xl font-bold tabular-nums">
        {totalToday.toFixed(2)}L
        <span className="text-lg text-muted-foreground"> / {DAILY_GOAL}L</span>
      </div>

      <div className="progress-bar mt-4 relative">
        <div
          className="progress-bar-fill transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Milestone markers */}
        {MILESTONES.slice(0, -1).map(milestone => (
          <div
            key={milestone}
            className={cn(
              "absolute w-0.5 h-3 -top-0.5 transition-colors",
              progressRatio >= milestone ? "bg-primary-foreground/50" : "bg-muted-foreground/30"
            )}
            style={{ left: `${milestone * 100}%` }}
          />
        ))}
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
        className={cn(
          "btn-brutalist w-full mt-4 flex items-center justify-center gap-2 transition-all",
          isAnimating && "scale-95"
        )}
      >
        <Plus className={cn(
          "h-4 w-4 transition-transform",
          isAnimating && "rotate-90"
        )} />
        LOG 250ML
      </button>
    </div>
  );
}
