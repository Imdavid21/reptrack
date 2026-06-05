import { useState, useMemo } from 'react';
import { Footprints, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCalorieBurn } from '@/hooks/useCalorieBurn';
import { toast } from '@/lib/toast';

const WALKING_MET = 3.5;
const PACE_MIN_PER_KM = 12; // ~5 km/h

/** kcal = MET * weight(kg) * hours */
export function walkingCalories(km: number, weightKg: number) {
  const hours = (km * PACE_MIN_PER_KM) / 60;
  return Math.round(WALKING_MET * weightKg * hours);
}

export function ActivityLogger() {
  const { weightKg, addBurn } = useCalorieBurn();
  const [open, setOpen] = useState(false);
  const [km, setKm] = useState('');
  const [saving, setSaving] = useState(false);

  const distance = parseFloat(km) || 0;
  const kcal = useMemo(() => walkingCalories(distance, weightKg), [distance, weightKg]);
  const duration = Math.round(distance * PACE_MIN_PER_KM);

  const handleSave = async () => {
    if (distance <= 0) return;
    setSaving(true);
    try {
      await addBurn.mutateAsync({
        source: 'manual',
        activity_type: 'walking',
        duration_minutes: duration,
        calories: kcal,
      });
      toast.success(`Logged ${distance} km walk · ${kcal} kcal`);
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
        <Footprints className="w-4 h-4" />
        Log Walk
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Footprints className="w-5 h-5" />
              Log Walking
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
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
                {[2, 3, 4, 5, 7].map(v => (
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
              Based on {weightKg.toFixed(1)} kg · ~5 km/h pace · MET 3.5
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
