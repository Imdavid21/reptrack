import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCalorieBurn, type BurnEntry } from '@/hooks/useCalorieBurn';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { parseDateKey } from '@/lib/dateKey';
import { Trash2 } from 'lucide-react';
import { ACTIVITY_CONFIG, activityCalories, activityDuration, effectiveMet, type ActivityKind } from './ActivityLogger';
import { ENERGY_MODEL_VERSION } from '@/lib/energyEngineV3';

interface Props {
  burn: BurnEntry | null;
  onClose: () => void;
  onSave: (input: {
    id: string;
    activity_type: string;
    duration_minutes: number;
    distance_km: number | null;
    calories: number;
    met_estimate: number;
    effective_weight_kg: number;
    confidence: 'medium';
    energy_model_version: number;
    calculation_inputs: Record<string, unknown>;
  }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

/**
 * Full edit for an already-logged manual activity — type, distance, and
 * time are all changeable, not just deletable. Recomputes calories the same
 * way ActivityLogger does, then updates the row directly by id (rather than
 * upserting on the day+type key, which would leave a stale row behind if
 * the type itself changes).
 */
export function EditActivityDialog({ burn, onClose, onSave, onDelete }: Props) {
  const { weightKg } = useCalorieBurn(burn ? parseDateKey(burn.date) : undefined);
  const [kind, setKind] = useState<ActivityKind>('walking');
  const [value, setValue] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!burn) return;
    const k = (ACTIVITY_CONFIG[burn.activity_type as ActivityKind] ? burn.activity_type : 'walking') as ActivityKind;
    const cfg = ACTIVITY_CONFIG[k];
    setKind(k);
    if (cfg.unit === 'min') {
      setValue(String(burn.duration_minutes ?? ''));
      setMinutes('');
    } else if (burn.distance_km != null) {
      setValue(String(burn.distance_km));
      setMinutes(String(burn.duration_minutes ?? ''));
    } else {
      // Pre-fix entry: distance was never stored, only the resulting
      // duration. Approximate it from the default pace.
      const km = (burn.duration_minutes ?? 0) / cfg.paceMinPerKm;
      setValue(km.toFixed(1));
      setMinutes(String(burn.duration_minutes ?? ''));
    }
  }, [burn]);

  const cfg = ACTIVITY_CONFIG[kind];
  const numericValue = parseFloat(value) || 0;
  const numericMinutes = parseFloat(minutes) || 0;
  const kcal = useMemo(
    () => activityCalories(kind, numericValue, weightKg, numericMinutes),
    [kind, numericValue, numericMinutes, weightKg],
  );
  const duration = activityDuration(kind, numericValue, numericMinutes);
  const met = useMemo(
    () => effectiveMet(kind, numericValue, duration),
    [kind, numericValue, duration],
  );
  const usingCustomTime = cfg.unit === 'km' && numericMinutes > 0;

  const handleSave = async () => {
    if (!burn || numericValue <= 0) return;
    setSaving(true);
    try {
      await onSave({
        id: burn.id,
        activity_type: kind,
        duration_minutes: duration,
        distance_km: cfg.unit === 'km' ? numericValue : null,
        calories: kcal,
        met_estimate: met,
        effective_weight_kg: weightKg,
        confidence: 'medium',
        energy_model_version: ENERGY_MODEL_VERSION,
        calculation_inputs: { paceSource: numericMinutes > 0 ? 'actual_timing' : 'generic_fallback', editedAt: new Date().toISOString() },
      });
      toast.success(`Updated ${cfg.label.toLowerCase()} · ${kcal} kcal`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update activity');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!burn) return;
    setSaving(true);
    try {
      await onDelete(burn.id);
      toast.success(`Removed ${cfg.label.toLowerCase()}`);
      onClose();
    } catch {
      toast.error('Failed to remove');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!burn} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        {burn && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <cfg.icon className="w-5 h-5" />
                Edit {cfg.label} · {format(parseDateKey(burn.date), 'MMM d')}
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
                      <span className="text-xs font-semibold">{c.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-activity-value">
                  {cfg.unit === 'min' ? 'Duration (min)' : 'Distance (km)'}
                </Label>
                <Input
                  id="edit-activity-value"
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
                  <Label htmlFor="edit-activity-minutes" className="flex items-center justify-between">
                    <span>Time (min) <span className="text-muted-foreground font-normal">— optional</span></span>
                    {usingCustomTime && (
                      <span className="text-xs text-muted-foreground">using your time</span>
                    )}
                  </Label>
                  <Input
                    id="edit-activity-minutes"
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
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Burn</div>
                  <div className="text-xl font-bold">{kcal} <span className="text-xs font-normal text-muted-foreground">kcal</span></div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Duration</div>
                  <div className="text-xl font-bold">{duration} <span className="text-xs font-normal text-muted-foreground">min</span></div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Based on {weightKg.toFixed(1)} kg · {cfg.paceLabel} pace · MET {met.toFixed(1)}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  aria-label="Delete activity"
                  className="px-3.5 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={numericValue <= 0 || saving}
                  className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
