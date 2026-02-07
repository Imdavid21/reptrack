import { useState, useEffect, useMemo } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { SPLIT_TEMPLATES, TrainingSplit } from '@/lib/splitTemplates';
import { Progress } from '@/components/ui/progress';
import { Calendar, Moon, Scale, Loader2, Check, Plus, Minus } from 'lucide-react';
import { startOfWeek, format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';

export function ProgressHeader() {
  const { workouts } = useWorkouts();
  const { preferences } = useUserPreferences();
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showSleepDialog, setShowSleepDialog] = useState(false);
  const [weight, setWeight] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<string>('7');
  const [sleepMinutes, setSleepMinutes] = useState<string>('0');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Get last 30 days of metrics to find last logged weight and sleep
  const { data: metricsData, upsertMetrics, isUpserting, isLoading } = useDailyMetrics({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Dynamic program stats based on current split
  const { daysPerWeek, totalSessions, currentWeek, progressPercent } = useMemo(() => {
    const split = (preferences?.training_split as TrainingSplit) || 'ppl6';
    const template = SPLIT_TEMPLATES[split];
    const dpw = template?.daysPerWeek ?? 6;
    const total = dpw * 12; // 12-week program
    const sessions = workouts.length;
    const week = Math.min(Math.ceil(sessions / dpw) || 1, 12);
    const percent = Math.min((sessions / total) * 100, 100);
    return { daysPerWeek: dpw, totalSessions: total, currentWeek: week, progressPercent: percent };
  }, [workouts.length, preferences?.training_split]);
  
  // Count days with logged metrics this calendar week (Mon-Sun)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const daysLoggedThisWeek = metricsData?.dataPoints.filter(d => 
    d.date >= weekStartStr && 
    d.date <= todayStr &&
    ((d.bodyweight !== null && d.bodyweight > 0) || 
     (d.sleep_hours !== null && d.sleep_hours > 0))
  ).length ?? 0;

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
      const prefill = todaySleep ?? 7;
      const hours = Math.floor(prefill);
      const minutes = Math.round((prefill - hours) * 60);
      setSleepHours(String(hours));
      setSleepMinutes(String(minutes));
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
    const hours = parseInt(sleepHours) || 0;
    const minutes = parseInt(sleepMinutes) || 0;
    const totalHours = hours + (minutes / 60);
    
    if (totalHours < 0 || totalHours > 24) {
      toast.error('Enter valid sleep time (0-24h)');
      return;
    }
    
    try {
      await upsertMetrics({
        date: todayStr,
        sleep_hours: Math.round(totalHours * 100) / 100, // Round to 2 decimals
      });
      const displayTime = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      toast.success(`${displayTime} sleep logged`);
      setShowSleepDialog(false);
    } catch (error) {
      toast.error('Failed to log sleep');
    }
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || lastLoggedWeight || 70;
    setWeight((current + delta).toFixed(1));
  };

  const adjustSleepHours = (delta: number) => {
    const current = parseInt(sleepHours) || 0;
    const newVal = Math.max(0, Math.min(23, current + delta));
    setSleepHours(String(newVal));
  };

  const adjustSleepMinutes = (delta: number) => {
    const current = parseInt(sleepMinutes) || 0;
    let newVal = current + delta;
    if (newVal < 0) newVal = 45;
    if (newVal >= 60) newVal = 0;
    setSleepMinutes(String(newVal));
  };

  return (
    <>
      <div className="card-brutalist">
        {/* Main progress */}
        <div className="space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-xs text-muted-foreground uppercase tracking-wider">12-WEEK PROGRAM</span>
             <span className="text-xs font-mono">
               {workouts.length}/{totalSessions} SESSIONS
             </span>
           </div>
          
          <Progress value={progressPercent} className="h-3" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">WEEK {currentWeek}</span>
            <span className="text-muted-foreground">{Math.round(progressPercent)}% COMPLETE</span>
          </div>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-3 gap-0 mt-4 pt-4 border-t border-border">
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
            </div>
            <div className="text-xl font-bold tabular-nums">{daysLoggedThisWeek}/7</div>
            <div className="text-[10px] text-muted-foreground uppercase mt-1">DAYS LOGGED</div>
          </div>
          
          {/* Sleep Stat - Tappable */}
          <button 
            onClick={() => setShowSleepDialog(true)}
            className="text-center hover:bg-muted/50 transition-colors py-2 rounded-xl relative border-x border-border"
          >
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Moon className="h-3 w-3" />
              {/* Subtle dot indicator if not logged today */}
              {!todaySleep && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
              )}
            </div>
            <div className="text-xl font-bold tabular-nums">
              {isLoading ? '...' : (
                (todaySleep ?? lastLoggedSleep) 
                  ? `${(todaySleep ?? lastLoggedSleep)?.toFixed(1)}h`
                  : '—'
              )}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase mt-1">
              {!todaySleep ? 'TAP TO ADD' : 'SLEEP'}
            </div>
          </button>
          
          <button 
            onClick={() => setShowWeightDialog(true)}
            className="text-center hover:bg-muted/50 transition-colors py-2 rounded-xl relative"
          >
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Scale className="h-3 w-3" />
              {/* Subtle dot indicator if not logged today */}
              {!todayWeight && lastLoggedWeight && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
              )}
            </div>
            <div className="text-xl font-bold tabular-nums">
              {isLoading ? '...' : (
                (todayWeight ?? lastLoggedWeight) 
                  ? (todayWeight ?? lastLoggedWeight)?.toFixed(1)
                  : '—'
              )}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase mt-1">
              {!todayWeight && lastLoggedWeight ? 'TAP TO ADD' : 'KG'}
            </div>
          </button>
        </div>
      </div>

      {/* Sleep Dialog */}
      <Dialog open={showSleepDialog} onOpenChange={setShowSleepDialog}>
        <DialogContent className="border-border bg-background max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              ADD SLEEP
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Hours and Minutes side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Hours */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground block text-center">HOURS</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustSleepHours(-1)}
                    className="p-2 border border-border hover:bg-muted transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    className="text-center text-xl font-bold h-12 input-terminal"
                  />
                  <button
                    onClick={() => adjustSleepHours(1)}
                    className="p-2 border border-border hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              {/* Minutes */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground block text-center">MINUTES</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustSleepMinutes(-15)}
                    className="p-2 border border-border hover:bg-muted transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={sleepMinutes}
                    onChange={(e) => setSleepMinutes(e.target.value)}
                    className="text-center text-xl font-bold h-12 input-terminal"
                  />
                  <button
                    onClick={() => adjustSleepMinutes(15)}
                    className="p-2 border border-border hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Today hint */}
            {todaySleep && (
              <p className="text-xs text-muted-foreground text-center">
                Today: {Math.floor(todaySleep)}h {Math.round((todaySleep % 1) * 60)}m (updating)
              </p>
            )}

            <button
              onClick={handleSaveSleep}
              disabled={isUpserting}
              className="btn-brutalist w-full flex items-center justify-center gap-2"
            >
              {isUpserting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              SAVE SLEEP
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weight Dialog */}
      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent className="border-border bg-background max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              ADD WEIGHT
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
              SAVE WEIGHT
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}