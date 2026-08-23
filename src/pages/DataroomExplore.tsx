import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { DataroomDeepDives } from '@/components/dataroom/DataRoomVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function ExploreContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  if (data.isLoading && !data.analysis) return <div className="space-y-3"><div className="h-32 rounded-xl bg-muted animate-pulse"/><div className="h-32 rounded-xl bg-muted animate-pulse"/></div>;
  if (!data.analysis) return <div className="border-y border-border py-6"><p className="text-sm font-semibold">Deeper analysis is not available yet.</p><p className="type-caption mt-1">The main Dataroom remains usable; complete more logs or retry this view later.</p></div>;

  return <div className="space-y-6">
    <section className="border-y border-border py-5"><div className="type-eyebrow">Explore</div><h2 className="type-section-title mt-1">Advanced evidence, not another dashboard</h2><p className="type-supporting mt-2 max-w-2xl">These views expose the calculations beneath Dataroom. Population volume bands remain references, nutrition is limited to logged evidence, and correlations are not treated as causation.</p></section>
    <DataroomDeepDives
      analysis={data.analysis}
      meals={data.meals}
      energy={data.energy.map(day => ({
        date: day.date,
        baseline: day.baseline,
        workout: day.workoutBurned,
        activity: day.manualBurned,
        expenditure: day.expenditure,
        intake: data.meals.some(meal => meal.date === day.date) ? day.intake : undefined,
      }))}
      hydration={data.hydration}
      proteinGoal={data.preferences?.daily_protein_goal || 165}
    />
  </div>;
}

export default function DataroomExplore() {
  return <DataroomPageShell eyebrow="Dataroom" title="Explore" description="Advanced charts and evidence for questions that need more detail than the default briefing."><ExploreContent /></DataroomPageShell>;
}
