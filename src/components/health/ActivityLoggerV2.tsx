import { useEffect, useMemo, useState } from 'react';
import { Bike, Footprints, PersonStanding, Swords } from 'lucide-react';
import { format } from 'date-fns';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useCalorieBurn, useManualBurns } from '@/hooks/useCalorieBurn';
import { useLogDate } from '@/contexts/LogDateContext';
import { ENERGY_MODEL_VERSION, estimateActivity, type ActivityObservation } from '@/lib/energyEngineV3';
import { cn } from '@/lib/utils';

export type DirectActivityKind = 'walking' | 'running' | 'cycling' | 'boxing';

const CONFIG: Record<DirectActivityKind, {
  label: string;
  icon: typeof Footprints;
  unit: 'km' | 'min';
  quick: number[];
}> = {
  walking: { label: 'Walk', icon: Footprints, unit: 'km', quick: [2, 3, 4, 5] },
  running: { label: 'Run', icon: PersonStanding, unit: 'km', quick: [3, 5, 8, 10] },
  cycling: { label: 'Cycle', icon: Bike, unit: 'km', quick: [5, 10, 20, 30] },
  boxing: { label: 'Box', icon: Swords, unit: 'min', quick: [20, 30, 45, 60] },
};

function preferredKind(history: Array<{ activity_type: string | null }>): DirectActivityKind {
  const recent = history.find(item => item.activity_type && item.activity_type in CONFIG)?.activity_type as DirectActivityKind | undefined;
  return recent || 'walking';
}

export function ActivityLoggerV2() {
  const { logDate, isBackDated } = useLogDate();
  const { weightKg, addBurn } = useCalorieBurn(logDate);
  const { data: history = [] } = useManualBurns(180);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DirectActivityKind>('walking');
  const [amount, setAmount] = useState('');
  const [minutes, setMinutes] = useState('');
  const [boxingIntensity, setBoxingIntensity] = useState<'technique' | 'normal' | 'conditioning' | 'sparring'>('normal');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dateKey = format(logDate, 'yyyy-MM-dd');
  const config = CONFIG[kind];
  const numericAmount = Number.parseFloat(amount) || 0;
  const numericMinutes = Number.parseFloat(minutes) || 0;
  const existing = useMemo(() => history.find(item => item.date === dateKey && item.activity_type === kind), [history, dateKey, kind]);
  const todayEntries = useMemo(() => history.filter(item => item.date === dateKey), [history, dateKey]);
  const recentForDay = todayEntries[0];
  const observations: ActivityObservation[] = useMemo(() => history.map(item => ({ date: item.date, activityType: item.activity_type || 'other', distanceKm: item.distance_km, durationMinutes: item.duration_minutes })), [history]);

  const estimate = useMemo(() => estimateActivity({
    kind,
    date: logDate,
    weight: weightKg,
    distanceKm: config.unit === 'km' ? numericAmount || null : null,
    durationMinutes: config.unit === 'min' ? numericAmount || null : numericMinutes || null,
    history: observations,
    boxingIntensity,
  }), [kind, logDate, weightKg, config.unit, numericAmount, numericMinutes, observations, boxingIntensity]);

  const resetForKind = (nextKind: DirectActivityKind) => {
    setKind(nextKind);
    setError(null);
    const row = history.find(item => item.date === dateKey && item.activity_type === nextKind);
    if (!row) {
      setAmount('');
      setMinutes('');
      return;
    }
    const nextConfig = CONFIG[nextKind];
    if (nextConfig.unit === 'min') {
      setAmount(row.duration_minutes ? String(row.duration_minutes) : '');
      setMinutes('');
    } else {
      setAmount(row.distance_km != null ? String(row.distance_km) : '');
      setMinutes(row.duration_minutes ? String(row.duration_minutes) : '');
    }
  };

  useEffect(() => {
    if (!open) return;
    resetForKind(preferredKind(history));
    // Only seed when the sheet opens. History updates after save should not
    // unexpectedly rewrite a value while the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    if (numericAmount <= 0) {
      setError(`Enter ${config.unit === 'km' ? 'a distance' : 'a duration'}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const duration = Math.max(1, Math.round(estimate.durationMinutes));
      const endedAt = isBackDated ? null : new Date();
      const startedAt = endedAt ? new Date(endedAt.getTime() - duration * 60_000) : null;
      await addBurn.mutateAsync({
        source: 'manual',
        activity_type: kind,
        duration_minutes: duration,
        distance_km: config.unit === 'km' ? numericAmount : null,
        calories: Math.round(estimate.netKcal),
        started_at: startedAt?.toISOString() || null,
        ended_at: endedAt?.toISOString() || null,
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
          eventTimeSource: endedAt ? 'log_time_minus_duration' : 'unknown_backdated_time',
        },
        ...(isBackDated ? { date: dateKey } : {}),
      });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Activity was not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const summary = recentForDay
    ? `${CONFIG[(recentForDay.activity_type as DirectActivityKind) || 'walking']?.label || 'Activity'} · ${recentForDay.distance_km != null ? `${Number(recentForDay.distance_km).toFixed(1)} km` : `${recentForDay.duration_minutes || 0} min`}`
    : 'Add';

  return <>
    <button onClick={() => setOpen(true)} className="w-full min-h-14 px-4 py-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors">
      <span className="text-sm">Activity</span>
      <span className="text-sm font-semibold tabular-nums">{summary} <span className="text-muted-foreground" aria-hidden>›</span></span>
    </button>

    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="rounded-t-[28px] max-h-[90dvh] overflow-y-auto">
        <DrawerHeader className="px-5 text-left"><DrawerTitle>Activity{isBackDated ? ` · ${format(logDate, 'MMM d')}` : ''}</DrawerTitle></DrawerHeader>
        <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] space-y-5">
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Activity type">
            {(Object.keys(CONFIG) as DirectActivityKind[]).map(option => {
              const Icon = CONFIG[option].icon;
              const active = option === kind;
              return <button key={option} role="radio" aria-checked={active} onClick={() => resetForKind(option)} className={cn('min-h-16 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold', active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-muted-foreground')}><Icon className="h-4 w-4"/><span>{CONFIG[option].label}</span></button>;
            })}
          </div>

          <div>
            <label htmlFor="activity-amount" className="type-caption">{config.unit === 'km' ? 'Distance (km)' : 'Duration (min)'}</label>
            <Input id="activity-amount" autoFocus type="number" inputMode="decimal" step={config.unit === 'km' ? '0.1' : '1'} value={amount} onChange={event => setAmount(event.target.value)} placeholder={config.unit === 'km' ? '4.0' : '30'} className="mt-1 h-14 text-xl tabular-nums" />
            <div className="mt-2 grid grid-cols-4 gap-2">{config.quick.map(value => <button key={value} onClick={() => setAmount(String(value))} className="min-h-10 rounded-xl bg-muted text-xs font-semibold tabular-nums">{value}{config.unit === 'km' ? ' km' : ' min'}</button>)}</div>
          </div>

          {config.unit === 'km' && <div><label htmlFor="activity-time" className="type-caption">Time (min) <span className="font-normal">optional</span></label><Input id="activity-time" type="number" inputMode="numeric" step="1" value={minutes} onChange={event => setMinutes(event.target.value)} placeholder="Use your actual time if known" className="mt-1 h-12" /></div>}

          {kind === 'boxing' && <div><div className="type-caption mb-2">Intensity</div><div className="grid grid-cols-2 gap-2">{(['technique', 'normal', 'conditioning', 'sparring'] as const).map(level => <button key={level} onClick={() => setBoxingIntensity(level)} className={cn('min-h-11 rounded-xl border px-3 text-sm capitalize', boxingIntensity === level ? 'border-foreground bg-muted font-semibold' : 'border-border text-muted-foreground')}>{level}</button>)}</div></div>}

          {numericAmount > 0 && <div className="rounded-2xl bg-muted/40 p-4 grid grid-cols-2 gap-4"><div><div className="type-caption">Estimated active burn</div><div className="mt-1 text-xl font-semibold tabular-nums">~{Math.round(estimate.netKcal)} kcal</div></div><div><div className="type-caption">Duration</div><div className="mt-1 text-xl font-semibold tabular-nums">{Math.round(estimate.durationMinutes)} min</div></div><p className="col-span-2 type-caption">Estimate only. Pace is {estimate.paceSource.replace(/_/g, ' ')} and confidence is {estimate.confidence}.</p></div>}

          {existing && <p className="type-caption">This updates the existing {CONFIG[kind].label.toLowerCase()} entry for {format(logDate, 'MMM d')}.</p>}
          {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <button onClick={save} disabled={saving || numericAmount <= 0} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50">{saving ? 'Saving…' : existing ? `Update ${CONFIG[kind].label.toLowerCase()}` : `Log ${CONFIG[kind].label.toLowerCase()}`}</button>
        </div>
      </DrawerContent>
    </Drawer>
  </>;
}
