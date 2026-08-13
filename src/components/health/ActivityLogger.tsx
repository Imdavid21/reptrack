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
  // Default/assumed pace: seeds a duration before a real time is entered,
  // and shown as paceLabel. Doesn't drive the calorie math on its own — see
  // effectiveMet, which calculates MET from real pace when it's known.
  paceMinPerKm: number;
  icon: typeof Footprints;
  quickKm: number[];
  paceLabel: string;
  unit: 'km' | 'min';
}> = {
  walking: { label: 'Walk',    paceMinPerKm: 12, icon: Footprints,      quickKm: [2, 3, 4, 5, 7],   paceLabel: '~5 km/h', unit: 'km' },
  running: { label: 'Run',     paceMinPerKm: 6,  icon: PersonStanding,  quickKm: [3, 5, 8, 10, 15], paceLabel: '~10 km/h', unit: 'km' },
  cycling: { label: 'Cycling', paceMinPerKm: 3,  icon: Bike,            quickKm: [5, 10, 20, 30, 50], paceLabel: '~20 km/h', unit: 'km' },
  boxing:  { label: 'Boxing',  paceMinPerKm: 1,  icon: Swords,          quickKm: [15, 30, 45, 60, 90], paceLabel: 'training rounds', unit: 'min' },
};

// Boxing has no distance, so there's no pace to calculate a MET from — it
// keeps a fixed intensity estimate. The other three compute MET from actual
// speed instead (see effectiveMet).
const BOXING_MET = 9.0;

// Bounds a computed speed to what's physiologically plausible for each
// activity, so a mistyped distance or time (an extra zero, a unit mix-up)
// can't imply an impossible pace and produce an absurd calorie estimate —
// while still letting a genuinely fast or slow real pace move the number.
const SPEED_CLAMP_KMH: Record<'walking' | 'running' | 'cycling', [min: number, max: number]> = {
  walking: [1, 9],
  running: [3, 28],
  cycling: [4, 55],
};

// ACSM metabolic equations for flat-ground walking/running:
// VO2 (ml/kg/min) = coefficient * speed(m/min) + 3.5, MET = VO2 / 3.5.
// Walking and running use different coefficients because gait mechanics
// differ, not just speed. This is the standard exercise-science way to get
// energy cost from pace, rather than one flat MET regardless of how fast
// the activity actually was.
function walkingMet(speedKmh: number): number {
  const speedMPerMin = (speedKmh * 1000) / 60;
  return (0.1 * speedMPerMin + 3.5) / 3.5;
}

function runningMet(speedKmh: number): number {
  const speedMPerMin = (speedKmh * 1000) / 60;
  return (0.2 * speedMPerMin + 3.5) / 3.5;
}

// Cycling's energy cost doesn't follow a clean linear formula the way
// walking/running do (aerodynamic drag dominates at speed), so there's no
// equivalent ACSM equation. Instead, linearly interpolate between the
// Compendium of Physical Activities' speed brackets for cycling — a smooth
// curve instead of one flat number or a step at each bracket boundary.
//
// The Compendium's own lowest bracket is a single flat value covering
// everything under 10mph/16.1km/h — used verbatim as-is, that makes
// cyclingMet() return the exact same MET for a near-stationary 4km/h crawl
// and a genuine 15km/h cruise, silently flattening most of the realistic
// speed range right where this feature most needs to be pace-sensitive. The
// 8.0km/h point below isn't a sourced Compendium bracket (there isn't one
// this granular) — it's a deliberately conservative estimate that breaks up
// that flat zone so distance actually moves the number below 16.1km/h too,
// without a hard published bracket boundary to source it from.
const CYCLING_MET_CURVE: [speedKmh: number, met: number][] = [
  [8.0, 3.0],   // very slow / barely pedaling — estimated, not a Compendium bracket
  [16.1, 4.0],  // <10 mph, leisure
  [19.3, 6.8],  // 10-11.9 mph, light effort
  [22.5, 8.0],  // 12-13.9 mph, moderate effort
  [25.7, 10.0], // 14-15.9 mph, vigorous effort
  [30.6, 12.0], // 16-19 mph, fast/vigorous
  [32.2, 15.8], // 20+ mph, racing
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

/**
 * MET calculated from actual pace (distance ÷ time), not looked up from a
 * fixed per-activity number — running a 5k in 40 minutes is a different
 * effort than running it in 20, and the estimate should reflect that. When
 * a real time hasn't been entered yet, seeds from the activity's typical
 * pace (paceMinPerKm) so there's still a reasonable number to show — that
 * seed runs through the same formula, it's just the starting point rather
 * than a separate fixed value.
 */
export function effectiveMet(kind: ActivityKind, distanceKm: number, minutes: number): number {
  const cfg = ACTIVITY_CONFIG[kind];
  if (cfg.unit !== 'km') return BOXING_MET;

  const rawSpeedKmh = distanceKm > 0 && minutes > 0
    ? distanceKm / (minutes / 60)
    : 60 / cfg.paceMinPerKm;
  const [minSpeed, maxSpeed] = SPEED_CLAMP_KMH[kind as 'walking' | 'running' | 'cycling'];
  const speedKmh = Math.min(maxSpeed, Math.max(minSpeed, rawSpeedKmh));

  if (kind === 'walking') return walkingMet(speedKmh);
  if (kind === 'running') return runningMet(speedKmh);
  return cyclingMet(speedKmh);
}

/**
 * kcal = MET * weight(kg) * hours
 * For km-based activities, `minutesOverride` (if > 0) replaces the default
 * pace-derived duration — see effectiveMet, which calculates MET from
 * whatever pace that implies rather than a fixed per-activity number.
 */
export function activityCalories(
  kind: ActivityKind,
  value: number,
  weightKg: number,
  minutesOverride?: number,
) {
  const minutes = activityDuration(kind, value, minutesOverride);
  const met = effectiveMet(kind, value, minutes);
  // Maintenance already includes resting expenditure; log only active kcal.
  return Math.round(Math.max(0, met - 1) * weightKg * (minutes / 60));
}

export function activityDuration(kind: ActivityKind, value: number, minutesOverride?: number) {
  const cfg = ACTIVITY_CONFIG[kind];
  if (cfg.unit === 'min') return Math.round(value);
  if (minutesOverride && minutesOverride > 0) return Math.round(minutesOverride);
  return Math.round(value * cfg.paceMinPerKm);
}

export function ActivityLogger({ compact = false }: { compact?: boolean }) {
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
  const met = useMemo(
    () => effectiveMet(kind, numericValue, duration),
    [kind, numericValue, duration],
  );
  const usingCustomTime = cfg.unit === 'km' && numericMinutes > 0;

  // Existing activity of this type already logged on the selected date.
  const logDateStr = format(logDate, 'yyyy-MM-dd');
  const existing = useMemo(
    () => manualBurns.find(b => b.date === logDateStr && b.activity_type === kind),
    [manualBurns, logDateStr, kind],
  );
  const recentForDay = useMemo(() => manualBurns.find(b => b.date === logDateStr), [manualBurns, logDateStr]);

  // When opening or changing date/type, preload any existing entry so the user
  // updates it instead of unknowingly overwriting it (addBurn upserts per day+type).
  useEffect(() => {
    if (!open) return;
    if (existing?.duration_minutes) {
      if (cfg.unit === 'min') {
        setValue(String(existing.duration_minutes));
        setMinutes('');
      } else if (existing.distance_km != null) {
        // Real stored distance — show it alongside the time it took.
        setValue(String(existing.distance_km));
        setMinutes(String(existing.duration_minutes));
      } else {
        // Pre-fix entry: the original distance was never stored, only the
        // resulting duration. Approximate it from the default pace — this
        // can't recover what was actually logged, just estimate a plausible
        // value so the field isn't blank.
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
        distance_km: cfg.unit === 'km' ? numericValue : null,
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
        className={compact ? "w-full h-14 flex items-center justify-between px-4 hover:bg-muted/30 transition-colors text-sm" : "w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-border hover:border-foreground/30 transition-colors text-sm font-medium"}
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
              Based on {weightKg.toFixed(1)} kg · {cfg.paceLabel} pace · MET {met.toFixed(1)}
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
