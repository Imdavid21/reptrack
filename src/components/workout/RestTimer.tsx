import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Timer, X, RotateCcw } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface RestTimerProps {
  isOpen: boolean;
  defaultDuration: number;
  onDismiss: () => void;
  onComplete: () => void;
}

const REST_PRESETS = [30, 60, 90, 120, 180, 300];

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function presetLabel(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m}m`;
  }
  return `${seconds}s`;
}

export function RestTimer({ isOpen, defaultDuration, onDismiss, onComplete }: RestTimerProps) {
  const [remaining, setRemaining] = useState(defaultDuration);
  const [totalDuration, setTotalDuration] = useState(defaultDuration);
  const [isRunning, setIsRunning] = useState(false);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const recalculate = useCallback(() => {
    if (!endTimeRef.current) return;
    const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0 && !completedRef.current) {
      completedRef.current = true;
      clearTimer();
      setIsRunning(false);
      haptic('success');
      onComplete();
    }
  }, [onComplete, clearTimer]);

  const startCountdown = useCallback((seconds: number) => {
    clearTimer();
    completedRef.current = false;
    endTimeRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !completedRef.current) {
        completedRef.current = true;
        clearTimer();
        setIsRunning(false);
        haptic('success');
        onComplete();
      }
    }, 250);
  }, [clearTimer, onComplete]);

  useEffect(() => {
    if (isOpen) {
      setTotalDuration(defaultDuration);
      startCountdown(defaultDuration);
    } else {
      setIsRunning(false);
      endTimeRef.current = null;
      clearTimer();
    }
  }, [isOpen, defaultDuration, startCountdown, clearTimer]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') recalculate();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [recalculate]);

  useEffect(() => clearTimer, [clearTimer]);

  const handlePresetSelect = useCallback((seconds: number) => {
    haptic('light');
    setTotalDuration(seconds);
    startCountdown(seconds);
  }, [startCountdown]);

  const handleReset = useCallback(() => {
    haptic('light');
    startCountdown(totalDuration);
  }, [totalDuration, startCountdown]);

  const handleSkip = useCallback(() => {
    haptic('light');
    setIsRunning(false);
    endTimeRef.current = null;
    clearTimer();
    onDismiss();
  }, [onDismiss, clearTimer]);

  if (!isOpen) return null;

  const progress = totalDuration > 0 ? ((totalDuration - remaining) / totalDuration) * 100 : 0;
  const isComplete = remaining === 0;

  return (
    <div className="animate-fade-in">
      <section className={cn('surface-standard p-4 transition-colors', isComplete && 'border-energy-border bg-energy-soft')} aria-label="Rest timer">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="type-component-title">Rest timer</span>
          </div>
          <button onClick={handleSkip} aria-label="Skip rest timer" title="Skip rest" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 text-center">
          <div className={cn('metric-hero tabular-nums transition-colors', isComplete ? 'text-energy-ink' : remaining <= 10 && isRunning ? 'text-destructive' : '')} aria-live="polite">
            {isComplete ? 'Go' : formatCountdown(remaining)}
          </div>
          <div className="mt-1 type-meta">{isComplete ? 'Rest complete' : 'Remaining'}</div>
        </div>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={totalDuration} aria-valuenow={Math.max(0, totalDuration - remaining)}>
          <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', isComplete ? 'bg-energy' : 'bg-foreground/50')} style={{ width: `${progress}%` }} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {REST_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetSelect(preset)}
              className={cn('h-9 min-w-11 rounded-full px-3 type-meta tabular-nums transition-colors', totalDuration === preset && isRunning ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}
            >
              {presetLabel(preset)}
            </button>
          ))}
          <button onClick={handleReset} aria-label="Reset rest timer" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Reset">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <button onClick={handleSkip} className={cn('control-standard mt-4 w-full rounded-xl type-action transition-colors', isComplete ? 'bg-energy text-energy-foreground' : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground')}>
          {isComplete ? 'Continue to next set' : 'Skip rest'}
        </button>
      </section>
    </div>
  );
}
