import { useEffect, useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { Coffee, Trash2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useLogDate } from '@/contexts/LogDateContext';
import { CaffeineSource, useCaffeineLogs } from '@/hooks/useCaffeineLogs';
import { useGoalHistory } from '@/hooks/useGoalHistory';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const SOURCES: Array<{ value: CaffeineSource; label: string }> = [
  { value: 'coffee', label: 'Coffee' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'tea', label: 'Tea' },
  { value: 'energy_drink', label: 'Energy drink' },
  { value: 'pre_workout', label: 'Pre-workout' },
  { value: 'soda', label: 'Soda' },
  { value: 'medication', label: 'Medication' },
  { value: 'other', label: 'Other' },
];

const sourceLabel = (source: CaffeineSource) => SOURCES.find(item => item.value === source)?.label ?? 'Other';

function GoalBar({ value, limit }: { value: number; limit: number }) {
  const progress = limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : 0;
  return <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>;
}

function timeForViewedDate(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours || 0, minutes || 0, 0, 0);
}

export function CaffeineTracker() {
  const { logDate, isBackDated } = useLogDate();
  const { preferences } = useUserPreferences();
  const { setGoal, resolveGoal, isSaving: isSavingGoal } = useGoalHistory();
  const {
    caffeineLogs,
    totalToday,
    addCaffeineLog,
    deleteCaffeineLog,
    isAdding,
    isDeleting,
  } = useCaffeineLogs(logDate);
  const targetDate = format(logDate, 'yyyy-MM-dd');
  const liveLimit = Number(preferences?.daily_caffeine_limit ?? 400);
  const dailyLimit = Number(resolveGoal('daily_caffeine_limit', targetDate, liveLimit));

  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [amount, setAmount] = useState(100);
  const [source, setSource] = useState<CaffeineSource>('coffee');
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('12:00');
  const [limitInput, setLimitInput] = useState(String(liveLimit));

  useEffect(() => { setLimitInput(String(liveLimit)); }, [liveLimit]);

  const entryCountLabel = useMemo(
    () => `${caffeineLogs.length} caffeine ${caffeineLogs.length === 1 ? 'entry' : 'entries'}`,
    [caffeineLogs.length],
  );

  const openCustom = (preset = 100) => {
    setAmount(preset);
    setSource('coffee');
    setLabel('');
    setTime(isToday(logDate) ? format(new Date(), 'HH:mm') : '12:00');
    setDrawerOpen(true);
  };

  const quickLog = async (amountMg: number) => {
    try {
      const loggedAt = isBackDated
        ? new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), 12, 0, 0, 0)
        : new Date();
      await addCaffeineLog({ amountMg, source: 'other', label: 'Quick add', loggedAt });
      haptic('light');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Caffeine was not saved. Try again.');
    }
  };

  const saveEntry = async () => {
    if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) {
      toast.error('Enter a caffeine amount between 1 and 2000 mg.');
      return;
    }
    const loggedAt = timeForViewedDate(logDate, time);
    if (isToday(logDate) && loggedAt.getTime() > Date.now()) {
      toast.error('Caffeine intake time cannot be in the future.');
      return;
    }
    try {
      await addCaffeineLog({ amountMg: amount, source, label, loggedAt });
      haptic('light');
      setDrawerOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Caffeine was not saved. Try again.');
    }
  };

  const saveLimit = async () => {
    const value = Number(limitInput);
    if (!Number.isFinite(value) || value <= 0 || value > 2000) {
      toast.error('Set a daily caffeine limit between 1 and 2000 mg.');
      return;
    }
    try {
      await setGoal('daily_caffeine_limit', Math.round(value), liveLimit);
      toast.success('Caffeine limit updated');
    } catch {
      toast.error('Caffeine limit was not saved.');
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await deleteCaffeineLog(id);
      haptic('light');
    } catch {
      toast.error('Caffeine entry was not deleted.');
    }
  };

  return <>
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="type-supporting flex flex-1 items-center gap-2 text-foreground"><Coffee className="h-4 w-4" />Caffeine</span>
        <span className="type-action mr-1 tabular-nums">{Math.round(totalToday)} mg</span>
        <button aria-label="Add 100 milligrams of caffeine" disabled={isAdding} onClick={() => quickLog(100)} className="control-standard rounded-xl bg-muted px-3 text-xs font-bold disabled:opacity-50">+100</button>
        <button aria-label="Add custom caffeine intake" disabled={isAdding} onClick={() => openCustom(200)} className="control-standard rounded-xl bg-foreground px-3 text-xs font-bold text-background disabled:opacity-50">Add</button>
      </div>
      <GoalBar value={totalToday} limit={dailyLimit} />
      <div className="mt-1 type-meta tabular-nums">{Math.round(totalToday)} / ≤{Math.round(dailyLimit)} mg daily limit</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button onClick={() => setExpanded(open => !open)} className="type-meta hover:text-foreground">{expanded ? 'Hide caffeine entries' : `Show ${entryCountLabel}`}</button>
        <button onClick={() => openCustom()} className="type-meta text-foreground hover:underline">Custom intake</button>
      </div>
      {expanded && <div className="mt-2 space-y-2">
        {caffeineLogs.length ? caffeineLogs.map(log => <div key={log.id} className="flex items-center gap-3 type-supporting">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="font-medium tabular-nums text-foreground">{Math.round(Number(log.amount_mg))} mg</span><span className="type-meta">{sourceLabel(log.source)}</span></div>
            <div className="type-meta tabular-nums">{format(new Date(log.timestamp), 'h:mm a')}{log.label && log.label !== 'Quick add' ? ` · ${log.label}` : ''}</div>
          </div>
          <button aria-label={`Delete ${Math.round(Number(log.amount_mg))} milligram caffeine entry`} disabled={isDeleting} onClick={() => removeEntry(log.id)} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
        </div>) : <p className="type-meta">No caffeine logged yet.</p>}
      </div>}
    </div>

    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerContent className="rounded-t-3xl">
        <DrawerHeader className="px-6 text-left"><DrawerTitle>Log caffeine</DrawerTitle></DrawerHeader>
        <div className="space-y-5 px-6 pb-6">
          <div>
            <div className="type-meta mb-2">Amount</div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2"><Input type="number" inputMode="numeric" min="1" max="2000" value={amount} onChange={event => setAmount(Number(event.target.value))} className="h-12 text-lg font-bold tabular-nums" /><span className="type-supporting">mg</span></div>
            <div className="mt-2 grid grid-cols-4 gap-2">{[50, 100, 150, 200].map(value => <button key={value} onClick={() => setAmount(value)} className={cn('control-standard rounded-xl text-xs font-semibold', amount === value ? 'bg-foreground text-background' : 'bg-muted text-foreground')}>{value}</button>)}</div>
          </div>

          <div>
            <div className="type-meta mb-2">Source</div>
            <div className="grid grid-cols-2 gap-2">{SOURCES.map(option => <button key={option.value} onClick={() => setSource(option.value)} className={cn('control-standard rounded-xl px-3 text-left text-xs font-semibold', source === option.value ? 'bg-foreground text-background' : 'bg-muted text-foreground')}>{option.label}</button>)}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><div className="type-meta mb-2">Time</div><Input type="time" value={time} onChange={event => setTime(event.target.value)} className="h-11" /></div>
            <div><div className="type-meta mb-2">Label, optional</div><Input type="text" maxLength={120} placeholder="Cold brew" value={label} onChange={event => setLabel(event.target.value)} className="h-11" /></div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3"><div><div className="type-action text-foreground">Daily caffeine limit</div><div className="type-meta">Used for Today and Insights comparisons</div></div><div className="flex items-center gap-2"><Input type="number" inputMode="numeric" min="1" max="2000" value={limitInput} onChange={event => setLimitInput(event.target.value)} className="h-9 w-24 text-right tabular-nums" /><span className="type-meta">mg</span></div></div>
            <button disabled={isSavingGoal || Number(limitInput) === liveLimit} onClick={saveLimit} className="mt-2 type-action text-foreground disabled:opacity-40">{isSavingGoal ? 'Saving…' : 'Update limit'}</button>
          </div>

          <button onClick={saveEntry} disabled={isAdding || amount <= 0} className="control-large w-full rounded-xl bg-foreground font-bold text-background disabled:opacity-50">{isAdding ? 'Saving…' : `Log ${Math.round(amount || 0)} mg`}</button>
        </div>
      </DrawerContent>
    </Drawer>
  </>;
}
