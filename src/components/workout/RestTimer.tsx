import { useState, useEffect, useRef, useCallback } from 'react';
import { Minus, Plus, Timer } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface RestTimerProps {
  isOpen: boolean;
  defaultDuration: number;
  onDismiss: () => void;
  onComplete: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RestTimer({ isOpen, defaultDuration, onDismiss, onComplete }: RestTimerProps) {
  const [remaining, setRemaining] = useState(defaultDuration);
  const [isRunning, setIsRunning] = useState(false);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedNotifiedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;
    const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(left);
    if (left === 0) {
      clearTimer();
      setIsRunning(false);
      if (!elapsedNotifiedRef.current) {
        elapsedNotifiedRef.current = true;
        haptic('success');
      }
    }
  }, [clearTimer]);

  const start = useCallback((seconds: number) => {
    const clamped = Math.max(0, seconds);
    clearTimer();
    elapsedNotifiedRef.current = false;
    setRemaining(clamped);
    if (clamped === 0) {
      setIsRunning(false);
      endTimeRef.current = null;
      return;
    }
    endTimeRef.current = Date.now() + clamped * 1000;
    setIsRunning(true);
    intervalRef.current = setInterval(tick, 250);
  }, [clearTimer, tick]);

  useEffect(() => {
    if (isOpen) start(defaultDuration);
    else {
      clearTimer();
      setIsRunning(false);
      endTimeRef.current = null;
    }
  }, [isOpen, defaultDuration, start, clearTimer]);

  useEffect(() => {
    const visibility = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [tick]);

  useEffect(() => clearTimer, [clearTimer]);

  const adjust = (delta: number) => {
    haptic('light');
    const next = Math.max(0, remaining + delta);
    if (next === 0) {
      clearTimer();
      setRemaining(0);
      setIsRunning(false);
      endTimeRef.current = null;
      return;
    }
    start(next);
  };

  if (!isOpen) return null;
  const complete = remaining === 0;

  return (
    <div className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-[0_8px_30px_hsl(0_0%_0%_/_0.10)] px-3 py-2.5" role="timer" aria-live={complete ? 'polite' : 'off'}>
      <div className="flex items-center gap-2">
        <span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0" aria-hidden><Timer className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><div className="type-eyebrow">Rest</div><div className="text-2xl font-semibold tabular-nums leading-none mt-0.5">{complete ? 'GO' : formatCountdown(remaining)}</div></div>
        {!complete && <button onClick={() => adjust(-15)} aria-label="Reduce rest by 15 seconds" className="h-10 min-w-11 rounded-xl bg-muted flex items-center justify-center"><Minus className="h-4 w-4"/><span className="sr-only">15 seconds</span></button>}
        <button onClick={complete ? onComplete : onDismiss} className={`h-10 px-4 rounded-xl text-xs font-bold ${complete ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`}>{complete ? 'Next set' : 'Skip'}</button>
        {!complete && <button onClick={() => adjust(15)} aria-label="Add 15 seconds of rest" className="h-10 min-w-11 rounded-xl bg-muted flex items-center justify-center"><Plus className="h-4 w-4"/><span className="sr-only">15 seconds</span></button>}
      </div>
      {isRunning && <div className="sr-only">Rest timer running. {remaining} seconds remaining.</div>}
    </div>
  );
}
