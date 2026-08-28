import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { NutritionTrendCharts } from '@/components/dataroom/DataroomCharts';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function NutritionContent() {
  const { days, dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const nutrition = data.analysis?.nutrition;
  const proteinTarget = Number(data.preferences?.daily_protein_goal || 0);
  const calorieTarget = Number(data.preferences?.daily_calorie_goal || 0);
  const byDay = [...data.meals].sort((a, b) => b.date.localeCompare(a.date));

  return <div className="space-y-8">
    <section className="grid grid-cols-2 md:grid-cols-4 gap-5 border-y border-border py-5">
      <div><div className="type-caption">Logged days</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.loggedDays ?? 0} / {Math.min(days, nutrition?.windowDays ?? days)}</div><div className="type-caption mt-0.5">may be incomplete</div></div>
      <div><div className="type-caption">Avg calories</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageCalories == null ? 'Not enough data' : `${nutrition.averageCalories.toLocaleString()} kcal`}</div></div>
      <div><div className="type-caption">Avg protein</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageProtein == null ? 'Not enough data' : `${nutrition.averageProtein} g`}</div>{proteinTarget > 0 && <div className="type-caption mt-0.5">target {proteinTarget} g</div>}</div>
      <div><div className="type-caption">Avg fibre</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageFiber == null ? 'Not enough data' : `${nutrition.averageFiber} g`}</div></div>
    </section>

    <section><div className="mb-3"><h2 className="type-section-title">Intake Trends</h2><p className="type-caption mt-1">Logged days only.</p></div><NutritionTrendCharts meals={data.meals} calorieTarget={calorieTarget || null} proteinTarget={proteinTarget || null} /></section>

    <section><div className="mb-3"><h2 className="type-section-title">Daily Logs</h2></div>{byDay.length ? <div className="divide-y divide-border border-y border-border">{byDay.slice(0, 30).map(day => <div key={day.date} className="py-3 grid grid-cols-[96px_1fr] gap-3"><div><div className="text-sm font-semibold tabular-nums">{day.date}</div></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right"><div><div className="type-caption">Calories</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.calories).toLocaleString()}</div></div><div><div className="type-caption">Protein</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.protein)} g</div></div><div><div className="type-caption">Carbs</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.carbs)} g</div></div><div><div className="type-caption">Fat</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.fat)} g</div></div></div></div>)}</div> : <div className="border-y border-border py-6 type-caption">No nutrition records in this range.</div>}</section>

    {nutrition?.modelDisagreesWithWeight && <section className="border-y border-border py-5"><h2 className="type-section-title">Energy Balance Mismatch</h2><p className="type-supporting mt-2">Logged intake and weight trend disagree. Missing logs or water shifts may explain it.</p></section>}
  </div>;
}

export default function DataroomNutrition() {
  return <DataroomPageShell title="Nutrition"><NutritionContent /></DataroomPageShell>;
}
