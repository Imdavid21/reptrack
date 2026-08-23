import { DATAROOM_RANGE_OPTIONS, useDataroomRange } from '@/contexts/DataroomRangeContext';

export function DataroomRangeSelector() {
  const { range, setRange } = useDataroomRange();
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-muted p-1" role="group" aria-label="Dataroom range">
      {DATAROOM_RANGE_OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          aria-pressed={range === option}
          onClick={() => setRange(option)}
          className={`min-h-9 min-w-11 rounded-lg px-3 text-xs font-semibold tabular-nums transition-colors ${range === option ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
