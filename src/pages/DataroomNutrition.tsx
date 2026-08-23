import { useMemo } from 'react';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { DailyBars, EvidenceMatrix, MiniSparkline, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

type NutritionPoint = { date: string; label: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null };

function average(values: Array<number | null>) {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

function NutritionContent() {
  const { days, dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const nutrition = data.analysis?.nutrition;
  const proteinTarget = Number(data.preferences?.daily_protein_goal || 0);
  const dates = useMemo(() => eachDayOfInterval(dateRange).map(day => format(day, 'yyyy-MM-dd')), [dateRange]);
  const loggedDates = useMemo(() => new Set(data.meals.map(day => day.date)), [data.meals]);
  const byDate = useMemo(() => new Map(data.meals.map(day => [day.date, day])), [data.meals]);
  const daily = useMemo<NutritionPoint[]>(() => dates.map(date => { const row = byDate.get(date); return { date, label: format(parseISO(date), 'd MMM'), calories: row ? row.calories : null, protein: row ? row.protein : null, carbs: row ? row.carbs : null, fat: row ? row.fat : null, fiber: row ? row.fiber : null }; }), [dates, byDate]);
  const display = useMemo<NutritionPoint[]>(() => {
    if (days <= 90) return daily;
    const result: NutritionPoint[] = [];
    for (let index = 0; index < daily.length; index += 7) {
      const chunk = daily.slice(index, index + 7);
      const end = chunk.at(-1)!;
      result.push({ date: end.date, label: format(parseISO(end.date), 'd MMM'), calories: average(chunk.map(day => day.calories)), protein: average(chunk.map(day => day.protein)), carbs: average(chunk.map(day => day.carbs)), fat: average(chunk.map(day => day.fat)), fiber: average(chunk.map(day => day.fiber)) });
    }
    return result;
  }, [daily, days]);
  const aggregationLabel = days > 90 ? 'Weekly average of logged days' : 'Recorded by day';
  const macroSeries = [
    { label: 'Protein', values: display.map(day => day.protein), value: nutrition?.averageProtein == null ? '—' : `${nutrition.averageProtein} g` },
    { label: 'Carbs', values: display.map(day => day.carbs), value: data.meals.length ? `${Math.round(data.meals.reduce((sum, day) => sum + day.carbs, 0) / data.meals.length)} g` : '—' },
    { label: 'Fat', values: display.map(day => day.fat), value: data.meals.length ? `${Math.round(data.meals.reduce((sum, day) => sum + day.fat, 0) / data.meals.length)} g` : '—' },
    { label: 'Fibre', values: display.map(day => day.fiber), value: nutrition?.averageFiber == null ? '—' : `${nutrition.averageFiber} g` },
  ];

  return <div className="space-y-9">
    <section className="grid grid-cols-2 gap-4 border-y border-border py-4">
      <div><div className="type-caption">Days containing logs</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.loggedDays ?? 0} / {Math.min(days, nutrition?.windowDays ?? days)}</div><div className="type-caption mt-0.5">completeness unknown</div></div>
      <div><div className="type-caption">Protein</div><div className="mt-1 text-xl font-semibold tabular-nums text-fuel-ink">{nutrition?.averageProtein == null ? 'Need data' : `${nutrition.averageProtein} g`}</div><div className="type-caption mt-0.5">{proteinTarget ? `target ${proteinTarget} g` : 'logged-day average'}</div></div>
      <div><div className="type-caption">Calories</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageCalories == null ? 'Need data' : `${nutrition.averageCalories.toLocaleString()} kcal`}</div><div className="type-caption mt-0.5">logged-day average</div></div>
      <div><div className="type-caption">Fibre</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageFiber == null ? 'Need data' : `${nutrition.averageFiber} g`}</div><div className="type-caption mt-0.5">logged-day average</div></div>
    </section>

    <VisualSection title="Logging coverage" description="Filled periods contain food records. Blank periods are unknown, not zero intake."><EvidenceMatrix dates={dates} rows={[{ label: 'Food', observed: loggedDates }]} /></VisualSection>

    <VisualSection title="Protein consistency" description={`${aggregationLabel}. Missing evidence remains blank.`}><DailyBars data={display} valueKey="protein" label={days > 90 ? 'Avg protein / logged day' : 'Protein'} goal={proteinTarget || null} suffix=" g" tone="nutrition" /></VisualSection>

    <VisualSection title="Logged calories" description={`${aggregationLabel}. RepTrack does not treat an incomplete log as a complete day.`}><DailyBars data={display} valueKey="calories" label={days > 90 ? 'Avg logged calories' : 'Logged calories'} suffix=" kcal" tone="nutrition" /></VisualSection>

    <VisualSection title="Macro patterns" description={`Each nutrient keeps its own scale. ${aggregationLabel}.`}><div className="grid grid-cols-2 gap-x-4 gap-y-5">{macroSeries.map(macro => <div key={macro.label} className="border-t border-border pt-3"><div className="type-meta">{macro.label}</div><div className="mt-1 text-lg font-semibold tabular-nums">{macro.value}</div><div className="mt-2 text-fuel-ink"><MiniSparkline values={macro.values} tone="nutrition" /></div></div>)}</div></VisualSection>

    {nutrition?.modelDisagreesWithWeight && <section className="border-y border-border py-4"><div className="type-eyebrow">Possible mismatch</div><h2 className="type-section-title mt-1">Logged energy and scale direction disagree</h2><p className="type-supporting mt-2">The log may be incomplete, expenditure is estimated, the window may be short, or water and glycogen may be shifting scale weight. RepTrack does not recommend changing calories from this mismatch alone.</p></section>}

    <VisualSection title="Recorded days" description="Exact logged-day totals remain available below the visual summary.">{data.meals.length ? <div className="divide-y divide-border border-y border-border">{[...data.meals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map(day => <div key={day.date} className="grid grid-cols-[76px_1fr] gap-3 py-3"><div><div className="text-sm font-semibold tabular-nums">{format(parseISO(day.date), 'd MMM')}</div></div><div className="grid grid-cols-2 gap-2 text-right"><div><div className="type-caption">Calories</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.calories).toLocaleString()}</div></div><div><div className="type-caption">Protein</div><div className="text-sm font-semibold tabular-nums text-fuel-ink">{Math.round(day.protein)} g</div></div></div></div>)}</div> : <div className="border-y border-border py-8 text-center type-caption">No nutrition records in this range.</div>}</VisualSection>
  </div>;
}

export default function DataroomNutrition() { return <DataroomPageShell eyebrow="Dataroom" title="Nutrition" description="Protein consistency, logged energy, macro patterns, and the limits of incomplete food history."><NutritionContent /></DataroomPageShell>; }
