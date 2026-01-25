import { useState } from 'react';
import { useRecoveryMetrics, useDeloadWeeks, shouldRecommendDeload } from '@/hooks/useRecoveryMetrics';
import { Battery, BatteryLow, BatteryWarning, AlertTriangle, Check, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, addDays, startOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function RecoveryCard() {
  const { 
    todayMetrics, 
    avgRecovery, 
    avgFatigue, 
    metrics: recentMetrics,
    upsertMetrics, 
    isSaving 
  } = useRecoveryMetrics();
  
  const { weeksSinceLastDeload, createDeload, isCreating } = useDeloadWeeks();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    sleep_quality: todayMetrics?.sleep_quality || 7,
    muscle_soreness: todayMetrics?.muscle_soreness || 3,
    fatigue_level: todayMetrics?.fatigue_level || 4,
    stress_level: todayMetrics?.stress_level || 4,
    resting_hr: todayMetrics?.resting_hr?.toString() || '',
    hrv_ms: todayMetrics?.hrv_ms?.toString() || '',
  });

  // Check if deload is recommended
  const deloadCheck = shouldRecommendDeload(recentMetrics, weeksSinceLastDeload);

  const handleSave = async () => {
    try {
      await upsertMetrics({
        date: format(new Date(), 'yyyy-MM-dd'),
        sleep_quality: form.sleep_quality,
        muscle_soreness: form.muscle_soreness,
        fatigue_level: form.fatigue_level,
        stress_level: form.stress_level,
        resting_hr: form.resting_hr ? parseInt(form.resting_hr) : null,
        hrv_ms: form.hrv_ms ? parseInt(form.hrv_ms) : null,
      });
      toast.success('Recovery logged');
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleScheduleDeload = async () => {
    const weekStart = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    
    try {
      await createDeload({
        week_start: format(weekStart, 'yyyy-MM-dd'),
        week_end: format(weekEnd, 'yyyy-MM-dd'),
        trigger_reason: deloadCheck.recommend ? 'ai_recommended' : 'manual',
        volume_reduction_percent: 40,
        intensity_reduction_percent: 20,
        fatigue_indicators: {
          avgRecovery,
          avgFatigue,
          weeksSinceLastDeload,
          reason: deloadCheck.reason,
        },
        completed: false,
        notes: null,
      });
      toast.success('Deload week scheduled');
    } catch (error) {
      toast.error('Failed to schedule deload');
    }
  };

  const recoveryScore = todayMetrics?.recovery_score || avgRecovery || 50;
  
  // Determine battery icon based on recovery
  const BatteryIcon = recoveryScore >= 70 ? Battery : 
                      recoveryScore >= 40 ? BatteryWarning : BatteryLow;
  
  const batteryColor = recoveryScore >= 70 ? 'text-green-500' : 
                       recoveryScore >= 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <>
      <div className="card-brutalist">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-header mb-0">RECOVERY STATUS</h3>
          <div className={cn("flex items-center gap-1", batteryColor)}>
            <BatteryIcon className="h-5 w-5" />
            <span className="text-lg font-bold tabular-nums">{recoveryScore}</span>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">
              {avgFatigue?.toFixed(1) || '-'}
            </div>
            <div className="text-xs text-muted-foreground">FATIGUE</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">
              {weeksSinceLastDeload}
            </div>
            <div className="text-xs text-muted-foreground">WEEKS</div>
          </div>
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              recoveryScore >= 70 && "text-green-500",
              recoveryScore < 40 && "text-red-500",
            )}>
              {recoveryScore >= 70 ? <TrendingUp className="h-6 w-6 mx-auto" /> : 
               recoveryScore < 40 ? <TrendingDown className="h-6 w-6 mx-auto" /> : 
               <span>—</span>}
            </div>
            <div className="text-xs text-muted-foreground">TREND</div>
          </div>
        </div>

        {/* Deload recommendation */}
        {deloadCheck.recommend && (
          <div className="border border-yellow-500/50 bg-yellow-500/10 p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-500">Deload Recommended</p>
                <p className="text-xs text-muted-foreground mt-1">{deloadCheck.reason}</p>
                <button
                  onClick={handleScheduleDeload}
                  disabled={isCreating}
                  className="btn-brutalist text-xs py-1 px-3 mt-2"
                >
                  {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Schedule Next Week'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Log recovery button */}
        <button
          onClick={() => setDialogOpen(true)}
          className="btn-brutalist w-full text-sm"
        >
          {todayMetrics ? 'UPDATE RECOVERY' : 'LOG RECOVERY'}
        </button>
      </div>

      {/* Recovery Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-background max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">LOG RECOVERY</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Sleep Quality */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">SLEEP QUALITY</Label>
                <span className="text-sm font-medium tabular-nums">{form.sleep_quality}/10</span>
              </div>
              <Slider
                value={[form.sleep_quality]}
                onValueChange={([v]) => setForm(prev => ({ ...prev, sleep_quality: v }))}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Muscle Soreness */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">MUSCLE SORENESS (1=none, 10=severe)</Label>
                <span className="text-sm font-medium tabular-nums">{form.muscle_soreness}/10</span>
              </div>
              <Slider
                value={[form.muscle_soreness]}
                onValueChange={([v]) => setForm(prev => ({ ...prev, muscle_soreness: v }))}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Fatigue Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">FATIGUE (1=fresh, 10=exhausted)</Label>
                <span className="text-sm font-medium tabular-nums">{form.fatigue_level}/10</span>
              </div>
              <Slider
                value={[form.fatigue_level]}
                onValueChange={([v]) => setForm(prev => ({ ...prev, fatigue_level: v }))}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Stress Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">STRESS LEVEL</Label>
                <span className="text-sm font-medium tabular-nums">{form.stress_level}/10</span>
              </div>
              <Slider
                value={[form.stress_level]}
                onValueChange={([v]) => setForm(prev => ({ ...prev, stress_level: v }))}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Optional: HRV and Resting HR */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">RESTING HR (optional)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={form.resting_hr}
                  onChange={(e) => setForm(prev => ({ ...prev, resting_hr: e.target.value }))}
                  className="input-terminal mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">HRV (optional)</Label>
                <Input
                  type="number"
                  placeholder="45"
                  value={form.hrv_ms}
                  onChange={(e) => setForm(prev => ({ ...prev, hrv_ms: e.target.value }))}
                  className="input-terminal mt-1"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-brutalist w-full flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              SAVE
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
