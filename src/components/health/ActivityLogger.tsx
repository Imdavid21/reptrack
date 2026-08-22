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
import { ENERGY_MODEL_VERSION, estimateActivity, netActivityKcal, type ActivityObservation } from '@/lib/energyEngineV3';

export type ActivityKind = 'walking' | 'running' | 'cycling' | 'boxing';

export const ACTIVITY_CONFIG: Record<ActivityKind, {
  label: string;
  paceMinPerKm: number;
  icon: typeof Footprints;
  quickKm: number[];
  paceLabel: string;
  unit: 'km' | 'min';
}> = {
  walking: { label: 'Walk',    paceMinPerKm: 12, icon: Footprints,      quickKm: [2, 3, 4, 5, 7],     paceLabel: '~5 km/h', unit: 'km' },
  running: { label: 'Run',     paceMinPerKm: 6,  icon: PersonStanding,  quickKm: [3, 5, 8, 10, 15],   paceLabel: '~10 km/h', unit: 'km' },
  cycling: { label: 'Cycling', paceMinPerKm: 3,  icon: Bike,            quickKm: [5, 10, 20, 30, 50], paceLabel: '~20 km/h', unit: 'km' },
  boxing:  { label: 'Boxing',  paceMinPerKm: 1,  icon: Swords,          quickKm: [15, 30, 45, 60, 90], paceLabel: 'training rounds', unit: 'min' },
};

const BOXING_MET = 6.0;
const SPEED_CLAMP_KMH: Record<'walking' | 'running' | 'cycling', [number, number]> = {
  walking: [1, 9],
  running: [3, 28],
  cycling: [4, 55],
};

function walkingMet(speedKmh: number): number {
  const speedMPerMin = (speedKmh * 1000) / 60;
  return (0.1 * speedMPerMin + 3.5) / 3.5;
}

function runningMet(speedKmh: number): number {
  const speedMPerMin = (speedKmh * 1000) / 60;
  return (0.2 * speedMPerMin + 3.5) / 3.5;
}

const CYCLING_MET_CURVE: [number, number][] = [
  [8.0, 3.0],
  [16.1, 4.0],
  [19.3, 6.8],
  [22.5, 8.0],
  [25.7, 10.0],
  [30.6, 12.0],
  [32.2, 15.8],
];

function cyclingMet(speedKmh: number): number {
  if (speedKmh <= CYCLING_MET_CURVE[0][0]) return CYCLING_MET_CURVE[0][1];
  for (let i = 1; i < CYCLING_MET_CURVE.length; i++) {
    const [x1, y1] = CYCLING_MET_CURVE[i - 1];
    const [x2, y2] = CYCLING_MET_CURVE[i];
    if (speedKmh <= x2) {
      const t = (speedKmh - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return CYCLING_MET_CURVE[CYCLING_MET_CURVE.length - 1][1];
}

export function effectiveMet(kind: ActivityKind, distanceKm: number, minutes: number): number {
  const cfg = ACTIVITY_CONFIG[kind];
  if (cfg.unit !== 'km') return BOXING_MET;
  const rawSpeedKmh = distanceKm > 0 && minutes > 0 ? distanceKm / (minutes / 60) : 60 / cfg.paceMinPerKm;
  const [minSpeed, maxSpeed] = SPEED_CLAMP_KMH[kind as 'walking' | 'running' | 'cycling'];
  const speedKmh = Math.min(maxSpeed, Math.max(minSpeed, rawSpeedKmh));
  if (kind === 'walking') return walkingMet(speedKmh);
  if (kind === 'running') return runningMet(speedKmh);
  return cyclingMet(speedKmh);
}

export function activityCalories(kind: ActivityKind, value: number, weightKg: number, minutesOverride?: number) {
  const minutes = activityDuration(kind, value, minutesOverride);
  const met = effectiveMet(kind, value, minutes);
  return Math.round(netActivityKcal(met, weightKg, minutes));
}

export function activityDuration(kind: ActivityKind, value: number, minutesOverride?: number) {
  const cfg = ACTIVITY_CONFIG[kind];
  if (cfg.unit === 'min') return Math.round(value);
  if (minutesOverride && minutesOverride > 0) return Math.round(minutesOverride);
  return Math.round(value * cfg.paceMinPerKm);
}

function localClock(timestamp: string | null | undefined) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'HH:mm');
}

function occurrenceOnDate(day: Date, clock: string) {
  if (!/^\d{2}:\d{2}$/.test(clock)) return null;
  const [hours, minutes] = clock.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  const stamp = new Date(day);
  stamp.setHours(hours, minutes, 0, 0);
  return stamp;
}

export function ActivityLogger({ compact = false }: { compact?: boolean }) {
  const { weightKg, addBurn } = useCalorieBurn();
  const { data: manualBurns = [] } = useManualBurns(180);
  const { logDate, isBackDated } = useLogDate();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ActivityKind>('walking');
  const [value, setValue] = useState('');
  const [minutes, setMinutes] = useState('');
  const [endTime, setEndTime] = useState('');
  const [boxingIntensity, setBoxingIntensity] = useState<'technique' | 'normal' | 'conditioning' | 'sparring'>('normal');
  const [saving, setSaving] = useState(false);

  const cfg = ACTIVITY_CONFIG[kind];
  const numericValue = parseFloat(value) || 0;
  const numericMinutes = parseFloat(minutes) || 0;
  const activityHistory: ActivityObservation[] = useMemo(
    () => manualBurns.map(entry => ({ date: entry.date, activityType: entry.activity_type || 'other', distanceKm: entry.distance_km, durationMinutes: entry.duration_minutes })),
    [manualBurns],
  );
  const estimate = useMemo(
    () => estimateActivity({ kind, date: logDate, weight: weightKg, distanceKm: cfg.unit === 'km' ? numericValue : null, durationMinutes: cfg.unit === 'min' ? numericValue : numericMinutes || null, history: activityHistory, boxingIntensity }),
    [kind, logDate, weightKg, numericValue, numericMinutes, cfg.unit, activityHistory, boxingIntensity],
  );
  const kcal = Math.round(estimate.netKcal);
  const duration = Math.round(estimate.durationMinutes);
  const met = estimate.met;
  const usingCustomTime = cfg.unit === 'km' && numericMinutes > 0;
  const canSave = (numericValue > 0 || (cfg.unit === 'km' && numericMinutes > 0)) && !!endTime;

  const logDateStr = format(logDate, 'yyyy-MM-dd');
  const existing = useMemo(
    () => manualBurns.find(b => b.date === logDateStr && b.activity_type === kind),
    [manualBurns, logDateStr, kind],
  );
  const recentForDay = useMemo(() => manualBurns.find(b => b.date === logDateStr), [manualBurns, logDateStr]);

  useEffect(() => {
    if (!open) return;
    if (existing?.duration_minutes) {
      if (cfg.unit === 'min') {
        setValue(String(existing.duration_minutes));
        setMinutes('');
      } else if (existing.distance_km != null) {
        setValue(String(existing.distance_km));
        setMinutes(String(existing.duration_minutes));
      } else {
        const km = existing.duration_minutes / ACTIVITY_CONFIG[kind].paceMinPerKm;
        setValue(km.toFixed(1));
        setMinutes(String(existing.duration_minutes));
      }
      setEndTime(localClock(existing.ended_at));
    } else {
      setValue('');
      setMinutes('');
      setEndTime(isBackDated ? '' : format(new Date(), 'HH:mm'));
    }
  }, [open, logDateStr, kind, existing, cfg.unit, isBackDated]);

  const handleSave = async () => {
    if (!canSave) return;
    const endedAt = occurrenceOnDate(logDate, endTime);
    if (!endedAt) {
      toast.error('Enter a valid activity time');
      return;
    }
    if (!isBackDated && endedAt.getTime() > Date.now() + 60_000) {
      toast.error('Activity time cannot be in the future');
      return;
    }
    const startedAt = new Date(endedAt.getTime() - duration * 60_000);

    setSaving(true);
    try {
      await addBurn.mutateAsync({
        source: 'manual',
        activity_type: kind,
        duration_minutes: duration,
        distance_km: cfg.unit === 'km' ? numericValue : null,
        calories: kcal,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        intensity_band: kind === 'boxing' ? boxingIntensity : 'pace_based',
        intensity_source: estimate.paceSource,
        met_estimate: estimate.met,
        effective_weight_kg: estimate.effectiveWeightKg,
        confidence: estimate.confidence,
        energy_model_version: ENERGY_MODEL_VERSION,
        calculation_inputs: {
          paceMinutesPerKm: estimate.paceMinutesPerKm,
          paceSource: estimate.paceSource,
          warnings: estimate.warnings,
          eventTimeSource: 'user_confirmed_end_time',
        },
        ...(isBackDated ? { date: logDateStr } : {}),
      });
      const when = isBackDated ? ` on ${format(logDate, 'MMM d')}` : '';
      const verb = existing ? 'Updated' : 'Logged';
      const unitLabel = cfg.unit === 'min' ? 'min' : 'km';
      const amountLabel = numericValue > 0 ? `${Math.round(numericValue)} ${unitLabel}` : `${Math.round(duration)} min`;
      toast.success(`${verb} ${amountLabel} ${cfg.label.toLowerCase()} · ${kcal} kcal${when}`);
      setValue('');
      setMinutes('');
      setEndTime('');
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
        className={compact ? 'w-full h-14 flex items-center justify-between px-4 hover:bg-muted/30 transition-colors text-sm' : 'w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-border hover:border-foreground/30 transition-colors text-sm font-medium'}
      >
        {compact ? <><span>Activity</span><span className="flex items-center gap-2 font-semibold">{recentForDay ? `${ACTIVITY_CONFIG[(recentForDay.activity_type || 'walking') as ActivityKind]?.label || 'Activity'} · ${recentForDay.distance_km ?? recentForDay.duration_minutes}${recentForDay.distance_km != null ? ' km' : ' min'}` : 'Add'}<span aria-hidden>›</span></span></> : <><Activity className="w-4 h-4" />Log Activity{isBackDated ? ` · ${format(logDate, 'MMM d')}` : ''}</>}
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
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(ACTIVITY_CONFIG) as ActivityKind[]).map(k => {
                const c = ACTIVITY_CONFIG[k];
                const Icon = c.icon;
                const active = k === kind;
                return (
                  <button key={k} onClick={() => setKind(k)} className={cn('flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors', active ? 'bg-foreground text-background border-foreground' : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground')}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-value">{cfg.unit === 'min' ? 'Duration (min)' : 'Distance (km)'}</Label>
              <Input id="activity-value" type="number" inputMode="decimal" step={cfg.unit === 'min' ? '1' : '0.1'} placeholder={cfg.unit === 'min' ? '30' : '4.0'} value={value} onChange={(e) => setValue(e.target.value)} autoFocus className="h-12 text-lg" />
              <div className="flex gap-2">
                {cfg.quickKm.map(v => <button key={v} onClick={() => setValue(String(v))} className="flex-1 py-2 rounded-lg bg-muted text-sm hover:bg-muted/70 transition-colors">{v}{cfg.unit === 'min' ? 'm' : 'km'}</button>)}
              </div>
            </div>

            {cfg.unit === 'km' && (
              <div className="space-y-2">
                <Label htmlFor="activity-minutes" className="flex items-center justify-between">
                  <span>Duration (min) <span className="text-muted-foreground font-normal">- optional</span></span>
                  {usingCustomTime && <span className="text-xs text-muted-foreground">using your time</span>}
                </Label>
                <Input id="activity-minutes" type="number" inputMode="numeric" step="1" placeholder={`default ${activityDuration(kind, numericValue || 1)} min for ${numericValue || 1} km`} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-11" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="activity-end-time">Finished at</Label>
              <Input id="activity-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11 tabular-nums" />
              {isBackDated && !endTime && <p className="text-xs text-muted-foreground">Time is required for a backdated activity so RepTrack does not invent a timestamp.</p>}
            </div>

            {kind === 'boxing' && (
              <div className="grid grid-cols-2 gap-2">
                {(['technique', 'normal', 'conditioning', 'sparring'] as const).map(level => (
                  <button key={level} type="button" onClick={() => setBoxingIntensity(level)} className={cn('rounded-xl border px-3 py-2 text-xs capitalize', boxingIntensity === level ? 'border-foreground bg-foreground text-background' : 'border-border')}>{level}</button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40">
              <div><div className="type-caption">Burn</div><div className="text-xl font-bold">{kcal} <span className="text-xs font-normal text-muted-foreground">kcal</span></div></div>
              <div><div className="type-caption">Duration</div><div className="text-xl font-bold">{duration} <span className="text-xs font-normal text-muted-foreground">min</span></div></div>
            </div>

            {existing && <p className="text-xs text-energy-ink bg-energy-soft rounded-lg px-2.5 py-1.5">Updating your {format(logDate, 'MMM d')} {cfg.label.toLowerCase()} - {existing.calories} kcal already logged.</p>}

            <p className="text-xs text-muted-foreground">Based on {weightKg.toFixed(1)} kg · {estimate.paceSource.replace(/_/g, ' ')} · intensity {met.toFixed(1)} MET · {estimate.confidence} confidence</p>

            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium">Cancel</button>
              <button onClick={handleSave} disabled={!canSave || saving} className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : existing ? 'Update' : 'Add Burn'}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
