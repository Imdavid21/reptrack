import { useLogDate } from '@/contexts/LogDateContext';
import { LogDateChip } from '@/components/common/LogDateChip';
import { RotateCcw } from 'lucide-react';

/**
 * The single home-screen date control. Sets the shared log date that every
 * dashboard tracker (water, food, activity, sleep, weight) reads for both
 * display and logging. When back-dated, shows a clear banner + one-tap return.
 */
export function DashboardDateBar() {
  const { logDate, setLogDate, isBackDated } = useLogDate();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {isBackDated ? 'Logging for' : 'Today'}
        </span>
        <LogDateChip date={logDate} onChange={setLogDate} align="end" />
      </div>
      {isBackDated && (
        <button
          onClick={() => setLogDate(new Date())}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-energy-soft text-energy-ink text-[11px] font-semibold py-1.5"
        >
          <RotateCcw className="h-3 w-3" />
          Back-dating — tap to return to today
        </button>
      )}
    </div>
  );
}
