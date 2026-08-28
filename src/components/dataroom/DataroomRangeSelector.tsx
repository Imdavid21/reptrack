import { DATAROOM_RANGE_OPTIONS, useDataroomRange } from '@/contexts/DataroomRangeContext';
import './dataroom-charts.css';

export function DataroomRangeSelector() {
  const { range, setRange } = useDataroomRange();
  return (
    <div className="inline-grid max-w-full grid-flow-col auto-cols-[3rem] overflow-x-auto rounded-xl bg-muted p-1" role="group" aria-label="Dataroom range">
      {DATAROOM_RANGE_OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          aria-pressed={range === option}
          onClick={() => setRange(option)}
          className={`min-h-9 w-12 rounded-lg px-0 text-center text-xs font-semibold tabular-nums transition-colors ${range === option ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
