import { AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { ArachnidRead, ChangesNext, DataroomDeepDives, TrajectoryConsole } from '@/components/dataroom/DataRoomVisuals';
import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function LoadingState() {
  return (
    <div className="space-y-5" aria-label="Loading Data Room">
      <div className="h-9 w-44 animate-pulse rounded-full bg-muted" />
      <div className="h-72 animate-pulse border-y border-border bg-card" />
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function DataroomContent() {
  const { dateRange } = useDateRange();
  const { analysis, meals, energy, hydration, preferences, isLoading, error } = useDataroomData(dateRange);

  return (
    <MainLayout>
      <div className="pb-6">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="type-eyebrow">Analysis</p>
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
          <div className="space-y-9">
            <TrajectoryConsole analysis={analysis} proteinGoal={preferences?.daily_protein_goal || 165} />
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
    </MainLayout>
  );
}

export default function Dataroom() {
  return (
    <DateRangeProvider storageKey="dataroom-date-range-preset" defaultPreset="14d">
      <DataroomContent />
    </DateRangeProvider>
  );
}
