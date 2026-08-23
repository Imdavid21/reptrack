import { useMemo } from 'react';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { DailyBars, EvidenceMatrix, MiniSparkline, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function NutritionContent() {
  const { days, dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const nutrition = data.analysis?.nutrition;
  const proteinTarget = Number(data.preferences?.daily_protein_goal || 0);
  const dates = useMemo(() => eachDayOfInterval(dateRange).map(day => format(day, 'yyyy-MM-dd')), [dateRange]);
  const loggedDates = useMemo(() => new Set(data.meals.map(day => day.date)), [data.meals]);
  const byDate = useMemo(() => new Map(data.meals.map(day => [day.date, day])), [data.meals]);
  const daily = useMemo(() => dates.map(date => {
    const row = byDate.get(date);
    return {
      date,
      label: format(parseISO(date), 'd MMM'),
      calories: row ? row.calories : null,
      protein: row ? row.protein : null,
      carbs: row ? row.carbs : null,
      fat: row ? row.fat : null,
      fiber: row ? row.fiber : null,
    };
  }), [dates, byDate]);

  const macroSeries = [
    { label: 'Protein', values: daily.map(day => Number(day.protein || 0)), value: nutrition?.averageProtein == null ? '—' : `${nutrition.averageProtein} g` },
    { label: 'Carbs', values: daily.map(day => Number(day.carbs || 0)), value: data.meals.length ? `${Math.round(data.meals.reduce((sum, day) => sum + day.carbs, 0) / data.meals.length)} g` : '—' },
    { label: 'Fat', values: daily.map(day => Number(day.fat || 0)), value: data.meals.length ? `${Math.round(data.meals.reduce((sum, day) => sum + day.fat, 0) / data.meals.length)} g` : '—' },
    { label: 'Fibre', values: daily.map(day => Number(day.fiber || 0)), value: nutrition?.averageFiber == null ? '—' : `${nutrition.averageFiber} g` },
  ];

  return <div className="space-y-9">
    <section className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-4">
      <div><div className="type-caption">Days containing logs</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.loggedDays ?? 0} / {Math.min(days, nutrition?.windowDays ?? days)}</div><div className="type-caption mt-0.5">not assumed complete</div></div>
      <div><div className="type-caption">Protein</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageProtein == null ? 'Need data' : `${nutrition.averageProtein} g`}</div><div className="type-caption mt-0.5">{proteinTarget ? `target ${proteinTarget} g` : 'logged-day average'}</div></div>
      <div><div className="type-caption">Calories</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageCalories == null ? 'Need data' : `${nutrition.averageCalories.toLocaleString()} kcal`}</div><div className="type-caption mt-0.5">logged-day average</div></div>
      <div><div className="type-caption">Fibre</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageFiber == null ? 'Need data' : `${nutrition.averageFiber} g`}</div><div className="type-caption mt-0.5">logged-day average</div></div>
    </section>

    <VisualSection eyebrow="Evidence" title="Nutrition logging coverage" description="A filled cell means food exists in the log. It does not prove the day is complete.">
      <EvidenceMatrix dates={dates} rows={[{ label: 'Food', observed: loggedDates }]} />
    </VisualSection>

    <VisualSection eyebrow="Protein" title="Protein consistency" description="Daily logged protein against the current target. Missing days remain blank rather than becoming zero.">
      <DailyBars data={daily} valueKey="protein" label="Protein" goal={proteinTarget || null} suffix=" g" />
    </VisualSection>

    <VisualSection eyebrow="Energy" title="Logged calories by day" description="These bars show recorded intake only. RepTrack does not claim true daily intake when the log may be incomplete.">
      <DailyBars data={daily} valueKey="calories" label="Logged calories" suffix=" kcal" />
    </VisualSection>

    <VisualSection eyebrow="Macros" title="Small trends, separate scales" description="Each nutrient keeps its own scale so one large macro does not flatten the rest.">
      <div className="grid grid-cols-2 gap-3">{macroSeries.map(macro => <div key={macro.label} className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">{macro.label}</div><div className="mt-1 text-lg font-semibold tabular-nums">{macro.value}</div><div className="mt-2 text-foreground/80"><MiniSparkline values={macro.values} /></div></div>)}</div>
    </VisualSection>

    {nutrition?.modelDisagreesWithWeight && <section className="rounded-2xl border border-border bg-card p-4"><div className="type-eyebrow">Possible mismatch</div><h2 className="type-section-title mt-1">Logged energy and scale direction disagree</h2><p className="type-supporting mt-2">This can happen because intake is incomplete, expenditure is estimated, the window is short, or water and glycogen shift bodyweight. RepTrack does not recommend changing calories from this mismatch alone.</p></section>}

    <VisualSection eyebrow="Recorded days" title="Raw nutrition evidence" description="Use this when you need exact logged-day totals rather than the visual summary.">
      {data.meals.length ? <div className="divide-y divide-border rounded-2xl border border-border bg-card px-3">{[...data.meals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map(day => <div key={day.date} className="py-3 grid grid-cols-[76px_1fr] gap-3"><div><div className="text-sm font-semibold tabular-nums">{format(parseISO(day.date), 'd MMM')}</div></div><div className="grid grid-cols-2 gap-2 text-right"><div><div className="type-caption">Calories</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.calories).toLocaleString()}</div></div><div><div className="type-caption">Protein</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.protein)} g</div></div></div></div>)}</div> : <div className="rounded-2xl border border-border bg-card py-8 text-center type-caption">No nutrition records in this range.</div>}
    </VisualSection>
  </div>;
}

export default function DataroomNutrition() {
  return <DataroomPageShell eyebrow="Dataroom" title="Nutrition" description="Protein consistency, logged calories, macro patterns, and the limits of incomplete food history."><NutritionContent /></DataroomPageShell>;
}
