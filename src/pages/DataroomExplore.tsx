import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { DataroomDeepDives } from '@/components/dataroom/DataRoomVisuals';
import { EventTimeline, RelationshipCharts } from '@/components/dataroom/DataroomCharts';
import { DataroomInference } from '@/components/dataroom/DataroomInference';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useAdvancedLabData, useAdvancedMode } from '@/hooks/useAdvancedMode';

function ExploreContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const advanced = useAdvancedMode();
  const lab = useAdvancedLabData(advanced.settings.enabled);
  if (data.isLoading && !data.analysis) return <div className="space-y-3"><div className="h-32 rounded-xl bg-muted animate-pulse"/><div className="h-32 rounded-xl bg-muted animate-pulse"/></div>;
  if (!data.analysis) return <div className="border-y border-border py-6 text-sm font-semibold">Not enough data yet.</div>;

  const normalizedEnergy = data.energy.map(day => ({
    date: day.date,
    baseline: day.baseline,
    workout: day.workoutBurned,
    activity: day.manualBurned,
    expenditure: day.expenditure,
    intake: data.meals.some(meal => meal.date === day.date) ? day.intake : undefined,
  }));

  return <div className="space-y-8">
    <DataroomInference
      metrics={data.metrics}
      sets={data.sets}
      meals={data.meals}
      readiness={data.readiness}
      activities={data.activities}
      energy={normalizedEnergy}
      weightPoints={data.analysis.weight.points}
      hydration={data.hydration}
      experiments={lab.experiments}
    />

    <section><div className="mb-3"><h2 className="type-section-title">Relationships</h2><p className="type-caption mt-1">Raw relationship views for manual inspection.</p></div><RelationshipCharts metrics={data.metrics} sets={data.sets} energy={normalizedEnergy} weightPoints={data.analysis.weight.points} /></section>

    <section><div className="mb-3"><h2 className="type-section-title">History map</h2></div><EventTimeline meals={data.meals} workouts={data.workouts} metrics={data.metrics} readiness={data.readiness} /></section>

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
  return <DataroomPageShell title="Explore"><ExploreContent /></DataroomPageShell>;
}
