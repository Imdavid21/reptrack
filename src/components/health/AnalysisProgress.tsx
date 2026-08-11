import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ImageDown, Upload, Sparkles, Check, AlertCircle } from 'lucide-react';
import { AnalysisStep, STEP_LABELS } from '@/lib/analyzeFoodImage';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<AnalysisStep, ReactNode> = {
  compressing: <ImageDown className="h-4 w-4" />,
  uploading: <Upload className="h-4 w-4" />,
  analyzing: <Sparkles className="h-4 w-4" />,
  done: <Check className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

const STEP_ORDER: AnalysisStep[] = ['compressing', 'uploading', 'analyzing'];

interface AnalysisProgressProps {
  currentStep: AnalysisStep;
}

export function AnalysisProgress({ currentStep }: AnalysisProgressProps) {
  const reduceMotion = useReducedMotion();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const currentIdx = STEP_ORDER.indexOf(currentStep);
  const isTerminal = currentStep === 'done' || currentStep === 'error';

  useEffect(() => {
    if (isTerminal) return;
    const startedAt = Date.now() - elapsedSeconds * 1000;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isTerminal]);

  return (
    <div
      className="rounded-2xl border border-border bg-muted/20 p-4"
      role="status"
      aria-live="polite"
      aria-label={STEP_LABELS[currentStep]}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {currentStep === 'done'
              ? 'Analysis complete'
              : currentStep === 'error'
                ? 'Analysis interrupted'
                : 'Analyzing your meal'}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {STEP_LABELS[currentStep]}
          </p>
        </div>
        {!isTerminal && (
          <span className="shrink-0 rounded-full bg-background px-2 py-1 text-[11px] tabular-nums text-muted-foreground">
            {elapsedSeconds}s
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1" aria-hidden="true">
        {STEP_ORDER.map((step, idx) => {
          const isDone = currentStep === 'done' || currentIdx > idx;
          const isActive = currentStep === step;
          const isError = currentStep === 'error' && idx === Math.max(currentIdx, 0);

          return (
            <div
              key={step}
              className={cn(
                'relative flex min-h-9 items-center gap-3 rounded-xl px-2.5',
                isActive && 'bg-background shadow-sm',
                isError && 'bg-destructive/10',
              )}
            >
              <div
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-muted-foreground',
                  isDone && 'border-energy/30 bg-energy-soft text-energy-ink',
                  isActive && 'border-foreground/15 bg-foreground text-background',
                  isError && 'border-destructive/30 bg-destructive/10 text-destructive',
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isActive && !reduceMotion ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
                  >
                    {STEP_ICONS[step]}
                  </motion.span>
                ) : (
                  STEP_ICONS[step]
                )}
              </div>
              <span
                className={cn(
                  'text-xs text-muted-foreground',
                  (isDone || isActive) && 'font-medium text-foreground',
                  isError && 'text-destructive',
                )}
              >
                {STEP_LABELS[step]}
              </span>
              {isActive && (
                <motion.div
                  layoutId="analysis-step"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-energy"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
