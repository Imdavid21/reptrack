import { Loader2, ImageDown, Upload, Sparkles, Check, AlertCircle } from 'lucide-react';
import { AnalysisStep, STEP_LABELS } from '@/lib/analyzeFoodImage';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<AnalysisStep, React.ReactNode> = {
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
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />

      <div className="flex items-center gap-3">
        {STEP_ORDER.map((step, idx) => {
          const isDone = currentIdx > idx;
          const isActive = currentStep === step;

          return (
            <div key={step} className="flex items-center gap-1.5">
              {idx > 0 && (
                <div className={cn(
                  'w-4 h-px',
                  isDone ? 'bg-foreground' : 'bg-border'
                )} />
              )}
              <div className={cn(
                'flex items-center gap-1 text-xs transition-colors',
                isDone && 'text-foreground',
                isActive && 'text-foreground font-medium',
                !isDone && !isActive && 'text-muted-foreground'
              )}>
                {isDone ? <Check className="h-3 w-3" /> : STEP_ICONS[step]}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {STEP_LABELS[currentStep]}
      </p>
    </div>
  );
}
