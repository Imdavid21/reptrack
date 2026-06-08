import { useState, useMemo } from 'react';
import { Footprints, Bike, PersonStanding, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCalorieBurn } from '@/hooks/useCalorieBurn';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export type ActivityKind = 'walking' | 'running' | 'cycling';

export const ACTIVITY_CONFIG: Record<ActivityKind, {
  label: string;
  met: number;
  paceMinPerKm: number; // average pace
  icon: typeof Footprints;
  quickKm: number[];
  paceLabel: string;
}> = {
  walking: { label: 'Walk',    met: 3.5, paceMinPerKm: 12, icon: Footprints,      quickKm: [2, 3, 4, 5, 7],   paceLabel: '~5 km/h' },
  running: { label: 'Run',     met: 9.8, paceMinPerKm: 6,  icon: PersonStanding,  quickKm: [3, 5, 8, 10, 15], paceLabel: '~10 km/h' },
  cycling: { label: 'Cycling', met: 7.5, paceMinPerKm: 3,  icon: Bike,            quickKm: [5, 10, 20, 30, 50], paceLabel: '~20 km/h' },
};

/** kcal = MET * weight(kg) * hours */
export function activityCalories(kind: ActivityKind, km: number, weightKg: number) {
  const cfg = ACTIVITY_CONFIG[kind];
  const hours = (km * cfg.paceMinPerKm) / 60;
  return Math.round(cfg.met * weightKg * hours);
}

export function activityDuration(kind: ActivityKind, km: number) {
  return Math.round(km * ACTIVITY_CONFIG[kind].paceMinPerKm);
}

// Backwards compat export
export const walkingCalories = (km: number, weightKg: number) => activityCalories('walking', km, weightKg);

export function ActivityLogger() {
  const { weightKg, addBurn } = useCalorieBurn();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ActivityKind>('walking');
  const [km, setKm] = useState('');
  const [saving, setSaving] = useState(false);

  const cfg = ACTIVITY_CONFIG[kind];
  const distance = parseFloat(km) || 0;
  const kcal = useMemo(() => activityCalories(kind, distance, weightKg), [kind, distance, weightKg]);
  const duration = activityDuration(kind, distance);

  const handleSave = async () => {
    if (distance <= 0) return;
    setSaving(true);
    try {
      await addBurn.mutateAsync({
        source: 'manual',
        activity_type: kind,
        duration_minutes: duration,
        calories: kcal,
      });
      toast.success(`Logged ${distance} km ${cfg.label.toLowerCase()} · ${kcal} kcal`);
      setKm('');
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
        Log Activity
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <cfg.icon className="w-5 h-5" />
              Log {cfg.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Activity type selector */}
            <div className="grid grid-cols-3 gap-2">
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
              <Label htmlFor="km">Distance (km)</Label>
              <Input
                id="km"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="4.0"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                autoFocus
                className="h-12 text-lg"
              />
              <div className="flex gap-2">
                {cfg.quickKm.map(v => (
                  <button
                    key={v}
                    onClick={() => setKm(String(v))}
                    className="flex-1 py-2 rounded-lg bg-muted text-sm hover:bg-muted/70 transition-colors"
                  >
                    {v}km
                  </button>
                ))}
              </div>
            </div>

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
                disabled={distance <= 0 || saving}
                className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add Burn'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
