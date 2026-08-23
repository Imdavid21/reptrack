import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronRight, Dumbbell, Footprints, Moon, Scale, Utensils } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useCalorieHistory } from '@/hooks/useCalorieHistory';
import { useManualBurns, type BurnEntry } from '@/hooks/useCalorieBurn';
import { EditActivityDialog } from '@/components/health/EditActivityDialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { parseDateKey } from '@/lib/dateKey';
import { DataroomRangeProvider, useDataroomRange } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from '@/components/dataroom/DataroomRangeSelector';
import { TimelineTracks, VisualSection } from '@/components/dataroom/MobileDataVisuals';

function sleepLabel(hours: number) {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes ? `${whole}h ${minutes}m` : `${whole}h`;
}

function weightLabel(value: number) {
  return `${Number(value.toFixed(2))} kg`;
}

type MetricEdit = {
  type: 'weight' | 'sleep';
  date: string;
  weight: string;
  hours: number;
  minutes: number;
};

function TimelineContent() {
  const navigate = useNavigate();
  const { days, dateRange } = useDataroomRange();
  const { from, to } = dateRange;
  const { workouts } = useWorkouts();
  const { data: metrics, upsertMetrics, isUpserting } = useDailyMetrics({ from, to });
  const { data: calories = [] } = useCalorieHistory({ from, to });
  const { data: manualBurns = [], updateBurn, deleteBurn } = useManualBurns(days);
  const [editingBurn, setEditingBurn] = useState<BurnEntry | null>(null);
  const [metricEdit, setMetricEdit] = useState<MetricEdit | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');

  const metricsByDate = useMemo(() => new Map((metrics?.dataPoints || []).map(row => [row.date, row])), [metrics?.dataPoints]);
  const caloriesByDate = useMemo(() => new Map(calories.map(row => [row.date, row])), [calories]);
  const burnsByDate = useMemo(() => manualBurns.reduce((map, burn) => {
    if (burn.date < format(from, 'yyyy-MM-dd') || burn.date > format(to, 'yyyy-MM-dd')) return map;
    const current = map.get(burn.date) || [];
    current.push(burn);
    map.set(burn.date, current);
    return map;
  }, new Map<string, BurnEntry[]>()), [manualBurns, from, to]);
  const workoutsByDate = useMemo(() => workouts.reduce((map, workout) => {
    if (workout.date < format(from, 'yyyy-MM-dd') || workout.date > format(to, 'yyyy-MM-dd')) return map;
    const current = map.get(workout.date) || [];
    current.push(workout);
    map.set(workout.date, current);
    return map;
  }, new Map<string, typeof workouts>()), [workouts, from, to]);

  const daysWithData = useMemo(() => {
    const dates = new Set<string>();
    metricsByDate.forEach((metric, date) => {
      if ((metric.bodyweight != null && metric.bodyweight > 0) || (metric.sleep_hours != null && metric.sleep_hours > 0)) dates.add(date);
    });
    caloriesByDate.forEach((entry, date) => { if (entry.intake > 0 || entry.burned > 0) dates.add(date); });
    burnsByDate.forEach((entries, date) => { if (entries.length) dates.add(date); });
    workoutsByDate.forEach((entries, date) => { if (entries.length) dates.add(date); });
    return [...dates].sort((a, b) => b.localeCompare(a));
  }, [metricsByDate, caloriesByDate, burnsByDate, workoutsByDate]);

  const ascendingDates = useMemo(() => [...daysWithData].sort(), [daysWithData]);
  const visualTracks = useMemo(() => [
    { label: 'Weight', values: ascendingDates.map(date => ({ date, value: Number(metricsByDate.get(date)?.bodyweight || 0) || null })) },
    { label: 'Sleep', values: ascendingDates.map(date => ({ date, value: Number(metricsByDate.get(date)?.sleep_hours || 0) || null })) },
    { label: 'Food', values: ascendingDates.map(date => ({ date, value: Number(caloriesByDate.get(date)?.intake || 0) || null })) },
    { label: 'Workout', values: ascendingDates.map(date => ({ date, value: (workoutsByDate.get(date) || []).filter(workout => Boolean(workout.completed_at)).length || null })) },
    { label: 'Activity', values: ascendingDates.map(date => ({ date, value: (burnsByDate.get(date) || []).reduce((sum, burn) => sum + Number(burn.duration_minutes || 0), 0) || null })) },
  ], [ascendingDates, metricsByDate, caloriesByDate, workoutsByDate, burnsByDate]);

  const openDateInList = (date: string) => {
    setViewMode('list');
    window.setTimeout(() => document.getElementById(`timeline-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const startMetricEdit = (type: 'weight' | 'sleep', date: string) => {
    const metric = metricsByDate.get(date);
    const sleep = Number(metric?.sleep_hours || 0);
    setMetricEdit({ type, date, weight: metric?.bodyweight ? String(metric.bodyweight) : '', hours: Math.floor(sleep), minutes: Math.round((sleep % 1) * 60) });
  };

  const saveMetric = async () => {
    if (!metricEdit) return;
    if (metricEdit.type === 'weight') {
      const value = Number(metricEdit.weight);
      if (!Number.isFinite(value) || value <= 0) return;
      await upsertMetrics({ date: metricEdit.date, bodyweight: Math.round(value * 100) / 100 });
    } else {
      const value = metricEdit.hours + metricEdit.minutes / 60;
      if (value <= 0 || value > 24) return;
      await upsertMetrics({ date: metricEdit.date, sleep_hours: Math.round(value * 100) / 100 });
    }
    setMetricEdit(null);
  };

  return <MainLayout wide showBack backTo="/app/dataroom">
    <div className="mx-auto w-full max-w-[900px] pb-10">
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="type-eyebrow">Dataroom</div><h1 className="type-page-title mt-1">Timeline</h1><p className="type-supporting mt-1">What actually happened across training, bodyweight, sleep, food, and recorded activity.</p></div><DataroomRangeSelector /></header>
      <div className="mb-6 inline-flex rounded-xl bg-muted p-1" role="group" aria-label="Timeline view">
        <button onClick={() => setViewMode('visual')} aria-pressed={viewMode === 'visual'} className={`min-h-9 rounded-lg px-4 text-xs font-semibold ${viewMode === 'visual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Visual</button>
        <button onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} className={`min-h-9 rounded-lg px-4 text-xs font-semibold ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>List</button>
      </div>

      {daysWithData.length === 0 ? <section className="rounded-[20px] border border-border bg-card px-5 py-12 text-center"><p className="font-semibold">No records in this range.</p><p className="type-supporting mt-1">Complete a workout or log a daily metric to begin the timeline.</p><button onClick={() => navigate('/app/train')} className="mt-4 min-h-11 text-sm font-semibold underline underline-offset-4">Start workout</button></section> : viewMode === 'visual' ? <div className="space-y-8">
        <VisualSection eyebrow="Aligned history" title="Everything on the same dates" description="Drag horizontally to inspect a day. Release to open that date in the detailed list.">
          <TimelineTracks tracks={visualTracks} onDateOpen={openDateInList} />
        </VisualSection>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-sm font-semibold">How to read this</div><p className="type-caption mt-1">Track heights are normalized within each metric so the view emphasizes timing and pattern. Open List for exact values and editable records.</p></div>
      </div> : <div className="border-y border-border divide-y divide-border">
        {daysWithData.map(date => {
          const metric = metricsByDate.get(date);
          const nutrition = caloriesByDate.get(date);
          const dayBurns = burnsByDate.get(date) || [];
          const dayWorkouts = workoutsByDate.get(date) || [];
          const isToday = date === format(new Date(), 'yyyy-MM-dd');
          return <section id={`timeline-${date}`} key={date} className="py-5 scroll-mt-20">
            <div className="mb-3"><div className="text-sm font-semibold">{isToday ? 'Today' : format(parseDateKey(date), 'EEEE, MMM d')}</div><div className="type-caption mt-0.5">{date}</div></div>
            <div className="divide-y divide-border rounded-[18px] border border-border bg-card overflow-hidden">
              {dayWorkouts.map(workout => {
                const skipped = (workout as typeof workout & { is_skipped?: boolean }).is_skipped;
                return <button key={workout.id} onClick={() => skipped ? undefined : navigate(`/app/dataroom/workout/${workout.id}`)} disabled={skipped} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left enabled:hover:bg-muted/30 disabled:cursor-default"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Dumbbell className="h-4 w-4"/></span><span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{workout.day_name}{skipped ? ' · skipped' : ''}</span><span className="block type-caption mt-0.5">{workout.workout_duration_minutes ? `${Math.round(workout.workout_duration_minutes)} min` : skipped ? 'No training logged' : 'Workout'}</span></span>{!skipped && <ChevronRight className="h-4 w-4 text-muted-foreground"/>}</button>;
              })}
              {metric?.bodyweight != null && metric.bodyweight > 0 && <button onClick={() => startMetricEdit('weight', date)} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Scale className="h-4 w-4"/></span><span className="flex-1"><span className="block text-sm font-semibold">Bodyweight</span><span className="block type-caption mt-0.5">Tap to correct this entry</span></span><span className="text-sm font-semibold tabular-nums">{weightLabel(metric.bodyweight)}</span></button>}
              {metric?.sleep_hours != null && metric.sleep_hours > 0 && <button onClick={() => startMetricEdit('sleep', date)} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Moon className="h-4 w-4"/></span><span className="flex-1"><span className="block text-sm font-semibold">Sleep</span><span className="block type-caption mt-0.5">Logged duration</span></span><span className="text-sm font-semibold tabular-nums">{sleepLabel(metric.sleep_hours)}</span></button>}
              {nutrition && nutrition.intake > 0 && <button onClick={() => navigate('/app/dataroom/nutrition')} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Utensils className="h-4 w-4"/></span><span className="flex-1"><span className="block text-sm font-semibold">Food logged</span><span className="block type-caption mt-0.5">Logged intake only; completeness is unknown</span></span><span className="text-sm font-semibold tabular-nums">{Math.round(nutrition.intake).toLocaleString()} kcal</span></button>}
              {dayBurns.map(burn => <button key={burn.id} onClick={() => setEditingBurn(burn)} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Footprints className="h-4 w-4"/></span><span className="flex-1"><span className="block text-sm font-semibold capitalize">{(burn.activity_type || 'Activity').replace(/_/g, ' ')}</span><span className="block type-caption mt-0.5">{burn.distance_km != null ? `${Number(burn.distance_km).toFixed(1)} km` : `${burn.duration_minutes || 0} min`} · tap to edit</span></span><span className="text-sm font-semibold tabular-nums">~{Math.round(burn.calories)} kcal</span></button>)}
            </div>
          </section>;
        })}
      </div>}

      <EditActivityDialog burn={editingBurn} onClose={() => setEditingBurn(null)} onSave={input => updateBurn.mutateAsync(input)} onDelete={id => deleteBurn.mutateAsync(id)} />
      <Drawer open={!!metricEdit} onOpenChange={open => !open && setMetricEdit(null)}><DrawerContent className="rounded-t-[28px]"><DrawerHeader className="px-5 text-left"><DrawerTitle>{metricEdit?.type === 'weight' ? 'Bodyweight' : 'Sleep'}{metricEdit ? ` · ${format(parseDateKey(metricEdit.date), 'MMM d')}` : ''}</DrawerTitle></DrawerHeader>{metricEdit && <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] space-y-5">{metricEdit.type === 'weight' ? <div><label htmlFor="timeline-weight" className="type-caption">Weight (kg)</label><Input id="timeline-weight" autoFocus type="number" inputMode="decimal" step="0.01" value={metricEdit.weight} onChange={event => setMetricEdit(value => value ? { ...value, weight: event.target.value } : null)} className="mt-1 h-14 text-xl tabular-nums"/></div> : <div className="grid grid-cols-2 gap-3"><div><label htmlFor="timeline-sleep-hours" className="type-caption">Hours</label><Input id="timeline-sleep-hours" autoFocus type="number" inputMode="numeric" min="0" max="23" value={metricEdit.hours} onChange={event => setMetricEdit(value => value ? { ...value, hours: Math.max(0, Math.min(23, Number(event.target.value))) } : null)} className="mt-1 h-14 text-xl tabular-nums"/></div><div><label htmlFor="timeline-sleep-minutes" className="type-caption">Minutes</label><Input id="timeline-sleep-minutes" type="number" inputMode="numeric" min="0" max="59" value={metricEdit.minutes} onChange={event => setMetricEdit(value => value ? { ...value, minutes: Math.max(0, Math.min(59, Number(event.target.value))) } : null)} className="mt-1 h-14 text-xl tabular-nums"/></div></div>}<button onClick={saveMetric} disabled={isUpserting} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50">{isUpserting ? 'Saving…' : 'Save'}</button></div>}</DrawerContent></Drawer>
    </div>
  </MainLayout>;
}

export default function History() {
  return <DataroomRangeProvider><TimelineContent /></DataroomRangeProvider>;
}
