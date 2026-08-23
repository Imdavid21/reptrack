import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { normalizeWaterGoalLiters } from '@/lib/bodyScore';
import { localDateKey } from '@/lib/dateKey';
import { useLogDate } from '@/contexts/LogDateContext';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { ActivityLogger } from '@/components/health/ActivityLogger';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

function GoalBar({ value, goal }: { value: number; goal: number }) {
  const progress = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>;
}

function logTime(timestamp?: string | null) {
  const date = timestamp ? new Date(timestamp) : null;
  return date && !Number.isNaN(date.getTime()) ? format(date, 'h:mm a') : 'Time unavailable';
}

function formatWeight(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function TodaySnapshot() {
  const { logDate, isBackDated } = useLogDate();
  const today = localDateKey(logDate);
  const { preferences } = useUserPreferences();
  const { data: metrics, upsertMetrics, isUpserting } = useDailyMetrics({ from: new Date(logDate.getTime() - 30 * 86400000), to: logDate });
  const { totalToday, waterLogs, addWaterLog, isAdding } = useWaterLogs(logDate);
  const [sheet, setSheet] = useState<'sleep' | 'weight' | null>(null);
  const [waterExpanded, setWaterExpanded] = useState(false);
  const todayMetric = metrics?.dataPoints.find(point => point.date === today);
  const measuredWeight = [...(metrics?.dataPoints || [])].reverse().find(point => point.bodyweight && point.bodyweight > 0)?.bodyweight;
  const lastWeight = measuredWeight ?? preferences?.initial_weight_kg ?? preferences?.weight_goal ?? 70;
  const [weight, setWeight] = useState(Number(lastWeight));
  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(0);
  const sleepGoal = preferences?.sleep_goal ?? 8;
  const waterGoal = normalizeWaterGoalLiters(preferences?.daily_water_goal ?? 3);

  useEffect(() => { if (sheet === 'weight') setWeight(Number(todayMetric?.bodyweight ?? lastWeight)); }, [sheet, todayMetric?.bodyweight, lastWeight]);
  useEffect(() => { if (sheet === 'sleep') { const value = todayMetric?.sleep_hours ?? 7; setHours(Math.floor(value)); setMinutes(Math.round((value % 1) * 60)); } }, [sheet, todayMetric?.sleep_hours]);

  const saveWeight = async () => { if (!Number.isFinite(weight) || weight <= 0) return; await upsertMetrics({ date: today, bodyweight: Math.round(weight * 100) / 100 }); haptic('light'); setSheet(null); };
  const saveSleep = async () => { const value = hours + minutes / 60; if (value <= 0 || value > 24) return; await upsertMetrics({ date: today, sleep_hours: Math.round(value * 100) / 100 }); haptic('light'); setSheet(null); };
  const logWater = async (amount: number) => { try { await addWaterLog({ amount, ...(isBackDated ? { loggedAt: logDate } : {}) }); } catch { toast.error('Water was not saved. Try again.'); } };

  const weightLabel = todayMetric?.bodyweight ? `${formatWeight(todayMetric.bodyweight)} kg` : 'Not logged';
  const sleepLabel = todayMetric?.sleep_hours ? `${Math.floor(todayMetric.sleep_hours)} h ${Math.round((todayMetric.sleep_hours % 1) * 60)} m` : 'Not logged';
  const waterLabel = waterLogs.length ? `${totalToday.toFixed(2)} L` : 'No entries yet';

  return <>
    <section aria-labelledby="today-state-heading" className="daily-snapshot rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border">
      <div className="px-4 py-3 bg-muted/25"><h2 id="today-state-heading" className="type-eyebrow">Today</h2></div>

      <button onClick={() => setSheet('weight')} className="w-full min-h-14 px-4 py-3 hover:bg-muted/30 focus-visible:bg-muted/30 transition-colors text-left"><div className="flex items-center justify-between gap-3"><span className="text-sm">Bodyweight</span><span className="text-sm font-semibold tabular-nums text-right">{weightLabel} <span className="text-muted-foreground" aria-hidden>›</span></span></div></button>

      <button onClick={() => setSheet('sleep')} className="w-full min-h-14 px-4 py-3 hover:bg-muted/30 focus-visible:bg-muted/30 transition-colors text-left"><div className="flex items-center justify-between gap-3"><span className="text-sm">Sleep</span><span className="text-sm font-semibold tabular-nums text-right">{sleepLabel} <span className="text-muted-foreground" aria-hidden>›</span></span></div>{todayMetric?.sleep_hours != null && todayMetric.sleep_hours > 0 && <><GoalBar value={todayMetric.sleep_hours} goal={sleepGoal}/><div className="mt-1 text-xs text-muted-foreground tabular-nums">{todayMetric.sleep_hours.toFixed(1)} / {sleepGoal} h target</div></>}</button>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2"><span className="text-sm flex-1">Water</span><span className="text-sm font-semibold tabular-nums mr-1">{waterLabel}</span><button aria-label="Add 250 millilitres of water" disabled={isAdding} onClick={() => logWater(.25)} className="h-10 min-w-14 px-3 rounded-full bg-muted text-xs font-bold disabled:opacity-50">+250</button><button aria-label="Add 500 millilitres of water" disabled={isAdding} onClick={() => logWater(.5)} className="h-10 min-w-14 px-3 rounded-full bg-foreground text-background text-xs font-bold disabled:opacity-50">+500</button></div>
        {waterLogs.length > 0 && <><GoalBar value={totalToday} goal={waterGoal}/><div className="mt-1 text-xs text-muted-foreground tabular-nums">{totalToday.toFixed(2)} / {waterGoal.toFixed(2)} L target</div></>}
        {waterLogs.length > 0 && <button onClick={() => setWaterExpanded(open => !open)} className="mt-2 min-h-9 text-xs text-muted-foreground hover:text-foreground">{waterExpanded ? 'Hide water entries' : `Show ${waterLogs.length} water ${waterLogs.length === 1 ? 'entry' : 'entries'}`}</button>}
        {waterExpanded && <div className="mt-2 space-y-1.5">{waterLogs.map(log => <div key={log.id} className="flex items-center justify-between text-sm"><span className="text-muted-foreground tabular-nums">{logTime(log.timestamp)}</span><span className="font-medium tabular-nums">{Number(log.amount).toFixed(2)} L</span></div>)}</div>}
      </div>

      <ActivityLogger compact />
    </section>

    <section id="nutrition" className="mt-3" aria-label="Nutrition"><CalorieTrackerCompact /></section>

    <Drawer open={sheet === 'weight'} onOpenChange={open => !open && setSheet(null)}><DrawerContent className="rounded-t-[28px] max-h-[calc(100dvh-env(safe-area-inset-top))]"><DrawerHeader className="text-left px-6"><DrawerTitle>Bodyweight</DrawerTitle></DrawerHeader><div className="px-6 pb-[max(24px,env(safe-area-inset-bottom))] space-y-6"><button onClick={() => document.getElementById('weight-entry')?.focus()} className="w-full text-center"><Input id="weight-entry" type="number" inputMode="decimal" step="0.01" value={weight} onChange={event => setWeight(Number(event.target.value))} className="border-0 h-20 text-center text-5xl font-bold tabular-nums shadow-none focus-visible:ring-0"/><span className="text-sm text-muted-foreground">kg</span></button><div className="grid grid-cols-2 gap-3"><button onClick={() => setWeight(value => Math.round((value - .1) * 100) / 100)} className="h-12 rounded-xl bg-muted flex items-center justify-center gap-2 font-semibold"><Minus className="h-4 w-4"/>0.1</button><button onClick={() => setWeight(value => Math.round((value + .1) * 100) / 100)} className="h-12 rounded-xl bg-muted flex items-center justify-center gap-2 font-semibold"><Plus className="h-4 w-4"/>0.1</button></div><p className="text-sm text-muted-foreground text-center">{measuredWeight ? `Last entry · ${formatWeight(Number(measuredWeight))} kg` : 'No previous weigh-in'}</p><button onClick={saveWeight} disabled={isUpserting || weight <= 0} className="w-full h-14 rounded-2xl bg-foreground text-background font-bold disabled:opacity-50">{isUpserting ? 'Saving…' : `Log ${formatWeight(weight)} kg`}</button></div></DrawerContent></Drawer>

    <Drawer open={sheet === 'sleep'} onOpenChange={open => !open && setSheet(null)}><DrawerContent className="rounded-t-[28px] max-h-[calc(100dvh-env(safe-area-inset-top))]"><DrawerHeader className="text-left px-6"><DrawerTitle>Sleep</DrawerTitle></DrawerHeader><div className="px-6 pb-[max(24px,env(safe-area-inset-bottom))] space-y-6"><div className="text-center"><div className="text-5xl font-bold tabular-nums">{hours} h {minutes} m</div><p className="text-sm text-muted-foreground mt-2">Last night</p></div><div className="grid grid-cols-2 gap-3"><div><div className="text-xs text-muted-foreground text-center mb-2">Hours</div><div className="grid grid-cols-[44px_1fr_44px] gap-1"><button onClick={() => setHours(value => Math.max(0, value - 1))} className="h-12 rounded-xl bg-muted">−</button><Input type="number" inputMode="numeric" value={hours} onChange={event => setHours(Math.max(0, Math.min(23, Number(event.target.value))))} className="h-12 text-center text-xl font-bold tabular-nums"/><button onClick={() => setHours(value => Math.min(23, value + 1))} className="h-12 rounded-xl bg-muted">+</button></div></div><div><div className="text-xs text-muted-foreground text-center mb-2">Minutes</div><div className="grid grid-cols-[44px_1fr_44px] gap-1"><button onClick={() => setMinutes(value => value === 0 ? 45 : value - 15)} className="h-12 rounded-xl bg-muted">−</button><Input type="number" inputMode="numeric" value={minutes} onChange={event => setMinutes(Math.max(0, Math.min(59, Number(event.target.value))))} className="h-12 text-center text-xl font-bold tabular-nums"/><button onClick={() => setMinutes(value => value >= 45 ? 0 : value + 15)} className="h-12 rounded-xl bg-muted">+</button></div></div></div><button onClick={saveSleep} disabled={isUpserting || hours + minutes === 0} className="w-full h-14 rounded-2xl bg-foreground text-background font-bold disabled:opacity-50">{isUpserting ? 'Saving…' : `Log ${hours} h ${minutes} m`}</button></div></DrawerContent></Drawer>
  </>;
}
