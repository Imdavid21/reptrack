import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Droplets, Plus, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DAILY_GOAL = 3.5;
const MILESTONES = [0.5, 1];

const WATER_SIZES = [
  { label: '250ml', value: 0.25 },
  { label: '330ml', value: 0.33 },
  { label: '500ml', value: 0.5 },
  { label: '750ml', value: 0.75 },
  { label: '1L', value: 1.0 },
];

export function WaterTracker() {
  const { waterLogs, totalToday, addWaterLog, isAdding } = useWaterLogs();
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedSize, setSelectedSize] = useState(WATER_SIZES[0]);
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

  const handleLogWater = async (amount?: number) => {
    const logAmount = amount || selectedSize.value;
    try {
      setIsAnimating(true);
      haptic('light');
      
      await addWaterLog(logAmount);
      toast.success(`+${Math.round(logAmount * 1000)}ml`);
      
      setTimeout(() => setIsAnimating(false), 150);
    } catch (error) {
      setIsAnimating(false);
      toast.error('Failed to log water');
    }
  };

  return (
    <div className="card-brutalist h-full flex flex-col">
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

      <div className="flex gap-2 mt-auto pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="border border-border px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors">
            <span className="text-sm font-medium">{selectedSize.label}</span>
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-background border-border">
            {WATER_SIZES.map((size) => (
              <DropdownMenuItem
                key={size.label}
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "cursor-pointer",
                  selectedSize.value === size.value && "bg-primary/10"
                )}
              >
                {size.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <button
          onClick={() => handleLogWater()}
          disabled={isAdding}
          className={cn(
            "btn-brutalist flex-1 flex items-center justify-center gap-2 transition-opacity",
            isAnimating && "opacity-70"
          )}
        >
          <Plus className="h-4 w-4" />
          LOG {selectedSize.label.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
