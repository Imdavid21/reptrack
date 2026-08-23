import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Timer, X, RotateCcw } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { clearRestTimer, onRestTimerChange, readRestTimerState, startRestTimer } from '@/lib/restTimerState';

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
  const [state, setState] = useState(() => readRestTimerState());
  const [remaining, setRemaining] = useState(() => state ? Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000)) : defaultDuration);
  const totalDuration = state?.totalDuration || defaultDuration;

  const start = useCallback((seconds: number) => {
    const next = startRestTimer(seconds);
    setState(next);
    setRemaining(seconds);
  }, []);

  useEffect(() => onRestTimerChange(next => {
    setState(next);
    setRemaining(next ? Math.max(0, Math.ceil((next.endTime - Date.now()) / 1000)) : 0);
  }), []);

  useEffect(() => {
    if (!isOpen) return;
    const existing = readRestTimerState();
    if (existing && existing.endTime > Date.now()) {
      setState(existing);
      setRemaining(Math.ceil((existing.endTime - Date.now()) / 1000));
    } else start(defaultDuration);
  }, [isOpen, defaultDuration, start]);

  useEffect(() => {
    if (!isOpen || !state) return;
    let completed = false;
    const tick = () => {
      const next = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
      setRemaining(next);
      if (next <= 0 && !completed) {
        completed = true;
        clearRestTimer();
        haptic('success');
        onComplete();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    const visibility = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
  }, [isOpen, state, onComplete]);

  const handlePreset = (seconds: number) => { haptic('light'); start(seconds); };
  const handleReset = () => { haptic('light'); start(totalDuration); };
  const handleSkip = () => { haptic('light'); clearRestTimer(); onDismiss(); };

  if (!isOpen) return null;

  const progress = totalDuration > 0 ? ((totalDuration - remaining) / totalDuration) * 100 : 0;
  return (
    <div>
      <div className="rounded-2xl border border-border bg-muted/25 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-muted-foreground"/><span className="type-caption">Rest</span></div>
          <button onClick={handleSkip} aria-label="Skip rest" className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4"/></button>
        </div>
        <div className="mt-1 text-center text-4xl font-semibold tabular-nums">{remaining <= 0 ? 'GO' : formatCountdown(remaining)}</div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}/></div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {REST_PRESETS.map(preset => <button key={preset} onClick={() => handlePreset(preset)} className={cn('min-h-9 rounded-full px-3 text-xs font-medium', totalDuration === preset ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>{presetLabel(preset)}</button>)}
          <button onClick={handleReset} aria-label="Reset rest timer" className="flex min-h-9 min-w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><RotateCcw className="h-3.5 w-3.5"/></button>
        </div>
      </div>
    </div>
  );
}
