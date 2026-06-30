import { useWaterLogs } from '@/hooks/useWaterLogs';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Plus, ChevronDown, Pencil, Check } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { LogDateChip } from '@/components/common/LogDateChip';
import { toast } from '@/lib/toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MILESTONES = [0.5, 1];

const WATER_SIZES = [
  { label: '250ml', value: 0.25 },
  { label: '500ml', value: 0.5 },
  { label: '750ml', value: 0.75 },
  { label: '1L', value: 1.0 },
];

export function WaterTracker() {
  const [logDate, setLogDate] = useState<Date>(new Date());
  const viewingToday = isToday(logDate);
  // Show (and add to) the selected day's logs — today by default, or a
  // back-dated day so its existing entries are visible and can be added to.
  const { waterLogs, totalToday, addWaterLog, isAdding } = useWaterLogs(viewingToday ? undefined : logDate);
  const { preferences, updatePreferences } = useUserPreferences();
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedSize, setSelectedSize] = useState(WATER_SIZES[0]);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoal, setEditGoal] = useState(3);
  const prevTotalRef = useRef(totalToday);

  const dailyGoal = preferences?.daily_water_goal ?? 3;

  // Sync edit slider when opening
  useEffect(() => {
    if (isEditingGoal) setEditGoal(dailyGoal);
  }, [isEditingGoal, dailyGoal]);

  const progressPercent = Math.min((totalToday / dailyGoal) * 100, 100);
  const progressRatio = totalToday / dailyGoal;

  // Subtle haptic on milestone
  useEffect(() => {
    const prevRatio = prevTotalRef.current / dailyGoal;
    
    for (const milestone of MILESTONES) {
      if (prevRatio < milestone && progressRatio >= milestone) {
        haptic('light');
        break;
      }
    }
    
    prevTotalRef.current = totalToday;
  }, [totalToday, progressRatio, dailyGoal]);

  const handleLogWater = async (amount?: number) => {
    const logAmount = amount || selectedSize.value;
    const backDated = !isToday(logDate);
    try {
      setIsAnimating(true);
      haptic('light');

      await addWaterLog({ amount: logAmount, loggedAt: backDated ? logDate : undefined });
      toast.success(`+${Math.round(logAmount * 1000)}ml${backDated ? ` on ${format(logDate, 'MMM d')}` : ''}`);

      setTimeout(() => setIsAnimating(false), 150);
    } catch (error) {
      setIsAnimating(false);
      toast.error('Failed to log water');
    }
  };

  const handleSaveGoal = async () => {
    try {
      await updatePreferences.mutateAsync({ daily_water_goal: editGoal });
      setIsEditingGoal(false);
      toast.success('Water goal updated');
    } catch {
      toast.error('Failed to update goal');
    }
  };

  return (
    <div className="card-brutalist h-full flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="section-header mb-0">{viewingToday ? "TODAY'S WATER" : `${format(logDate, 'MMM d').toUpperCase()} WATER`}</h3>
          <button
            onClick={() => setIsEditingGoal(!isEditingGoal)}
            className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors rounded-lg"
            title="Edit goal"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
        <LogDateChip date={logDate} onChange={setLogDate} align="end" />
      </div>

      <div className="text-4xl font-bold tabular-nums">
        {totalToday.toFixed(2)}L
        <span className="text-lg text-muted-foreground ml-1">
          / {dailyGoal}L
        </span>
        {totalToday >= dailyGoal && (
          <span className="ml-2 text-sm font-bold text-primary animate-fade-in">✓ DONE</span>
        )}
      </div>

      {/* Inline goal editor */}
      {isEditingGoal && (
        <div className="mt-3 p-3 border border-border rounded-xl bg-muted/30 space-y-3 animate-fade-in">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Daily goal</span>
            <span className="font-bold">{editGoal}L</span>
          </div>
          <Slider
            value={[editGoal]}
            onValueChange={([v]) => setEditGoal(v)}
            min={1}
            max={5}
            step={0.5}
            className="w-full"
          />
          <button
            onClick={handleSaveGoal}
            className="w-full btn-brutalist flex items-center justify-center gap-2 py-2 text-sm"
          >
            <Check className="h-3 w-3" />
            SAVE
          </button>
        </div>
      )}

      <div className="progress-bar mt-4">
        <div
          className="progress-bar-fill bg-water transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {waterLogs.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs text-muted-foreground">RECENT</h4>
          {waterLogs.slice(0, 3).map((log) => (
            <div key={log.id} className="flex justify-between text-sm">
              <span className="tabular-nums text-muted-foreground">{format(new Date(log.timestamp), 'HH:mm')}</span>
              <span>{log.amount}L</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="border border-border px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-muted transition-colors">
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
          ADD {selectedSize.label.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
