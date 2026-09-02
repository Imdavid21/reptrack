import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutRating } from '@/lib/workoutRating';

const CONFIDENCE_LABEL: Record<WorkoutRating['confidence'], string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
};

export function SessionRatingCard({ rating }: { rating: WorkoutRating }) {
  const [showDimensions, setShowDimensions] = useState(false);
  const circumference = 2 * Math.PI * 42;
  const progress = Math.max(0, Math.min(100, rating.score)) / 100;

  return (
    <section className="rounded-2xl border border-border p-4 sm:p-5" aria-label="Session rating">
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="relative h-[104px] w-[104px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
            <circle
              cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
              className="stroke-foreground transition-[stroke-dashoffset] duration-700"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-semibold tabular-nums leading-none">{rating.score}</div>
            <div className="type-caption mt-0.5">out of 100</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight">{rating.label}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium">{CONFIDENCE_LABEL[rating.confidence]}</span>
            {rating.provisional && <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium">Provisional</span>}
          </div>
        </div>
      </div>

      {(rating.wins.length > 0 || rating.issues.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {rating.wins.length > 0 && (
            <div>
              <h3 className="type-caption">What worked</h3>
              <ul className="mt-1.5 space-y-1.5">
                {rating.wins.map(win => <li key={win} className="text-sm leading-snug">{win}</li>)}
              </ul>
            </div>
          )}
          {rating.issues.length > 0 && (
            <div>
              <h3 className="type-caption">What to watch</h3>
              <ul className="mt-1.5 space-y-1.5">
                {rating.issues.map(issue => <li key={issue} className="text-sm leading-snug">{issue}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {rating.correction && (
        <div className="mt-4 rounded-xl bg-muted/50 p-3">
          <h3 className="type-caption">Next session correction</h3>
          <p className="mt-1 text-sm font-medium leading-snug">{rating.correction}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowDimensions(value => !value)}
        aria-expanded={showDimensions}
        className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl border border-border px-3 text-sm font-semibold"
      >
        Score breakdown
        <ChevronDown className={cn('h-4 w-4 transition-transform', showDimensions && 'rotate-180')} />
      </button>

      {showDimensions && (
        <ul className="mt-3 space-y-3">
          {rating.dimensions.map(dimension => (
            <li key={dimension.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{dimension.label}</span>
                <span className="text-sm font-semibold tabular-nums">{dimension.score}/{dimension.max}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground" style={{ width: `${(dimension.score / dimension.max) * 100}%` }} />
              </div>
              <p className="type-caption mt-1">{dimension.note}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
