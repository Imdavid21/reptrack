import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingSplit } from '@/lib/splitTemplates';

const GOAL_CATEGORIES = [
  {
    id: 'objective',
    label: 'Objective',
    options: [
      { id: 'muscle', label: 'Build Muscle', desc: 'Hypertrophy-focused training' },
      { id: 'strength', label: 'Get Stronger', desc: 'Heavy compounds, low reps' },
      { id: 'fat_loss', label: 'Lose Fat', desc: 'High intensity, metabolic work' },
      { id: 'athletic', label: 'Athletic Performance', desc: 'Power, speed & conditioning' },
    ],
  },
  {
    id: 'experience',
    label: 'Experience',
    options: [
      { id: 'beginner', label: 'Beginner', desc: '< 1 year training' },
      { id: 'intermediate', label: 'Intermediate', desc: '1–3 years training' },
      { id: 'advanced', label: 'Advanced', desc: '3+ years training' },
    ],
  },
  {
    id: 'availability',
    label: 'Days / Week',
    options: [
      { id: '3', label: '3 days', desc: 'Full Body split', split: 'full_body3' as TrainingSplit },
      { id: '4', label: '4 days', desc: 'Upper / Lower split', split: 'upper_lower4' as TrainingSplit },
      { id: '5', label: '5 days', desc: 'Hybrid PPL split', split: 'ppl5' as TrainingSplit },
      { id: '6', label: '6 days', desc: 'PPL × 2 split', split: 'ppl6' as TrainingSplit },
    ],
  },
];

interface AIGoalPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (goals: string, split: TrainingSplit, experience: string) => void;
  isGenerating: boolean;
}

export function AIGoalPrompt({ isOpen, onClose, onGenerate, isGenerating }: AIGoalPromptProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [customNote] = useState('');

  const handleSelect = (categoryId: string, optionId: string) => {
    haptic('light');
    setSelections(prev => ({ ...prev, [categoryId]: optionId }));
  };

  const handleGenerate = () => {
    haptic('light');

    const objective = GOAL_CATEGORIES[0].options.find(o => o.id === selections.objective);
    const experience = GOAL_CATEGORIES[1].options.find(o => o.id === selections.experience);
    const availability = GOAL_CATEGORIES[2].options.find(o => o.id === selections.availability);

    const goalParts: string[] = [];
    if (objective) goalParts.push(`Goal: ${objective.label} - ${objective.desc}`);
    if (experience) goalParts.push(`Experience: ${experience.label}`);
    if (availability) goalParts.push(`Available ${availability.label} per week`);
    if (customNote.trim()) goalParts.push(`Additional notes: ${customNote.trim()}`);

    const goals = goalParts.join('. ') || 'General fitness routine';
    const split = (availability as any)?.split || 'ppl6';
    const expLevel = selections.experience || 'intermediate';

    onGenerate(goals, split, expLevel);
  };

  const allSelected = selections.objective && selections.experience && selections.availability;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-background rounded-t-2xl max-h-[85vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-bold">AI Routine Builder</h3>
              </div>
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-3 space-y-5">
              {GOAL_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {category.options.map((option) => {
                      const isActive = selections[category.id] === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleSelect(category.id, option.id)}
                          className={cn(
                            'px-3 py-2 rounded-xl text-left transition-all border',
                            isActive
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-card border-border hover:border-foreground/30'
                          )}
                        >
                          <span className="text-xs font-semibold block">{option.label}</span>
                          <span className={cn(
                            'text-[10px] block mt-0.5',
                            isActive ? 'text-background/70' : 'text-muted-foreground'
                          )}>
                            {option.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky generate button - above bottom nav */}
            <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom)+4rem)] pt-3 shrink-0 border-t border-border bg-background">
              <button
                onClick={handleGenerate}
                disabled={!allSelected || isGenerating}
                className={cn(
                  'w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                  allSelected && !isGenerating
                    ? 'bg-foreground text-background hover:opacity-90'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Routine
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
