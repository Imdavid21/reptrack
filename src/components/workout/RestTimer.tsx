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
  // Wall-clock end timestamp – survives background throttling
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

  // Start a new countdown anchored to wall-clock
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
    }, 250); // tick faster for snappy UI after resume
  }, [clearTimer, onComplete]);

  // Auto-start when opened
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

  // Recalculate on visibility change (PWA resume from background)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        recalculate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [recalculate]);

  // Cleanup on unmount
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
      <div className={cn(
        'rounded-xl border p-4 transition-all duration-300',
        isComplete ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Rest Timer
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Timer display */}
        <div className="text-center mb-3">
          <div className={cn(
            'text-3xl font-bold tabular-nums transition-colors',
            isComplete ? 'text-primary' : remaining <= 10 && isRunning ? 'text-destructive animate-pulse' : ''
          )}>
            {isComplete ? 'GO!' : formatCountdown(remaining)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-linear',
              isComplete ? 'bg-primary' : 'bg-foreground/40'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Presets + actions */}
        <div className="flex items-center gap-1.5 justify-center flex-wrap">
          {REST_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetSelect(preset)}
              className={cn(
                'h-7 px-2.5 rounded-full text-[11px] font-medium transition-all',
                totalDuration === preset && isRunning
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {presetLabel(preset)}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Reset"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>

        {/* Skip / Done button */}
        <button
          onClick={handleSkip}
          className={cn(
            'w-full h-9 rounded-full text-xs font-bold mt-3 transition-all',
            isComplete
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {isComplete ? 'Continue to Next Set' : 'Skip Rest'}
        </button>
      </div>
    </div>
  );
}
