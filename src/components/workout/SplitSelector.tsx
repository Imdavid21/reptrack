import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TrainingSplit } from '@/lib/splitTemplates';
import { haptic } from '@/lib/haptics';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const SPLIT_OPTIONS: { id: TrainingSplit; label: string; days: number; desc: string }[] = [
  { id: 'full_body3', label: 'Full Body', days: 3, desc: 'Hit every muscle 3×/week' },
  { id: 'upper_lower4', label: 'Upper / Lower', days: 4, desc: '2 upper, 2 lower days' },
  { id: 'ppl5', label: 'Hybrid PPL', days: 5, desc: 'Push/Pull/Legs + variety' },
  { id: 'ppl6', label: 'PPL × 2', days: 6, desc: 'Push/Pull/Legs twice weekly' },
];

function getSplitLabel(split: TrainingSplit): string {
  const opt = SPLIT_OPTIONS.find(o => o.id === split);
  return opt ? `${opt.label} · ${opt.days} days` : 'Select split';
}

interface SplitSelectorProps {
  currentSplit: TrainingSplit;
  onChangeSplit: (split: TrainingSplit) => void;
  isUpdating?: boolean;
}

export function SplitSelector({ currentSplit, onChangeSplit, isUpdating }: SplitSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      {/* Collapsed header */}
      <button
        onClick={() => {
          haptic('light');
          setIsOpen(!isOpen);
        }}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors',
          'bg-muted hover:bg-muted/80'
        )}
      >
        <div className="text-left">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Split</p>
          <p className="text-sm font-bold">{getSplitLabel(currentSplit)}</p>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded options */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 pt-1">
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
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border transition-all',
                      isActive
                        ? 'border-foreground bg-foreground/5'
                        : 'border-border hover:bg-muted',
                      isUpdating && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm">{opt.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{opt.days} days/wk</span>
                      </div>
                      {isActive && <Check size={16} />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
