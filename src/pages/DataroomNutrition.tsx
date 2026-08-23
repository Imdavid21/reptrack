import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function NutritionContent() {
  const { days, dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const nutrition = data.analysis?.nutrition;
  const proteinTarget = Number(data.preferences?.daily_protein_goal || 0);
  const byDay = [...data.meals].sort((a, b) => b.date.localeCompare(a.date));

  return <div className="space-y-8">
    <section className="grid grid-cols-2 md:grid-cols-4 gap-5 border-y border-border py-5">
      <div><div className="type-caption">Days containing logs</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.loggedDays ?? 0} / {Math.min(days, nutrition?.windowDays ?? days)}</div><div className="type-caption mt-0.5">not assumed complete</div></div>
      <div><div className="type-caption">Calories</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageCalories == null ? 'Not enough data' : `${nutrition.averageCalories.toLocaleString()} kcal`}</div><div className="type-caption mt-0.5">average / logged day</div></div>
      <div><div className="type-caption">Protein</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageProtein == null ? 'Not enough data' : `${nutrition.averageProtein} g`}</div><div className="type-caption mt-0.5">{proteinTarget ? `target ${proteinTarget} g` : 'average / logged day'}</div></div>
      <div><div className="type-caption">Fibre</div><div className="mt-1 text-xl font-semibold tabular-nums">{nutrition?.averageFiber == null ? 'Not enough data' : `${nutrition.averageFiber} g`}</div><div className="type-caption mt-0.5">average / logged day</div></div>
    </section>

    <section className="border-y border-border py-5"><div className="type-eyebrow">Interpretation limit</div><h2 className="type-section-title mt-1">Logged food is evidence, not proof of a complete day</h2><p className="type-supporting mt-2 max-w-2xl">RepTrack can calculate what is present in the log. The current database does not reliably mark a day as fully logged, so this view does not claim true average intake or calorie-target adherence across missing days.</p></section>

    <section><div className="mb-3"><div className="type-eyebrow">Recent logged days</div><h2 className="type-section-title mt-1">What is actually recorded</h2></div>{byDay.length ? <div className="divide-y divide-border border-y border-border">{byDay.slice(0, 30).map(day => <div key={day.date} className="py-3 grid grid-cols-[96px_1fr] gap-3"><div><div className="text-sm font-semibold tabular-nums">{day.date}</div></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right"><div><div className="type-caption">Calories</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.calories).toLocaleString()}</div></div><div><div className="type-caption">Protein</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.protein)} g</div></div><div><div className="type-caption">Carbs</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.carbs)} g</div></div><div><div className="type-caption">Fat</div><div className="text-sm font-semibold tabular-nums">{Math.round(day.fat)} g</div></div></div></div>)}</div> : <div className="border-y border-border py-6 type-caption">No nutrition records in this range.</div>}</section>

    {nutrition?.modelDisagreesWithWeight && <section className="border-y border-border py-5"><div className="type-eyebrow">Possible mismatch</div><h2 className="type-section-title mt-1">Logged energy and scale direction disagree</h2><p className="type-supporting mt-2">This can happen because intake is incomplete, expenditure is estimated, the window is short, or water and glycogen shift bodyweight. Dataroom does not recommend changing calories from this mismatch alone.</p></section>}
  </div>;
}

export default function DataroomNutrition() {
  return <DataroomPageShell eyebrow="Dataroom" title="Nutrition" description="Logged-day calories, protein, macros, and the limits of incomplete food history."><NutritionContent /></DataroomPageShell>;
}
