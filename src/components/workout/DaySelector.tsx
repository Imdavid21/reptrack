import { defaultRoutine } from '@/lib/workoutPresets';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  selectedDay: string;
  onSelect: (day: string) => void;
}

export function DaySelector({ selectedDay, onSelect }: DaySelectorProps) {
  const days = Object.entries(defaultRoutine.days);

  return (
    <div className="space-y-2">
      <h3 className="section-header">SELECT WORKOUT DAY</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {days.map(([dayKey, dayData]) => (
          <button
            key={dayKey}
            onClick={() => onSelect(dayKey)}
            className={cn(
              'btn-brutalist text-left p-4',
              selectedDay === dayKey && 'btn-primary'
            )}
          >
            <div className="text-xs text-muted-foreground mb-1">
              {dayKey.toUpperCase()}
            </div>
            <div className="font-bold">{dayData.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {dayData.focus}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
