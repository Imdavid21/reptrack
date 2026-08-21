import { AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { ArachnidRead, ChangesNext, DataroomDeepDives, TrajectoryConsole } from '@/components/dataroom/DataRoomVisuals';
import { TemporalDecisionMatrix } from '@/components/dataroom/TemporalDecisionMatrix';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useDataroomComparisons } from '@/hooks/useDataroomComparisons';

function LoadingState() {
  return <div className="space-y-5" aria-label="Loading Data Room"><div className="h-9 w-44 animate-pulse rounded-xl bg-muted" /><div className="h-72 animate-pulse border-y border-border bg-card" /><div className="h-64 animate-pulse rounded-2xl bg-muted" /><div className="h-48 animate-pulse rounded-2xl bg-muted" /></div>;
}

function TemporalLoadingState() {
  return <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/25" aria-label="Loading temporal comparisons" />;
}

function DataroomContent() {
  const { dateRange } = useDateRange();
  const { analysis, meals, energy, hydration, preferences, isLoading, error } = useDataroomData(dateRange);
  const temporal = useDataroomComparisons(dateRange);

  return (
    <div className="pb-6">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="type-eyebrow">Decision intelligence</p>
          <h1 className="type-page-title">Data Room</h1>
        </div>
        <DateRangeSelector />
      </header>

      {isLoading && <LoadingState />}

      {error && (
        <div role="alert" className="flex items-start gap-3 border-y border-destructive/30 py-5">
          <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <h2 className="type-component-title">Data Room could not load</h2>
            <p className="mt-1 type-supporting">Your stored data is unchanged. Reload to retry the analysis.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && !analysis && (
        <div role="status" className="border-y border-border py-5">
          <h2 className="type-component-title">Analysis is not available yet</h2>
          <p className="mt-1 type-supporting">Reload to retry. Your stored data is unchanged.</p>
        </div>
      )}

      {!isLoading && !error && analysis && (
        <div className="space-y-8">
          <TrajectoryConsole analysis={analysis} proteinGoal={preferences?.daily_protein_goal || 165} />

          {temporal.isLoading && <TemporalLoadingState />}
          {!temporal.isLoading && temporal.analysis && <TemporalDecisionMatrix analysis={temporal.analysis} />}
          {!temporal.isLoading && temporal.error && (
            <div className="border-y border-border py-4" role="status">
              <p className="type-action">Temporal comparison unavailable</p>
              <p className="mt-1 type-supporting">The selected-range analysis is still valid. Temporal comparisons could not be loaded.</p>
            </div>
          )}

          <ArachnidRead findings={analysis.findings} />
          <ChangesNext findings={analysis.findings} />

          <section>
            <div className="mb-2">
              <p className="type-eyebrow">Evidence</p>
              <h2 className="type-section-title">Explore the analysis</h2>
            </div>
            <DataroomDeepDives
              analysis={analysis}
              meals={meals}
              energy={energy.map(day => ({
                date: day.date,
                baseline: day.baseline,
                workout: day.workoutBurned,
                activity: day.manualBurned,
                expenditure: day.expenditure,
                intake: meals.some(meal => meal.date === day.date) ? day.intake : undefined,
              }))}
              hydration={hydration}
              proteinGoal={preferences?.daily_protein_goal || 165}
            />
          </section>
        </div>
      )}
    </div>
  );
}

export default function Dataroom() {
  return (
    <MainLayout>
      <DateRangeProvider storageKey="dataroom-date-range-preset" defaultPreset="30d">
        <DataroomContent />
      </DateRangeProvider>
    </MainLayout>
  );
}
