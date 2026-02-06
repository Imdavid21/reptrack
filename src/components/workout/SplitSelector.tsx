import { cn } from '@/lib/utils';
import { SPLIT_TEMPLATES, TrainingSplit } from '@/lib/splitTemplates';
import { haptic } from '@/lib/haptics';

const SPLIT_OPTIONS: { id: TrainingSplit; label: string; days: number }[] = [
  { id: 'full_body3', label: 'Full Body', days: 3 },
  { id: 'upper_lower4', label: 'Upper / Lower', days: 4 },
  { id: 'ppl5', label: 'PPL', days: 5 },
  { id: 'ppl6', label: 'PPL', days: 6 },
];

interface SplitSelectorProps {
  currentSplit: TrainingSplit;
  onChangeSplit: (split: TrainingSplit) => void;
  isUpdating?: boolean;
}

export function SplitSelector({ currentSplit, onChangeSplit, isUpdating }: SplitSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {SPLIT_OPTIONS.map((opt) => {
        const isActive = currentSplit === opt.id;
        return (
          <button
            key={opt.id}
            disabled={isUpdating}
            onClick={() => {
              if (!isActive) {
                haptic('light');
                onChangeSplit(opt.id);
              }
            }}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all',
              isActive
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground',
              isUpdating && 'opacity-50 pointer-events-none'
            )}
          >
            <span className="text-lg font-bold leading-none">{opt.days}</span>
            <span className="text-[10px] font-medium leading-none opacity-80">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
