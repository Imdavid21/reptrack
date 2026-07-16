import { useState, useMemo, useEffect } from 'react';
import { Footprints, Bike, PersonStanding, Activity, Swords } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCalorieBurn, useManualBurns } from '@/hooks/useCalorieBurn';
import { useLogDate } from '@/contexts/LogDateContext';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type ActivityKind = 'walking' | 'running' | 'cycling' | 'boxing';

export const ACTIVITY_CONFIG: Record<ActivityKind, {
  label: string;
  met: number;
  paceMinPerKm: number; // minutes per unit (km or minute)
  icon: typeof Footprints;
  quickKm: number[];
  paceLabel: string;
  unit: 'km' | 'min';
}> = {
  walking: { label: 'Walk',    met: 3.5, paceMinPerKm: 12, icon: Footprints,      quickKm: [2, 3, 4, 5, 7],   paceLabel: '~5 km/h', unit: 'km' },
  running: { label: 'Run',     met: 9.8, paceMinPerKm: 6,  icon: PersonStanding,  quickKm: [3, 5, 8, 10, 15], paceLabel: '~10 km/h', unit: 'km' },
  cycling: { label: 'Cycling', met: 7.5, paceMinPerKm: 3,  icon: Bike,            quickKm: [5, 10, 20, 30, 50], paceLabel: '~20 km/h', unit: 'km' },
  boxing:  { label: 'Boxing',  met: 9.0, paceMinPerKm: 1,  icon: Swords,          quickKm: [15, 30, 45, 60, 90], paceLabel: 'training rounds', unit: 'min' },
};

/**
 * kcal = MET * weight(kg) * hours
 * For km-based activities, `minutesOverride` (if > 0) replaces the default pace-derived duration.
 */
export function activityCalories(
  kind: ActivityKind,
  value: number,
  weightKg: number,
  minutesOverride?: number,
) {
  const cfg = ACTIVITY_CONFIG[kind];
  const minutes = activityDuration(kind, value, minutesOverride);
  return Math.round(cfg.met * weightKg * (minutes / 60));
}

export function activityDuration(kind: ActivityKind, value: number, minutesOverride?: number) {
  const cfg = ACTIVITY_CONFIG[kind];
  if (cfg.unit === 'min') return Math.round(value);
  if (minutesOverride && minutesOverride > 0) return Math.round(minutesOverride);
  return Math.round(value * cfg.paceMinPerKm);
}

// Backwards compat export
export const walkingCalories = (km: number, weightKg: number) => activityCalories('walking', km, weightKg);

export function ActivityLogger() {
  const { weightKg, addBurn } = useCalorieBurn();
  const { data: manualBurns = [] } = useManualBurns(180);
  const { logDate, isBackDated } = useLogDate();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ActivityKind>('walking');
  const [value, setValue] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const cfg = ACTIVITY_CONFIG[kind];
  const numericValue = parseFloat(value) || 0;
  const numericMinutes = parseFloat(minutes) || 0;
  const kcal = useMemo(
    () => activityCalories(kind, numericValue, weightKg, numericMinutes),
    [kind, numericValue, numericMinutes, weightKg],
  );
  const duration = activityDuration(kind, numericValue, numericMinutes);
  const usingCustomTime = cfg.unit === 'km' && numericMinutes > 0;

  // Existing activity of this type already logged on the selected date.
  const logDateStr = format(logDate, 'yyyy-MM-dd');
  const existing = useMemo(
    () => manualBurns.find(b => b.date === logDateStr && b.activity_type === kind),
    [manualBurns, logDateStr, kind],
  );

  // When opening or changing date/type, preload any existing entry so the user
  // updates it instead of unknowingly overwriting it (addBurn upserts per day+type).
  useEffect(() => {
    if (!open) return;
    if (existing?.duration_minutes) {
      if (cfg.unit === 'min') {
        setValue(String(existing.duration_minutes));
        setMinutes('');
      } else {
        // Best-effort: derive km from default pace, expose minutes as override.
        const km = existing.duration_minutes / ACTIVITY_CONFIG[kind].paceMinPerKm;
        setValue(km.toFixed(1));
        setMinutes(String(existing.duration_minutes));
      }
    } else {
      setValue('');
      setMinutes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, logDateStr, kind]);

  const handleSave = async () => {
    if (numericValue <= 0) return;
    setSaving(true);
    try {
      await addBurn.mutateAsync({
        source: 'manual',
        activity_type: kind,
        duration_minutes: duration,
        calories: kcal,
        ...(isBackDated ? { date: logDateStr } : {}),
      });
      const when = isBackDated ? ` on ${format(logDate, 'MMM d')}` : '';
      const verb = existing ? 'Updated' : 'Logged';
      const unitLabel = cfg.unit === 'min' ? 'min' : 'km';
      toast.success(`${verb} ${Math.round(numericValue)} ${unitLabel} ${cfg.label.toLowerCase()} · ${kcal} kcal${when}`);
      setValue('');
      setMinutes('');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to log activity');
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-border hover:border-foreground/30 transition-colors text-sm font-medium"
      >
        <Activity className="w-4 h-4" />
        Log Activity{isBackDated ? ` · ${format(logDate, 'MMM d')}` : ''}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <cfg.icon className="w-5 h-5" />
              Log {cfg.label}{isBackDated ? ` · ${format(logDate, 'MMM d')}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Activity type selector */}
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(ACTIVITY_CONFIG) as ActivityKind[]).map(k => {
                const c = ACTIVITY_CONFIG[k];
                const Icon = c.icon;
                const active = k === kind;
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors',
                      active
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-semibold">{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-value">
                {cfg.unit === 'min' ? 'Duration (min)' : 'Distance (km)'}
              </Label>
              <Input
                id="activity-value"
                type="number"
                inputMode="decimal"
                step={cfg.unit === 'min' ? '1' : '0.1'}
                placeholder={cfg.unit === 'min' ? '30' : '4.0'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                className="h-12 text-lg"
              />
              <div className="flex gap-2">
                {cfg.quickKm.map(v => (
                  <button
                    key={v}
                    onClick={() => setValue(String(v))}
                    className="flex-1 py-2 rounded-lg bg-muted text-sm hover:bg-muted/70 transition-colors"
                  >
                    {v}{cfg.unit === 'min' ? 'm' : 'km'}
                  </button>
                ))}
              </div>
            </div>

            {cfg.unit === 'km' && (
              <div className="space-y-2">
                <Label htmlFor="activity-minutes" className="flex items-center justify-between">
                  <span>Time (min) <span className="text-muted-foreground font-normal">— optional</span></span>
                  {usingCustomTime && (
                    <span className="text-[10px] text-muted-foreground">using your time</span>
                  )}
                </Label>
                <Input
                  id="activity-minutes"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  placeholder={`default ${activityDuration(kind, numericValue || 1)} min for ${numericValue || 1} km`}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Burn</div>
                <div className="text-xl font-bold">{kcal} <span className="text-xs font-normal text-muted-foreground">kcal</span></div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration</div>
                <div className="text-xl font-bold">{duration} <span className="text-xs font-normal text-muted-foreground">min</span></div>
              </div>
            </div>

            {existing && (
              <p className="text-[11px] text-energy-ink bg-energy-soft rounded-lg px-2.5 py-1.5">
                Updating your {format(logDate, 'MMM d')} {cfg.label.toLowerCase()} — {existing.calories} kcal already logged.
              </p>
            )}


            <p className="text-[11px] text-muted-foreground">
              Based on {weightKg.toFixed(1)} kg · {cfg.paceLabel} pace · MET {cfg.met}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={numericValue <= 0 || saving}
                className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : existing ? 'Update' : 'Add Burn'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
