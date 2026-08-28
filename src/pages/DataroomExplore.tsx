import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { DataroomDeepDives } from '@/components/dataroom/DataRoomVisuals';
import { EventTimeline, RelationshipCharts } from '@/components/dataroom/DataroomCharts';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function ExploreContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  if (data.isLoading && !data.analysis) return <div className="space-y-3"><div className="h-32 rounded-xl bg-muted animate-pulse"/><div className="h-32 rounded-xl bg-muted animate-pulse"/></div>;
  if (!data.analysis) return <div className="border-y border-border py-6"><p className="text-sm font-semibold">Deeper analysis is not available yet.</p><p className="type-caption mt-1">The main Dataroom remains usable; complete more logs or retry this view later.</p></div>;

  const normalizedEnergy = data.energy.map(day => ({
    date: day.date,
    baseline: day.baseline,
    workout: day.workoutBurned,
    activity: day.manualBurned,
    expenditure: day.expenditure,
    intake: data.meals.some(meal => meal.date === day.date) ? day.intake : undefined,
  }));

  return <div className="space-y-8">
    <section className="border-y border-border py-5"><h2 className="type-section-title">Advanced Charts</h2><p className="type-supporting mt-2 max-w-2xl">These views expose the calculations beneath Dataroom. Population volume bands remain references, nutrition is limited to logged evidence, and correlations are not treated as causation.</p></section>

    <section><div className="mb-3"><h2 className="type-section-title">Relationships</h2><p className="type-caption mt-1">Matched observations only. These charts show association, not cause.</p></div><RelationshipCharts metrics={data.metrics} sets={data.sets} energy={normalizedEnergy} weightPoints={data.analysis.weight.points} /></section>

    <section><div className="mb-3"><h2 className="type-section-title">Event Timeline</h2><p className="type-caption mt-1">A compact reconstruction of what was logged on each day in the selected range.</p></div><EventTimeline meals={data.meals} workouts={data.workouts} metrics={data.metrics} readiness={data.readiness} /></section>

    <DataroomDeepDives
      analysis={data.analysis}
      meals={data.meals}
      energy={normalizedEnergy}
      hydration={data.hydration}
      proteinGoal={data.preferences?.daily_protein_goal || 165}
    />
  </div>;
}

export default function DataroomExplore() {
  return <DataroomPageShell eyebrow="Dataroom" title="Explore" description="Advanced charts and evidence for questions that need more detail than the default briefing."><ExploreContent /></DataroomPageShell>;
}
