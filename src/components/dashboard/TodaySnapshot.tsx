import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { useMeals } from '@/hooks/useMeals';
import { normalizeWaterGoalLiters } from '@/lib/bodyScore';
import { localDateKey } from '@/lib/dateKey';
import { useLogDate } from '@/contexts/LogDateContext';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { ActivityLogger } from '@/components/health/ActivityLogger';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

function GoalBar({ value, goal, label }: { value: number; goal: number; label: string }) {
  const progress = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, value)}>
      <div className="h-full rounded-full bg-foreground transition-[width] duration-150" style={{ width: `${progress}%` }} />
    </div>
  );
}

function logTime(timestamp?: string | null) {
  const date = timestamp ? new Date(timestamp) : null;
  return date && !Number.isNaN(date.getTime()) ? format(date, 'h:mm a') : 'Time unavailable';
}

function formatWeight(value: number) {
  return Number(value.toFixed(2)).toString();
}

function sleepText(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value % 1) * 60);
  return `${hours} h ${minutes} m`;
}

export function TodaySnapshot() {
  const { logDate, isBackDated } = useLogDate();
  const dateKey = localDateKey(logDate);
  const { preferences } = useUserPreferences();
  const { data: metrics, upsertMetrics, isUpserting } = useDailyMetrics({ from: new Date(logDate.getTime() - 30 * 86400000), to: logDate });
  const { totalToday, waterLogs, addWaterLog, isAdding } = useWaterLogs(logDate);
  const { meals, totalCalories } = useMeals(logDate);
  const [sheet, setSheet] = useState<'sleep' | 'weight' | 'food' | null>(null);
  const [waterExpanded, setWaterExpanded] = useState(false);

  const todayMetric = metrics?.dataPoints.find(point => point.date === dateKey);
  const weightRows = (metrics?.dataPoints || []).filter(point => point.bodyweight != null && point.bodyweight > 0);
  const latestWeightRow = weightRows.at(-1);
  const lastWeight = Number(todayMetric?.bodyweight ?? latestWeightRow?.bodyweight ?? preferences?.weight_goal ?? 70);
  const [weight, setWeight] = useState(lastWeight);
  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(0);
  const sleepGoal = preferences?.sleep_goal ?? 8;
  const waterGoal = normalizeWaterGoalLiters(preferences?.daily_water_goal ?? 3);
  const proteinGoal = preferences?.daily_protein_goal ?? 180;
  const proteinTotal = useMemo(() => meals.reduce((sum, meal) => sum + Number(meal.protein || 0), 0), [meals]);

  useEffect(() => {
    if (sheet === 'weight') setWeight(Number(todayMetric?.bodyweight ?? latestWeightRow?.bodyweight ?? lastWeight));
  }, [sheet, todayMetric?.bodyweight, latestWeightRow?.bodyweight, lastWeight]);

  useEffect(() => {
    if (sheet === 'sleep') {
      const value = todayMetric?.sleep_hours ?? 7;
      setHours(Math.floor(value));
      setMinutes(Math.round((value % 1) * 60));
    }
  }, [sheet, todayMetric?.sleep_hours]);

  const saveWeight = async () => {
    if (!Number.isFinite(weight) || weight <= 0) return;
    try {
      await upsertMetrics({ date: dateKey, bodyweight: Math.round(weight * 100) / 100 });
      haptic('light');
      setSheet(null);
    } catch {
      toast.error("Couldn't save bodyweight. Try again.");
    }
  };

  const saveSleep = async () => {
    const value = hours + minutes / 60;
    if (value <= 0 || value > 24) return;
    try {
      await upsertMetrics({ date: dateKey, sleep_hours: Math.round(value * 100) / 100 });
      haptic('light');
      setSheet(null);
    } catch {
      toast.error("Couldn't save sleep. Try again.");
    }
  };

  const logWater = async (amount: number) => {
    try {
      await addWaterLog({ amount, ...(isBackDated ? { loggedAt: logDate } : {}) });
    } catch {
      toast.error("Couldn't save water. Try again.");
    }
  };

  return (
    <>
      <section aria-labelledby="today-state-heading" className="overflow-hidden rounded-[20px] border border-border bg-card divide-y divide-border">
        <h2 id="today-state-heading" className="sr-only">Today's state</h2>

        <button onClick={() => setSheet('weight')} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/30">
          <span className="text-sm font-medium">Bodyweight</span>
          <span className="text-right text-sm font-semibold tabular-nums">
            {todayMetric?.bodyweight ? `${formatWeight(todayMetric.bodyweight)} kg` : 'Not logged'} <span className="text-muted-foreground" aria-hidden>›</span>
          </span>
        </button>

        <button onClick={() => setSheet('sleep')} className="w-full px-4 py-3 text-left hover:bg-muted/30">
          <div className="flex min-h-8 items-center justify-between gap-4">
            <span className="text-sm font-medium">Sleep</span>
            <span className="text-right text-sm font-semibold tabular-nums">
              {todayMetric?.sleep_hours != null ? sleepText(todayMetric.sleep_hours) : 'Not logged'} <span className="text-muted-foreground" aria-hidden>›</span>
            </span>
          </div>
          {todayMetric?.sleep_hours != null && <GoalBar value={todayMetric.sleep_hours} goal={sleepGoal} label="Sleep goal progress" />}
        </button>

        <div className="px-4 py-3">
          <div className="flex min-h-10 items-center gap-2">
            <span className="text-sm font-medium flex-1">Water</span>
            <span className="mr-1 text-sm font-semibold tabular-nums">{waterLogs.length ? `${totalToday.toFixed(2)} / ${waterGoal.toFixed(2)} L` : 'No entries yet'}</span>
            <button aria-label="Add 250 millilitres of water" disabled={isAdding} onClick={() => logWater(.25)} className="min-h-10 min-w-14 rounded-xl bg-muted px-3 text-xs font-semibold disabled:opacity-50">+250</button>
            <button aria-label="Add 500 millilitres of water" disabled={isAdding} onClick={() => logWater(.5)} className="min-h-10 min-w-14 rounded-xl bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-50">+500</button>
          </div>
          {waterLogs.length > 0 && <GoalBar value={totalToday} goal={waterGoal} label="Water goal progress" />}
          {waterLogs.length > 0 && (
            <button onClick={() => setWaterExpanded(open => !open)} className="mt-2 min-h-8 text-xs text-muted-foreground hover:text-foreground">
              {waterExpanded ? 'Hide entries' : `${waterLogs.length} ${waterLogs.length === 1 ? 'entry' : 'entries'}`}
            </button>
          )}
          {waterExpanded && (
            <div className="mt-1 space-y-1.5 pb-1">
              {waterLogs.map(log => <div key={log.id} className="flex items-center justify-between text-sm"><span className="text-muted-foreground tabular-nums">{logTime(log.timestamp)}</span><span className="font-medium tabular-nums">{Number(log.amount).toFixed(2)} L</span></div>)}
            </div>
          )}
        </div>

        <button onClick={() => setSheet('food')} className="w-full px-4 py-3 text-left hover:bg-muted/30">
          <div className="flex min-h-8 items-center justify-between gap-4">
            <span className="text-sm font-medium">Food</span>
            <span className="text-right">
              {meals.length ? (
                <>
                  <span className="block text-sm font-semibold tabular-nums">{totalCalories.toLocaleString()} kcal</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{Math.round(proteinTotal)} / {proteinGoal} g protein</span>
                </>
              ) : <span className="text-sm font-semibold">Nothing logged <span className="text-muted-foreground" aria-hidden>›</span></span>}
            </span>
          </div>
        </button>

        <ActivityLogger compact />
      </section>

      <Drawer open={sheet === 'weight'} onOpenChange={open => !open && setSheet(null)}>
        <DrawerContent className="rounded-t-[28px] max-h-[88dvh]">
          <DrawerHeader className="text-left px-6"><DrawerTitle>Bodyweight</DrawerTitle></DrawerHeader>
          <div className="px-6 pb-[calc(24px+env(safe-area-inset-bottom))] space-y-6">
            <button onClick={() => document.getElementById('weight-entry')?.focus()} className="w-full text-center">
              <Input id="weight-entry" type="number" inputMode="decimal" step="0.01" value={weight} onChange={event => setWeight(Number(event.target.value))} className="border-0 h-20 text-center text-5xl font-semibold tabular-nums shadow-none focus-visible:ring-0" />
              <span className="text-sm text-muted-foreground">kg</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setWeight(value => Math.round((value - .1) * 100) / 100)} className="min-h-12 rounded-xl bg-muted flex items-center justify-center gap-2 font-semibold"><Minus className="h-4 w-4" />0.1</button>
              <button onClick={() => setWeight(value => Math.round((value + .1) * 100) / 100)} className="min-h-12 rounded-xl bg-muted flex items-center justify-center gap-2 font-semibold"><Plus className="h-4 w-4" />0.1</button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {latestWeightRow?.bodyweight ? `Last: ${formatWeight(Number(latestWeightRow.bodyweight))} kg${latestWeightRow.date === dateKey ? ' · today' : ` · ${format(new Date(`${latestWeightRow.date}T12:00:00`), 'MMM d')}`}` : 'No previous weigh-in'}
            </p>
            <button onClick={saveWeight} disabled={isUpserting || weight <= 0} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50">{isUpserting ? 'Saving…' : `Log ${formatWeight(weight)} kg`}</button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={sheet === 'sleep'} onOpenChange={open => !open && setSheet(null)}>
        <DrawerContent className="rounded-t-[28px] max-h-[88dvh]">
          <DrawerHeader className="text-left px-6"><DrawerTitle>Sleep</DrawerTitle></DrawerHeader>
          <div className="px-6 pb-[calc(24px+env(safe-area-inset-bottom))] space-y-6">
            <div className="text-center"><div className="text-5xl font-semibold tabular-nums">{hours} h {minutes} m</div><p className="text-sm text-muted-foreground mt-2">Last night</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-muted-foreground text-center mb-2">Hours</div><div className="grid grid-cols-[48px_1fr_48px] gap-1"><button onClick={() => setHours(value => Math.max(0, value - 1))} className="min-h-12 rounded-xl bg-muted">−</button><Input type="number" inputMode="numeric" value={hours} onChange={event => setHours(Math.max(0, Math.min(23, Number(event.target.value))))} className="h-12 text-center text-xl font-semibold"/><button onClick={() => setHours(value => Math.min(23, value + 1))} className="min-h-12 rounded-xl bg-muted">+</button></div></div>
              <div><div className="text-xs text-muted-foreground text-center mb-2">Minutes</div><div className="grid grid-cols-[48px_1fr_48px] gap-1"><button onClick={() => setMinutes(value => value === 0 ? 45 : value - 15)} className="min-h-12 rounded-xl bg-muted">−</button><Input type="number" inputMode="numeric" value={minutes} onChange={event => setMinutes(Math.max(0, Math.min(59, Number(event.target.value))))} className="h-12 text-center text-xl font-semibold"/><button onClick={() => setMinutes(value => value >= 45 ? 0 : value + 15)} className="min-h-12 rounded-xl bg-muted">+</button></div></div>
            </div>
            <button onClick={saveSleep} disabled={isUpserting || hours + minutes === 0} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50">{isUpserting ? 'Saving…' : 'Save sleep'}</button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={sheet === 'food'} onOpenChange={open => !open && setSheet(null)}>
        <DrawerContent className="rounded-t-[28px] max-h-[92dvh] overflow-y-auto">
          <DrawerHeader className="text-left px-5"><DrawerTitle>Food</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
            <CalorieTrackerCompact />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
