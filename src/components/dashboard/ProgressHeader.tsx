import { useState, useEffect } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { Progress } from '@/components/ui/progress';
import { Calendar, Moon, Scale, Loader2, Check, Plus, Minus } from 'lucide-react';
import { startOfWeek, format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';

export function ProgressHeader() {
  const { workouts } = useWorkouts();
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showSleepDialog, setShowSleepDialog] = useState(false);
  const [weight, setWeight] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<string>('');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Get last 30 days of metrics to find last logged weight and sleep
  const { data: metricsData, upsertMetrics, isUpserting, isLoading } = useDailyMetrics({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const totalSessions = workouts.length;
  const targetSessions = 72; // 12 weeks × 6 days
  const progressPercent = Math.min((totalSessions / targetSessions) * 100, 100);
  const currentWeek = Math.ceil(totalSessions / 6) || 1;
  
  // Count sessions this calendar week (Mon-Sun)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const sessionsThisWeek = workouts.filter(w => w.date >= weekStartStr).length;

  // Get last logged weight (most recent non-null bodyweight)
  const lastLoggedWeight = metricsData?.dataPoints
    .filter(d => d.bodyweight !== null && d.bodyweight > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.bodyweight;
  
  // Get today's weight if already logged
  const todayWeight = metricsData?.dataPoints.find(d => d.date === todayStr)?.bodyweight;

  // Get last logged sleep (most recent non-null sleep_hours)
  const lastLoggedSleep = metricsData?.dataPoints
    .filter(d => d.sleep_hours !== null && d.sleep_hours > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.sleep_hours;
  
  // Get today's sleep if already logged
  const todaySleep = metricsData?.dataPoints.find(d => d.date === todayStr)?.sleep_hours;

  // Pre-fill weight with last logged or today's value
  useEffect(() => {
    if (showWeightDialog) {
      const prefill = todayWeight ?? lastLoggedWeight ?? '';
      setWeight(prefill ? String(prefill) : '');
    }
  }, [showWeightDialog, todayWeight, lastLoggedWeight]);

  // Pre-fill sleep with today's value or default
  useEffect(() => {
    if (showSleepDialog) {
      const prefill = todaySleep ?? '';
      setSleepHours(prefill ? String(prefill) : '7');
    }
  }, [showSleepDialog, todaySleep]);

  const handleSaveWeight = async () => {
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight <= 0) {
      toast.error('Enter a valid weight');
      return;
    }
    
    try {
      await upsertMetrics({
        date: todayStr,
        bodyweight: numWeight,
      });
      toast.success(`${numWeight} kg logged`);
      setShowWeightDialog(false);
    } catch (error) {
      toast.error('Failed to log weight');
    }
  };

  const handleSaveSleep = async () => {
    const numSleep = parseFloat(sleepHours);
    if (isNaN(numSleep) || numSleep < 0 || numSleep > 24) {
      toast.error('Enter valid sleep hours (0-24)');
      return;
    }
    
    try {
      await upsertMetrics({
        date: todayStr,
        sleep_hours: numSleep,
      });
      toast.success(`${numSleep}h sleep logged`);
      setShowSleepDialog(false);
    } catch (error) {
      toast.error('Failed to log sleep');
    }
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || lastLoggedWeight || 70;
    setWeight((current + delta).toFixed(1));
  };

  const adjustSleep = (delta: number) => {
    const current = parseFloat(sleepHours) || 7;
    const newVal = Math.max(0, Math.min(24, current + delta));
    setSleepHours(newVal.toFixed(1));
  };

  return (
    <>
      <div className="card-brutalist">
        {/* Main progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">12-WEEK PROGRAM</span>
            <span className="text-xs font-mono">
              {totalSessions}/{targetSessions} SESSIONS
            </span>
          </div>
          
          <Progress value={progressPercent} className="h-3" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">WEEK {currentWeek}</span>
            <span className="text-muted-foreground">{Math.round(progressPercent)}% COMPLETE</span>
          </div>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
            </div>
            <div className="text-xl font-bold tabular-nums">{sessionsThisWeek}/6</div>
            <div className="text-[10px] text-muted-foreground uppercase">THIS WEEK</div>
          </div>
          
          {/* Sleep Stat - Tappable */}
          <button 
            onClick={() => setShowSleepDialog(true)}
            className="text-center hover:bg-muted/50 transition-colors -m-2 p-2 rounded relative border-x border-border"
          >
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Moon className="h-3 w-3" />
              {/* Subtle dot indicator if not logged today */}
              {!todaySleep && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
              )}
            </div>
            <div className="text-xl font-bold tabular-nums">
              {isLoading ? '...' : (todaySleep ? `${todaySleep}h` : (lastLoggedSleep ? `${lastLoggedSleep}h` : '—'))}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">
              {!todaySleep ? 'TAP TO LOG' : 'SLEEP'}
            </div>
          </button>
          
          <button 
            onClick={() => setShowWeightDialog(true)}
            className="text-center hover:bg-muted/50 transition-colors -m-2 p-2 rounded relative"
          >
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Scale className="h-3 w-3" />
              {/* Subtle dot indicator if not logged today */}
              {!todayWeight && lastLoggedWeight && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
              )}
            </div>
            <div className="text-xl font-bold tabular-nums">
              {isLoading ? '...' : (lastLoggedWeight ?? '—')}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">
              {!todayWeight && lastLoggedWeight ? 'TAP TO LOG' : 'KG'}
            </div>
          </button>
        </div>
      </div>

      {/* Sleep Dialog */}
      <Dialog open={showSleepDialog} onOpenChange={setShowSleepDialog}>
        <DialogContent className="border-border bg-background max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              LOG SLEEP
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sleep input with +/- buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => adjustSleep(-0.5)}
                className="p-3 border border-border hover:bg-muted transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              
              <div className="flex-1 text-center">
                <Input
                  type="number"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="7"
                  className="text-center text-2xl font-bold h-14 input-terminal"
                />
                <span className="text-xs text-muted-foreground">hours</span>
              </div>
              
              <button
                onClick={() => adjustSleep(0.5)}
                className="p-3 border border-border hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Today hint */}
            {todaySleep && (
              <p className="text-xs text-muted-foreground text-center">
                Today: {todaySleep}h (updating)
              </p>
            )}

            <button
              onClick={handleSaveSleep}
              disabled={isUpserting || !sleepHours}
              className="btn-brutalist w-full flex items-center justify-center gap-2"
            >
              {isUpserting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              SAVE
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weight Dialog */}
      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent className="border-border bg-background max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              LOG WEIGHT
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Weight input with +/- buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => adjustWeight(-0.1)}
                className="p-3 border border-border hover:bg-muted transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              
              <div className="flex-1 text-center">
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={lastLoggedWeight ? String(lastLoggedWeight) : '70.0'}
                  className="text-center text-2xl font-bold h-14 input-terminal"
                />
                <span className="text-xs text-muted-foreground">kg</span>
              </div>
              
              <button
                onClick={() => adjustWeight(0.1)}
                className="p-3 border border-border hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Last logged hint */}
            {lastLoggedWeight && !todayWeight && (
              <p className="text-xs text-muted-foreground text-center">
                Last: {lastLoggedWeight} kg
              </p>
            )}
            
            {todayWeight && (
              <p className="text-xs text-muted-foreground text-center">
                Today: {todayWeight} kg (updating)
              </p>
            )}

            <button
              onClick={handleSaveWeight}
              disabled={isUpserting || !weight}
              className="btn-brutalist w-full flex items-center justify-center gap-2"
            >
              {isUpserting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              SAVE
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}