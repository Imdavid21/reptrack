import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adjustRestTimer, clearRestTimer, onRestTimerChange, readRestTimerState, type ActiveRestTimerState } from '@/lib/restTimerState';
import { haptic } from '@/lib/haptics';

function remainingSeconds(state: ActiveRestTimerState | null) {
  return state ? Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000)) : 0;
}

function label(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function GlobalRestTimerBar() {
  const location = useLocation();
  const [state, setState] = useState<ActiveRestTimerState | null>(() => readRestTimerState());
  const [remaining, setRemaining] = useState(() => remainingSeconds(state));
  const isTrain = location.pathname.startsWith('/app/train');

  useEffect(() => onRestTimerChange(next => {
    setState(next);
    setRemaining(remainingSeconds(next));
  }), []);

  useEffect(() => {
    if (!state) return;
    const tick = () => {
      const next = remainingSeconds(state);
      setRemaining(next);
      if (next <= 0) {
        haptic('success');
        clearRestTimer();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    const visibility = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', visibility); };
  }, [state]);

  if (!isTrain || !state || remaining <= 0) return null;

  return (
    <div className="fixed left-1/2 z-[55] w-[min(calc(100%-24px),520px)] -translate-x-1/2 rounded-2xl border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur" style={{ bottom: 'calc(70px + env(safe-area-inset-bottom))' }} role="timer" aria-label={`Rest ${label(remaining)} remaining`}>
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
        <div><span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Rest</span><span className="ml-2 text-lg font-semibold tabular-nums">{label(remaining)}</span></div>
        <button aria-label="Subtract 15 seconds" onClick={() => adjustRestTimer(-15)} className="min-h-10 min-w-11 rounded-xl text-sm font-medium hover:bg-muted">−15</button>
        <button onClick={() => clearRestTimer()} className="min-h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Skip</button>
        <button aria-label="Add 15 seconds" onClick={() => adjustRestTimer(15)} className="min-h-10 min-w-11 rounded-xl text-sm font-medium hover:bg-muted">+15</button>
      </div>
    </div>
  );
}
