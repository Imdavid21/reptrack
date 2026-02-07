import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingSplit } from '@/lib/splitTemplates';

const OBJECTIVES = [
  { id: 'muscle', label: 'Build Muscle', desc: 'Hypertrophy-focused training' },
  { id: 'strength', label: 'Get Stronger', desc: 'Heavy compounds, low reps' },
  { id: 'fat_loss', label: 'Lose Fat', desc: 'High intensity, metabolic work' },
  { id: 'athletic', label: 'Athletic Performance', desc: 'Power, speed & conditioning' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: '< 1 year training' },
  { id: 'intermediate', label: 'Intermediate', desc: '1–3 years training' },
  { id: 'advanced', label: 'Advanced', desc: '3+ years training' },
];

interface AIGoalPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (goals: string, split: TrainingSplit, experience: string) => void;
  isGenerating: boolean;
  currentSplit: TrainingSplit;
}

export function AIGoalPrompt({ isOpen, onClose, onGenerate, isGenerating, currentSplit }: AIGoalPromptProps) {
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  const handleGenerate = () => {
    haptic('light');

    const objective = OBJECTIVES.find(o => o.id === selectedObjective);
    const experience = EXPERIENCE_LEVELS.find(o => o.id === selectedExperience);

    const goalParts: string[] = [];
    if (objective) goalParts.push(`Goal: ${objective.label} - ${objective.desc}`);
    if (experience) goalParts.push(`Experience: ${experience.label}`);

    const goals = goalParts.join('. ') || 'General fitness routine';
    const expLevel = selectedExperience || 'intermediate';

    onGenerate(goals, currentSplit, expLevel);
  };

  const allSelected = selectedObjective && selectedExperience;

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

            {/* Scrollable content - onboarding style */}
            <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-3 space-y-6">
              {/* Objective */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Your objective</span>
                <div className="space-y-2">
                  {OBJECTIVES.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        haptic('light');
                        setSelectedObjective(option.id);
                      }}
                      className={cn(
                        'w-full p-3 text-left border rounded-xl transition-colors',
                        selectedObjective === option.id
                          ? 'border-foreground bg-accent'
                          : 'border-border hover:border-muted-foreground'
                      )}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Experience level</span>
                <div className="flex gap-2">
                  {EXPERIENCE_LEVELS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        haptic('light');
                        setSelectedExperience(option.id);
                      }}
                      className={cn(
                        'flex-1 py-3 text-center border rounded-xl transition-colors',
                        selectedExperience === option.id
                          ? 'border-foreground bg-accent'
                          : 'border-border hover:border-muted-foreground'
                      )}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky generate button */}
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
